/**
 * OpenAIExtractionService - Service d'extraction via OpenAI
 * Responsabilité: Extraire les données de recettes depuis les images
 */
const path = require('path');
const ImageProcessor = require('../ImageProcessor');

class OpenAIExtractionService {
    constructor(openaiClient, config) {
        this.openai = openaiClient;
        this.config = config;
        this.imageProcessor = new ImageProcessor();
    }

    /**
     * Extrait une recette depuis les images et met à jour l'objet Recipe
     */
    async extractRecipe(recipe) {
        if (!recipe.hasImagePaths()) {
            throw new Error('Recipe n\'a pas de chemins d\'images pour l\'extraction');
        }

        const { recto, verso } = recipe.getImagePaths();
        
        console.log(`   🔄 Extraction pour "${recipe.title}"`);
        console.log(`   📸 Images: ${path.basename(recto)} / ${path.basename(verso)}`);

        try {
            // Convertir les images en base64
            console.log('   🔄 Conversion des images en base64...');
            const rectoBase64 = await this.imageProcessor.imageToBase64(recto);
            const versoBase64 = await this.imageProcessor.imageToBase64(verso);

            // Appeler l'API OpenAI
            console.log('   🤖 Envoi à l\'API OpenAI...');
            const response = await this.openai.chat.completions.create({
                model: this.config.model,
                max_tokens: this.config.maxTokens,
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

            // Parser la réponse et mettre à jour la recette
            const extractedData = this.parseResponse(content);
            recipe.applyExtractedData(extractedData);

            console.log(`   ✅ Extraction réussie: "${recipe.title}"`);
            return recipe;

        } catch (error) {
            console.error(`   ❌ Erreur d'extraction: ${error.message}`);
            recipe.markExtractionError(error);
            throw error;
        }
    }

    /**
     * Parse la réponse JSON de l'API OpenAI
     */
    parseResponse(content) {
        try {
            // Nettoyer la réponse pour extraire uniquement le JSON
            let jsonStr = content.trim();
            
            // Supprimer les balises markdown si présentes
            jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```\s*$/, '');
            
            // Parser le JSON
            const data = JSON.parse(jsonStr);
            
            // Validation basique
            if (!data.title) {
                throw new Error('Titre manquant dans la recette extraite');
            }
            
            // Assurer que certains champs sont présents avec des valeurs par défaut
            return {
                title: data.title,
                subtitle: data.subtitle || '',
                duration: data.duration || '',
                difficulty: data.difficulty || null,
                servings: data.servings || null,
                ingredients: data.ingredients || [],
                allergens: data.allergens || [],
                steps: data.steps || [],
                nutrition: data.nutrition || {},
                tips: data.tips || [],
                tags: data.tags || [],
                image: data.image || '',
                source: data.source || 'HelloFresh'
            };
            
        } catch (error) {
            console.error('   ❌ Erreur lors du parsing JSON:', error.message);
            console.error('   📄 Contenu reçu:', content);
            throw new Error(`Impossible de parser la réponse JSON: ${error.message}`);
        }
    }

    /**
     * Génère le prompt système pour l'extraction
     */
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
}

module.exports = OpenAIExtractionService;
