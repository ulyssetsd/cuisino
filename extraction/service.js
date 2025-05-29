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
            // Prepare images
            const images = await this.prepareImages(recipe.rectoPath, recipe.versoPath);
            
            // Create prompt
            const prompt = this.createExtractionPrompt();
            
            // Call OpenAI
            const response = await this.openai.chat.completions.create({
                model: this.model,
                max_tokens: this.maxTokens,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            ...images
                        ]
                    }
                ]
            });

            // Parse response
            const extractedData = this.parseResponse(response.choices[0].message.content);
            
            // Update recipe
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
        return `Analyze these HelloFresh recipe card images (front and back) and extract the recipe information.

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Recipe name",
  "cookingTime": "XX min",
  "servings": "X portions",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount",
      "unit": "unit"
    }
  ],
  "instructions": [
    "Step 1 description",
    "Step 2 description"
  ],
  "nutritionalInfo": {
    "calories": "XXX kcal",
    "protein": "XX g",
    "carbs": "XX g",
    "fat": "XX g"
  }
}

Requirements:
- Extract ALL visible ingredients with their quantities
- Include ALL preparation steps in order
- Use clear, readable French text
- Ensure valid JSON format
- If information is unclear, use your best judgment`;
    }

    // Parse OpenAI response
    parseResponse(content) {
        try {
            // Clean up the response (remove markdown code blocks if present)
            const cleanContent = content
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            
            const parsed = JSON.parse(cleanContent);
            
            // Validate required fields
            if (!parsed.title || !parsed.ingredients || !parsed.instructions) {
                throw new Error('Missing required fields in extraction result');
            }
            
            return parsed;
            
        } catch (error) {
            throw new Error(`Failed to parse extraction result: ${error.message}`);
        }
    }

    // Add delay between requests
    async delay() {
        await new Promise(resolve => 
            setTimeout(resolve, this.config.processing.delayBetweenRequests)
        );
    }
}

module.exports = ExtractionService;
