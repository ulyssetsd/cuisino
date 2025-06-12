/**
 * Simplified OpenAI Extraction Service
 * Clean, focused recipe extraction from images
 */
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { progress, info, success, error as _error } from '../shared/logger';

class ExtractionService {
    constructor(config) {
        this.config = config;
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey,
        });
        this.model = config.openai.model;
        this.maxTokens = config.openai.maxTokens;
    }

    // Extract recipe from image pair
    async extractRecipe(recipe) {
        progress(recipe.id, '?', `Extracting recipe from images`);

        try {
            const images = await this.prepareImages(
                recipe.rectoPath,
                recipe.versoPath
            );
            const response = await this.openai.chat.completions.create({
                model: this.model,
                max_tokens: this.maxTokens,
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt(),
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Voici une fiche de recette HelloFresh en deux parties. La première image est le RECTO (titre, image, ingrédients) et la seconde est le VERSO (instructions, quantités, nutrition). Extrait toutes les informations selon le schéma JSON demandé.',
                            },
                            ...images,
                        ],
                    },
                ],
            });

            const content = response.choices[0].message.content;
            info(`OpenAI response preview: ${content.substring(0, 100)}...`);

            const extractedData = this.parseResponse(content);
            recipe.updateFromExtraction(extractedData);

            success(`Extracted recipe: "${recipe.title}"`);
        } catch (error) {
            _error(
                `Extraction failed for recipe ${recipe.id}: ${error.message}`
            );
            recipe.setError(error);
            throw error;
        }
    }

    // Prepare images for OpenAI
    async prepareImages(rectoPath, versoPath) {
        const images = [];

        for (const imagePath of [rectoPath, versoPath]) {
            const imageBuffer = readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');

            images.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high',
                },
            });
        }

        return images;
    }

    // Create system prompt
    getSystemPrompt() {
        return `Tu es un assistant spécialisé dans l'analyse de recettes de cuisine. Ton rôle est d'extraire des informations culinaires à partir d'images de cartes de recettes HelloFresh pour organiser des données de cuisine.

Les images contiennent des informations légitimes sur la nourriture et la cuisine (ingrédients, instructions de préparation, valeurs nutritionnelles).

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

INSTRUCTIONS:
1. **Ingrédients**: Sépare la quantité en "value" (nombre) et "unit" (unité)
2. **Difficulté**: Échelle 1-5 (1=facile, 5=difficile)
3. **Nutrition**: Extrait toutes les valeurs visibles, sinon ""
4. **Allergènes**: Liste tous les allergènes mentionnés
5. **Étapes**: Une étape par élément du tableau steps
6. **Tags**: Type de plat, cuisine, régime, etc.

IMPORTANT: Réponds UNIQUEMENT avec le JSON valide, aucun autre texte.`;
    }

    // Create extraction prompt (now simplified for user message)
    createExtractionPrompt() {
        return `Voici une fiche de recette HelloFresh en deux parties. La première image est le RECTO (titre, image, ingrédients) et la seconde est le VERSO (instructions, quantités, nutrition). Extrait toutes les informations selon le schéma JSON demandé.`;
    } // Parse OpenAI response
    parseResponse(content) {
        try {
            // Nettoyer la réponse pour extraire uniquement le JSON
            let jsonStr = content.trim();

            // Supprimer les balises markdown si présentes
            jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```\s*$/, '');

            // Parser le JSON
            const recipe = JSON.parse(jsonStr);

            // Validate required fields
            if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
                throw new Error('Missing required fields in extraction result');
            }

            // Assurer que certains champs sont présents avec des valeurs par défaut
            recipe.source = recipe.source || 'HelloFresh';
            recipe.ingredients = recipe.ingredients || [];
            recipe.steps = recipe.steps || [];
            recipe.nutrition = recipe.nutrition || {};
            recipe.allergens = recipe.allergens || [];
            recipe.tips = recipe.tips || [];
            recipe.tags = recipe.tags || [];

            return recipe;
        } catch (error) {
            _error(`Erreur lors du parsing JSON: ${error.message}`);
            _error(`Contenu reçu: ${content}`);
            throw new Error(
                `Impossible de parser la réponse JSON: ${error.message}`
            );
        }
    }

    // Add delay between requests
    async delay() {
        await new Promise((resolve) =>
            setTimeout(resolve, this.config.processing.delayBetweenRequests)
        );
    }
}

export default ExtractionService;
