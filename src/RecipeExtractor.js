const ImageProcessor = require('./infrastructure/external/ImageProcessor');

class RecipeExtractor {
    constructor(openaiClient, openaiConfig) {
        this.openai = openaiClient;
        this.imageProcessor = new ImageProcessor();
        this.model = openaiConfig.model;
        this.maxTokens = openaiConfig.maxTokens;
    }

    async extractRecipe(rectoPath, versoPath) {
        console.log('   🔄 Conversion des images en base64...');

        // Convertir les images en base64
        const rectoBase64 = await this.imageProcessor.imageToBase64(rectoPath);
        const versoBase64 = await this.imageProcessor.imageToBase64(versoPath);
        
        console.log('   🤖 Envoi à l\'API OpenAI...');
        
        const response = await this.openai.chat.completions.create({
            model: this.model,
            max_tokens: this.maxTokens,
            messages: [
                {
                    role: "system",
                    content: this.getSystemPrompt()
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Voici une fiche de recette HelloFresh en deux parties. La première image est le RECTO (titre, image, ingrédients) et la seconde est le VERSO (instructions, quantités, nutrition). Extrait toutes les informations selon le schéma JSON demandé."
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
                throw new Error('Réponse vide de l\'API OpenAI');
            }
              // Extraire le JSON de la réponse
            let recipe = this.parseRecipeFromResponse(content);
            
            // Vérification de la qualité des données (sans correction)
            const validationResult = this.dataQualityValidator.validateRecipe(recipe);
            recipe = validationResult.normalizedRecipe;
            
            // Si des problèmes sont détectés ET que l'auto-correction est activée
            if (validationResult.needsCorrection && this.config?.dataQuality?.autoCorrection) {
                console.log('   🔧 Correction automatique des problèmes détectés...');
                try {
                    recipe = await this.dataQualityCorrector.correctRecipeData(
                        recipe, 
                        validationResult.issues, 
                        rectoPath, 
                        versoPath
                    );
                    console.log('   ✅ Données corrigées avec succès');
                } catch (error) {
                    console.log(`   ⚠️  Échec de la correction: ${error.message}`);
                    console.log('   📝 Conservation des données normalisées');
                    // On garde la recette normalisée même si la correction échoue
                }
            } else if (validationResult.needsCorrection) {
                console.log('   ⚠️  Problèmes détectés mais auto-correction désactivée');
            }
            
            console.log(`   ✅ Recette extraite: "${recipe.title}"`);
            return recipe;
            
        } catch (error) {
            console.error('   ❌ Erreur API OpenAI:', error.message);
            throw error;
        }
    }
    
    getSystemPrompt() {
        return `Tu es un expert en extraction de données de recettes à partir d'images. Tu dois analyser des fiches de recettes HelloFresh et extraire toutes les informations dans un format JSON structuré.

SCHÉMA JSON REQUIS:
{
  "title": "...",
  "subtitle": "...",
  "duration": "...",
  "difficulty": 2,
  "servings": 2,
  "ingredients": [
    { "name": "...", "quantity": { "value": ..., "unit": "..." } }
  ],
  "allergens": ["..."],
  "steps": [
    { "text": "..." }
  ],
  "nutrition": {
    "calories": "...",
    "lipides": "...",
    "acides_gras_satures": "...",
    "glucides": "...",
    "sucres": "...",
    "fibres": "...",
    "proteines": "...",
    "sel": "..."
  },
  "tips": ["..."],
  "tags": ["..."],
  "source": "HelloFresh"
}

INSTRUCTIONS SPÉCIFIQUES:

1. **Ingrédients**: Sépare bien la quantité en "value" (nombre) et "unit" (texte).

3. **Difficulté**: Utilise une échelle de 1 à 5 (1 = très facile, 5 = très difficile).

4. **Nutrition**: Extrait toutes les valeurs nutritionnelles visibles. Si une valeur n'est pas disponible, mets une chaîne vide "".

5. **Allergènes**: Liste tous les allergènes mentionnés.

6. **Tags**: Identifie le type de plat, cuisine, régime alimentaire, etc.

7. **Conseils**: Extrait tous les conseils, astuces ou remarques particulières.

RÉPONSE: Fournis uniquement le JSON valide, sans texte d'explication avant ou après.`;
    }
    
    parseRecipeFromResponse(content) {
        try {
            // Nettoyer la réponse pour extraire uniquement le JSON
            let jsonStr = content.trim();
            
            // Supprimer les balises markdown si présentes
            jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```\s*$/, '');
            
            // Parser le JSON
            const recipe = JSON.parse(jsonStr);
            
            // Validation basique
            if (!recipe.title) {
                throw new Error('Titre manquant dans la recette extraite');
            }
            
            // Assurer que certains champs sont présents avec des valeurs par défaut
            recipe.source = recipe.source || "HelloFresh";
            recipe.ingredients = recipe.ingredients || [];
            recipe.steps = recipe.steps || [];
            recipe.nutrition = recipe.nutrition || {};
            recipe.allergens = recipe.allergens || [];
            recipe.tips = recipe.tips || [];
            recipe.tags = recipe.tags || [];
            
            return recipe;
            
        } catch (error) {
            console.error('   ❌ Erreur lors du parsing JSON:', error.message);
            console.error('   📄 Contenu reçu:', content);
            throw new Error(`Impossible de parser la réponse JSON: ${error.message}`);
        }
    }
}

module.exports = RecipeExtractor;
