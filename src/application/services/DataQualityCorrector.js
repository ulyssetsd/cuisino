const OpenAI = require('openai');

/**
 * Classe responsable uniquement de la CORRECTION des données de qualité via OpenAI
 * Séparée de DataQualityValidator pour éviter les appels API inutiles
 */
class DataQualityCorrector {
    constructor(openaiClient, config = null) {
        this.openai = openaiClient;
        this.config = config;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o';
        this.maxTokens = parseInt(process.env.MAX_TOKENS) || 2048;
    }

    /**
     * Corrige les problèmes de qualité détectés via l'API OpenAI
     * @param {Object} recipe - La recette avec problèmes
     * @param {Array} qualityIssues - Les problèmes détectés par DataQualityValidator
     * @param {string} rectoPath - Chemin vers l'image recto
     * @param {string} versoPath - Chemin vers l'image verso
     * @returns {Object} - La recette corrigée
     */
    async correctRecipeData(recipe, qualityIssues, rectoPath, versoPath) {
        if (!qualityIssues || qualityIssues.length === 0) {
            return recipe;
        }

        console.log(`   🔧 Correction de ${qualityIssues.length} problème(s) via OpenAI...`);

        try {
            const correctedIngredients = await this.fixIngredientsData(
                recipe.ingredients,
                qualityIssues,
                rectoPath,
                versoPath,
                recipe.title
            );

            return {
                ...recipe,
                ingredients: correctedIngredients
            };

        } catch (error) {
            console.log(`   ⚠️  Échec de la correction: ${error.message}`);
            throw error;
        }
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
        const ImageProcessor = require('../../infrastructure/external/ImageProcessor');
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
     */
    getCorrectionSystemPrompt() {
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

module.exports = DataQualityCorrector;
