/**
 * Simplified OpenAI Extraction Service
 * Clean, focused recipe extraction from images
 */
const OpenAI = require('openai');
const fs = require('fs');
const Logger = require('../shared/logger');

class ExtractionService {
    constructor(config) {
        this.config = config;
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey
        });
        this.model = config.openai.model;
        this.maxTokens = config.openai.maxTokens;
    }
    
    // Extract recipe from image pair
    async extractRecipe(recipe) {
        Logger.progress(recipe.id, '?', `Extracting recipe from images`);

        try {
            const images = await this.prepareImages(recipe.rectoPath, recipe.versoPath);
            const prompt = this.createExtractionPrompt();

            const response = await this.openai.chat.completions.create({
                model: this.model,
                max_tokens: this.maxTokens,
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        ...images
                    ]
                }]
            });

            const extractedData = this.parseResponse(response.choices[0].message.content);
            recipe.updateFromExtraction(extractedData);

            Logger.success(`Extracted recipe: "${recipe.title}"`);

        } catch (error) {
            Logger.error(`Extraction failed for recipe ${recipe.id}: ${error.message}`);
            recipe.setError(error);
            throw error;
        }
    }
    
    // Prepare images for OpenAI
    async prepareImages(rectoPath, versoPath) {
        const images = [];

        for (const imagePath of [rectoPath, versoPath]) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');

            images.push({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: "high"
                }
            });
        }

        return images;
    }
    
    // Create extraction prompt
    createExtractionPrompt() {
        return `
You are analyzing TWO images that show the FRONT and BACK of the SAME HelloFresh recipe card. 

IMPORTANT: These are two sides of ONE recipe card - combine ALL information from BOTH images into a SINGLE JSON response.

- Image 1: Front of recipe card (usually shows the dish photo and title)
- Image 2: Back of recipe card (usually shows ingredients, instructions, and nutritional info)

Extract and combine all recipe information from BOTH images into ONE complete JSON object:

{
  "title": "Recipe name from the front of the card",
  "cookingTime": "XX min",
  "servings": "X",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount",
      "unit": "unit"
    }
  ],
  "instructions": [
    "Step 1",
    "Step 2"
  ],
  "nutritionalInfo": {
    "calories": "XXX kcal",
    "protein": "XX g",
    "carbs": "XX g",
    "fat": "XX g"
  }
}

CRITICAL: Return EXACTLY ONE JSON object that combines information from BOTH images. Do not return separate JSON objects for each image.`;
    }    // Parse OpenAI response
    parseResponse(content) {
        // Clean up the response
        let cleanContent = content
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        const parsed = JSON.parse(cleanContent);

        // Validate required fields
        if (!parsed.title || !parsed.ingredients || !parsed.instructions) {
            throw new Error('Missing required fields in extraction result');
        }

        return parsed;
    }

    // Add delay between requests
    async delay() {
        await new Promise(resolve =>
            setTimeout(resolve, this.config.processing.delayBetweenRequests)
        );
    }
}

module.exports = ExtractionService;
