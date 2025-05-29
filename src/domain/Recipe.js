/**
 * Entité Recipe - Domain Model riche
 * Contient toute la logique métier liée aux recettes
 */
class Recipe {
    constructor(data = {}) {
        // Propriétés principales
        this.id = data.id || null;
        this.title = data.title || '';
        this.subtitle = data.subtitle || '';
        this.duration = data.duration || '';
        this.difficulty = data.difficulty || null;
        this.servings = data.servings || null;
        this.ingredients = data.ingredients || [];
        this.allergens = data.allergens || [];
        this.steps = data.steps || [];
        this.nutrition = data.nutrition || {};
        this.tips = data.tips || [];
        this.tags = data.tags || [];
        this.image = data.image || '';
        this.source = data.source || 'HelloFresh';

        // Métadonnées techniques
        this.metadata = data.metadata || null;
        this.extractionError = data.extractionError || null;
        
        // Sources des données
        this._imagePaths = data._imagePaths || null; // { recto: '...', verso: '...' }
        this._isExtracted = data._isExtracted !== undefined ? data._isExtracted : false;
        this._needsQualityCheck = data._needsQualityCheck !== undefined ? data._needsQualityCheck : true;
        this._lastValidated = data._lastValidated || null;
    }

    // ==================== FACTORY METHODS ====================

    /**
     * Crée une Recipe depuis un JSON existant (déjà extraite)
     */
    static fromJson(jsonData) {
        return new Recipe({
            ...jsonData,
            _isExtracted: true,
            _needsQualityCheck: true
        });
    }

    /**
     * Crée une Recipe depuis des chemins d'images (à extraire)
     */
    static fromImages(rectoPath, versoPath, index) {
        return new Recipe({
            id: index,
            title: `Recette ${index} (à extraire)`,
            _imagePaths: { recto: rectoPath, verso: versoPath },
            _isExtracted: false,
            _needsQualityCheck: false
        });
    }

    // ==================== ÉTAT ET VALIDATION ====================

    /**
     * Indique si la recette a été extraite des images
     */
    isExtracted() {
        return this._isExtracted;
    }

    /**
     * Indique si la recette a besoin d'être extraite/réextraite
     */
    needsExtraction() {
        return !this._isExtracted || this.hasExtractionError();
    }

    /**
     * Indique si la recette a une erreur d'extraction
     */
    hasExtractionError() {
        return !!this.extractionError;
    }

    /**
     * Indique si la recette a des chemins d'images
     */
    hasImagePaths() {
        return !!(this._imagePaths?.recto && this._imagePaths?.verso);
    }

    /**
     * Retourne les chemins des images
     */
    getImagePaths() {
        return this._imagePaths;
    }

    /**
     * Valide la structure de base de la recette
     */
    isValid() {
        const requiredFields = ['title', 'source'];
        const missingFields = requiredFields.filter(field => !this[field]);

        if (missingFields.length > 0) {
            return { valid: false, errors: [`Champs requis manquants: ${missingFields.join(', ')}`] };
        }

        const errors = [];
        
        if (this.ingredients && !Array.isArray(this.ingredients)) {
            errors.push('Le champ ingredients doit être un tableau');
        }

        if (this.steps && !Array.isArray(this.steps)) {
            errors.push('Le champ steps doit être un tableau');
        }

        return { valid: errors.length === 0, errors };
    }

    // ==================== EXTRACTION ====================

    /**
     * Applique les données extraites depuis OpenAI
     */
    applyExtractedData(extractedData) {
        // Copier toutes les propriétés extraites
        Object.assign(this, {
            title: extractedData.title || this.title,
            subtitle: extractedData.subtitle || '',
            duration: extractedData.duration || '',
            difficulty: extractedData.difficulty || null,
            servings: extractedData.servings || null,
            ingredients: extractedData.ingredients || [],
            allergens: extractedData.allergens || [],
            steps: extractedData.steps || [],
            nutrition: extractedData.nutrition || {},
            tips: extractedData.tips || [],
            tags: extractedData.tags || [],
            image: extractedData.image || '',
            source: extractedData.source || 'HelloFresh'
        });

        // Marquer comme extraite
        this._isExtracted = true;
        this._needsQualityCheck = true;
        this.extractionError = null;

        // Ajouter les métadonnées d'extraction
        this.addExtractionMetadata();

        return this;
    }

