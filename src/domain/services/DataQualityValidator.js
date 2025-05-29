
/**
 * Classe responsable uniquement de la VALIDATION des données de qualité
 * La correction est maintenant séparée dans DataQualityCorrector pour éviter les appels API inutiles
 */
class DataQualityValidator {
    constructor(config = null) {
        this.config = config;
        // Unités standards (format court) - pour une base de données cohérente
        this.standardUnits = [
            '', 'g', 'kg', 'ml', 'cl', 'l', 'dl',
            'cs', 'cc', 'pièce', 'gousse', 'sachet', 'boîte',
            'tranche', 'tige', 'botte', 'cube', 'cm'
        ];
        
        // Mapping des variantes vers les unités standard
        this.unitNormalization = {
            // Cuillères - tout vers cs/cc
            'cuillère à soupe': 'cs',
            'cuillères à soupe': 'cs',
            'c. à soupe': 'cs',
            'cuillère': 'cs',
            
            'cuillère à café': 'cc',
            'cuillères à café': 'cc',
            'c. à café': 'cc',
            
            // Pièces - tout vers pièce (singulier)
            'pièces': 'pièce',
            'piece': 'pièce',
            'pieces': 'pièce',
            'pc': 'pièce',
            'pcs': 'pièce',
            'unité': 'pièce',
            'unités': 'pièce',
            
            // Containers - formes courtes
            'sachets': 'sachet',
            'conserve': 'boîte',
            'pot': 'boîte',
            'pots': 'boîte',
            'flacon': 'boîte',
            'barquette': 'boîte',
            'paquet': 'sachet',
            'paquets': 'sachet',
            
            // Végétaux - singulier
            'gousses': 'gousse',
            'tiges': 'tige',
            'bottes': 'botte',
            'tranches': 'tranche',
            'branches': 'tige',
            'branche': 'tige',
            'feuilles': 'tige',
            'feuille': 'tige',
            
            // Anciens formats
            'pièce(s)': 'pièce',
            'sachet(s)': 'sachet',
            
            // Dosage variable - on garde tel quel
            'à doser': 'à doser',
            'à râper': 'à râper',
            'selon votre goût': ''
        };    }

    /**
     * Valide la qualité des données d'une recette extraite
     * @param {Object} recipe - La recette à valider
     * @returns {Object} - Résultat de la validation avec recipe normalisée et issues détectées
     */
    validateRecipe(recipe) {
        // Vérifier si la validation est activée
        if (!this.config?.dataQuality?.enabled || !this.config?.dataQuality?.validateIngredients) {
            return {
                normalizedRecipe: recipe,
                issues: [],
                needsCorrection: false
            };
        }

        console.log('   🔍 Vérification de la qualité des données...');
        
        // Étape 1: Normalisation automatique des unités
        const normalizedRecipe = this.normalizeRecipeUnits(recipe);
        
        // Étape 2: Détection des problèmes restants
        const issues = this.detectDataQualityIssues(normalizedRecipe);
        
        const needsCorrection = issues.length > 0;
        
        if (!needsCorrection) {
            console.log('   ✅ Données de qualité - aucune correction nécessaire');
        } else {
            console.log(`   ⚠️  ${issues.length} problème(s) de qualité détecté(s)`);
        }

        return {
            normalizedRecipe,
            issues,
            needsCorrection
        };
    }

    /**
     * Normalise automatiquement les unités d'une recette
     * @param {Object} recipe - La recette à normaliser
     * @returns {Object} - La recette avec unités normalisées
     */
    normalizeRecipeUnits(recipe) {
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
            return recipe;
        }

        let normalizedCount = 0;
        const normalizedIngredients = recipe.ingredients.map(ingredient => {
            if (!ingredient.quantity || !ingredient.quantity.unit) {
                return ingredient;
            }

            const currentUnit = ingredient.quantity.unit;
            const normalizedUnit = this.normalizeUnit(currentUnit);
            
            if (currentUnit !== normalizedUnit) {
                normalizedCount++;
                console.log(`   📝 Normalisation: "${currentUnit}" → "${normalizedUnit}"`);
                
                return {
                    ...ingredient,
                    quantity: {
                        ...ingredient.quantity,
                        unit: normalizedUnit
                    }
                };
            }
            
            return ingredient;
        });

        if (normalizedCount > 0) {
            console.log(`   ✨ ${normalizedCount} unité(s) normalisée(s)`);
        }

        return {
            ...recipe,
            ingredients: normalizedIngredients
        };
    }

    /**
     * Détecte les problèmes de qualité dans les ingrédients
     * @param {Object} recipe - La recette à analyser
     * @returns {Array} - Liste des problèmes détectés
     */
    detectDataQualityIssues(recipe) {
        const issues = [];
        
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
            return issues;
        }

        recipe.ingredients.forEach((ingredient, index) => {
            const problems = [];
            
            // Vérifier le nom
            if (!ingredient.name || typeof ingredient.name !== 'string' || ingredient.name.trim() === '') {
                problems.push('nom manquant ou vide');
            }
            
            // Vérifier la quantité
            if (!ingredient.quantity || typeof ingredient.quantity !== 'object') {
                problems.push('objet quantity manquant');
            } else {
                const { value, unit } = ingredient.quantity;
                
                // Vérifier la valeur (doit être un nombre ou null)
                if (value !== null && (typeof value !== 'number' || isNaN(value))) {
                    problems.push('valeur quantity.value invalide (doit être un nombre ou null)');
                }
                
                // Vérifier l'unité
                if (unit === undefined || unit === null) {
                    problems.push('quantity.unit manquant');
                } else if (typeof unit !== 'string') {
                    problems.push('quantity.unit doit être une chaîne');
                } else if (!this.isValidUnit(unit)) {
                    problems.push(`quantity.unit "${unit}" non standard`);
                }
                
                // Cas particulier: valeur null mais unité renseignée = données incomplètes
                if (value === null && unit && unit !== '') {
                    problems.push('valeur quantity.value manquante alors que l\'unité est renseignée');
                }
            }
            
            if (problems.length > 0) {
                issues.push({
                    index,
                    ingredient,
                    problems
                });
            }
        });        
        return issues;
    }

    /**
     * Normalise une unité vers son format standard
     * @param {string} unit - L'unité à normaliser
     * @returns {string} - L'unité normalisée
     */
    normalizeUnit(unit) {
        if (!unit || typeof unit !== 'string') {
            return '';
        }
        
        const trimmedUnit = unit.trim();
        
        // Vérifier si l'unité est dans la mapping de normalisation
        if (this.unitNormalization[trimmedUnit]) {
            return this.unitNormalization[trimmedUnit];
        }
        
        // Si déjà dans les unités standard, la retourner telle quelle
        if (this.standardUnits.includes(trimmedUnit)) {
            return trimmedUnit;
        }
        
        // Sinon, retourner l'unité telle quelle (sera marquée comme non standard)
        return trimmedUnit;
    }

    /**
     * Vérifie si une unité est valide (standard ou normalisable)
     */
    isValidUnit(unit) {
        if (!unit || typeof unit !== 'string') {
            return false;
        }
        
        const normalizedUnit = this.normalizeUnit(unit);
        return this.standardUnits.includes(normalizedUnit);
    }
}

module.exports = DataQualityValidator;
