const OpenAI = require('openai');

class DataQualityValidator {
    constructor(openaiClient, config = null) {
        this.openai = openaiClient;
        this.config = config;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o';
        this.maxTokens = parseInt(process.env.MAX_TOKENS) || 2048; // Moins de tokens pour correction        // Unités standards (format court) - pour une base de données cohérente
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
        };
    }    /**
     * Valide la qualité des données d'une recette extraite
     * @param {Object} recipe - La recette à valider
     * @param {string} rectoPath - Chemin vers l'image recto
     * @param {string} versoPath - Chemin vers l'image verso
     * @returns {Object} - La recette corrigée si nécessaire
     */
    async validateAndFixRecipe(recipe, rectoPath, versoPath) {
        // Vérifier si la validation est activée
        if (!this.config?.dataQuality?.enabled || !this.config?.dataQuality?.validateIngredients) {
            return recipe;
        }

        console.log('   🔍 Vérification de la qualité des données...');
        
        // Étape 1: Normalisation automatique des unités
        let normalizedRecipe = this.normalizeRecipeUnits(recipe);
        
        // Étape 2: Détection des problèmes restants
        const issues = this.detectDataQualityIssues(normalizedRecipe);
        
        if (issues.length === 0) {
            console.log('   ✅ Données de qualité - aucune correction nécessaire');
            return normalizedRecipe;
        }

        // Vérifier si l'auto-correction est activée
        if (!this.config?.dataQuality?.autoCorrection) {
            console.log(`   ⚠️  ${issues.length} problème(s) détecté(s) mais auto-correction désactivée`);
            return normalizedRecipe;
        }

        console.log(`   ⚠️  ${issues.length} problème(s) détecté(s) - correction en cours...`);
        
        try {
            const correctedIngredients = await this.fixIngredientsData(
                normalizedRecipe.ingredients, 
                issues, 
                rectoPath, 
                versoPath,
                normalizedRecipe.title
            );
            
            // Mettre à jour seulement les ingrédients corrigés
            const updatedRecipe = {
                ...normalizedRecipe,
                ingredients: correctedIngredients
            };
            
            console.log('   ✅ Données corrigées avec succès');
            return updatedRecipe;
            
        } catch (error) {
            console.log(`   ⚠️  Échec de la correction: ${error.message}`);
            console.log('   📝 Conservation des données originales');
            return normalizedRecipe;
        }
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
    }    /**
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

    /**
     * Corrige les données des ingrédients via l'API OpenAI
     */
    async fixIngredientsData(ingredients, issues, rectoPath, versoPath, recipeTitle) {
        // Préparer la liste des ingrédients problématiques
        const problematicIngredients = issues.map(issue => ({
            index: issue.index,
            name: issue.ingredient.name || 'Non défini',
            currentValue: issue.ingredient.quantity?.value,
            currentUnit: issue.ingredient.quantity?.unit,
            problems: issue.problems
        }));

        // Convertir les images en base64
        const ImageProcessor = require('./ImageProcessor');
        const imageProcessor = new ImageProcessor();
        const rectoBase64 = await imageProcessor.imageToBase64(rectoPath);
        const versoBase64 = await imageProcessor.imageToBase64(versoPath);

        const prompt = this.buildCorrectionPrompt(problematicIngredients, recipeTitle);
        
        const response = await this.openai.chat.completions.create({
            model: this.model,
            max_tokens: this.maxTokens,
            messages: [
                {
                    role: "system",
                    content: this.getCorrectionSystemPrompt()
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: rectoBase64,
                                detail: "high"
                            }
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: versoBase64,
                                detail: "high"
                            }
                        }
                    ]
                }
            ]
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Réponse vide de l\'API OpenAI pour la correction');
        }

        // Parser la réponse de correction
        const corrections = this.parseCorrectionResponse(content);
        
        // Appliquer les corrections aux ingrédients
        return this.applyCorrections(ingredients, corrections);
    }

    /**
     * Construit le prompt pour la correction des ingrédients
     */
    buildCorrectionPrompt(problematicIngredients, recipeTitle) {
        return `Recette: "${recipeTitle}"

Je dois corriger les informations manquantes ou incorrectes pour ces ingrédients spécifiques. 
Analyze attentivement les images pour extraire les quantités exactes et unités manquantes.

INGRÉDIENTS À CORRIGER:
${problematicIngredients.map((ing, i) => 
    `${i + 1}. "${ing.name}" (index ${ing.index})
   - Valeur actuelle: ${ing.currentValue}
   - Unité actuelle: "${ing.currentUnit}"
   - Problèmes: ${ing.problems.join(', ')}`
).join('\n')}

Instructions:
- Trouve les quantités exactes visibles sur les images
- Utilise des unités standard (g, ml, pièce, cs, cc, etc.)
- Si une quantité n'est vraiment pas visible, garde la valeur à null
- Corrige le nom de l'ingrédient si nécessaire
- Ne modifie que les ingrédients listés ci-dessus`;
    }

    /**
     * Prompt système pour la correction
     */    getCorrectionSystemPrompt() {
        return `Tu es un expert en correction de données d'ingrédients de recettes. Tu dois analyser des images de recettes et corriger uniquement les informations manquantes ou incorrectes pour des ingrédients spécifiques.

UNITÉS STANDARD ACCEPTÉES:
- Poids: g, kg
- Volume: ml, cl, l, dl  
- Cuillères courtes: cs, cc
- Cuillères longues: c. à soupe, c. à café, cuillère, cuillère à soupe, cuillère à café, cuillères à soupe, cuillères à café
- Quantités: pièce, pièces, piece, pieces, unité, unités, pc, pcs
- Containers: sachet, sachets, boîte, pot, pots, conserve, barquette, paquet, paquets, flacon
- Végétaux: gousse, gousses, botte, bottes, tige, tiges, branche, branches, feuille, feuilles, tranche, tranches
- Autres: cube, cm, à doser, à râper
- Vide ("") pour les éléments sans unité spécifique

RÉPONSE REQUISE - Format JSON uniquement:
{
  "corrections": [
    {
      "index": 0,
      "name": "Nom correct de l'ingrédient",
      "quantity": {
        "value": 150,
        "unit": "g"
      }
    }
  ]
}

RÈGLES:
1. Ne corriger QUE les ingrédients mentionnés dans la requête
2. Si une quantité n'est pas visible, mettre "value": null
3. Toujours renseigner l'unité si elle est identifiable
4. Utiliser les noms d'ingrédients exacts visibles sur l'image
5. Répondre uniquement avec le JSON, sans explication`;
    }

    /**
     * Parse la réponse de correction
     */
    parseCorrectionResponse(content) {
        try {
            // Nettoyer la réponse pour extraire uniquement le JSON
            let jsonStr = content.trim();
            jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```\s*$/, '');
            
            const response = JSON.parse(jsonStr);
            
            if (!response.corrections || !Array.isArray(response.corrections)) {
                throw new Error('Format de réponse incorrect: corrections manquantes');
            }
            
            return response.corrections;
            
        } catch (error) {
            console.error('   ❌ Erreur lors du parsing de la correction:', error.message);
            console.error('   📄 Contenu reçu:', content);
            throw new Error(`Impossible de parser la réponse de correction: ${error.message}`);
        }
    }

    /**
     * Applique les corrections aux ingrédients
     */
    applyCorrections(originalIngredients, corrections) {
        const correctedIngredients = [...originalIngredients];
        
        corrections.forEach(correction => {
            if (correction.index >= 0 && correction.index < correctedIngredients.length) {
                const originalIngredient = correctedIngredients[correction.index];
                
                // Mettre à jour seulement si les données de correction sont valides
                if (correction.name && correction.name.trim() !== '') {
                    originalIngredient.name = correction.name.trim();
                }
                
                if (correction.quantity && typeof correction.quantity === 'object') {
                    if (!originalIngredient.quantity) {
                        originalIngredient.quantity = {};
                    }
                    
                    // Mettre à jour la valeur
                    if (correction.quantity.hasOwnProperty('value')) {
                        originalIngredient.quantity.value = correction.quantity.value;
                    }
                    
                    // Mettre à jour l'unité
                    if (correction.quantity.hasOwnProperty('unit')) {
                        originalIngredient.quantity.unit = correction.quantity.unit;
                    }
                }
                  console.log(`   ✏️  Corrigé: "${originalIngredient.name}" - ${originalIngredient.quantity.value || 'null'} ${originalIngredient.quantity.unit}`);
            }
        });
        
        return correctedIngredients;
    }
}

module.exports = DataQualityValidator;