    /**
     * Marque la recette comme ayant une erreur d'extraction
     */
    markExtractionError(error) {
        this.extractionError = {
            message: error.message,
            timestamp: new Date().toISOString(),
            originalFiles: this._imagePaths ? {
                recto: this._imagePaths.recto.split('\\').pop(),
                verso: this._imagePaths.verso.split('\\').pop()
            } : null
        };

        // Créer une recette de fallback
        this.title = this.title.includes('à extraire') ? 
            `Recette non extraite - ${this._imagePaths?.recto?.split('\\').pop() || 'inconnu'}` : 
            this.title;
        this.tags = [...this.tags, "Erreur d'extraction"];

        return this;
    }

    /**
     * Ajoute les métadonnées d'extraction
     */
    addExtractionMetadata() {
        if (this._imagePaths) {
            this.metadata = {
                originalFiles: {
                    recto: this._imagePaths.recto.split('\\').pop(),
                    verso: this._imagePaths.verso.split('\\').pop()
                },
                processedAt: new Date().toISOString(),
                recipeIndex: this.id
            };
        }
    }

    // ==================== QUALITÉ DES DONNÉES ====================

    /**
     * Valide la qualité des ingrédients
     */
    validateDataQuality(validator) {
        const result = validator.validateRecipe(this.toJson());
        this._lastValidated = new Date().toISOString();
        return result;
    }

    /**
     * Applique les corrections de qualité
     */
    async applyQualityCorrection(corrector, issues) {
        if (!this.hasImagePaths()) {
            throw new Error('Impossible de corriger: chemins d\'images manquants');
        }

        const correctedRecipe = await corrector.correctRecipeData(
            this.toJson(),
            issues,
            this._imagePaths.recto,
            this._imagePaths.verso
        );

        // Appliquer les corrections
        this.ingredients = correctedRecipe.ingredients;
        this._lastValidated = new Date().toISOString();

        return this;
    }

    /**
     * Normalise automatiquement les données (sans API)
     */
    normalizeData(validator) {
        const normalizedData = validator.normalizeRecipeUnits(this.toJson());
        this.ingredients = normalizedData.ingredients;
        return this;
    }

    // ==================== PERSISTENCE ====================

    /**
     * Convertit la recette en JSON pour sauvegarde
     */
    toJson() {
        const json = {
            title: this.title,
            subtitle: this.subtitle,
            duration: this.duration,
            difficulty: this.difficulty,
            servings: this.servings,
            ingredients: this.ingredients,
            allergens: this.allergens,
            steps: this.steps,
            nutrition: this.nutrition,
            tips: this.tips,
            tags: this.tags,
            image: this.image,
            source: this.source
        };

        // Ajouter métadonnées si présentes
        if (this.metadata) {
            json.metadata = this.metadata;
        }

        // Ajouter erreur d'extraction si présente
        if (this.extractionError) {
            json.extractionError = this.extractionError;
        }

        return json;
    }

    /**
     * Retourne un résumé pour les logs
     */
    getSummary() {
        return {
            id: this.id,
            title: this.title,
            isExtracted: this._isExtracted,
            needsExtraction: this.needsExtraction(),
            hasError: this.hasExtractionError(),
            ingredientsCount: this.ingredients.length,
            stepsCount: this.steps.length
        };
    }

    /**
     * Clone la recette
     */
    clone() {
        return new Recipe({
            ...this.toJson(),
            id: this.id,
            _imagePaths: this._imagePaths,
            _isExtracted: this._isExtracted,
            _needsQualityCheck: this._needsQualityCheck,
            _lastValidated: this._lastValidated
        });
    }
}

module.exports = Recipe;
