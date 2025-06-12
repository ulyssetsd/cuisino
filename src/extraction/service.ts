/**
 * Simplified OpenAI Extraction Service
 * Clean, focused recipe extraction from images
 */
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { info, success, error as _error } from '../shared/logger.js';
import type { AppConfig } from '../shared/types.js';
import type Recipe from '../recipes/recipe.js';

class ExtractionService {
    private readonly config: AppConfig;
    private readonly openai: OpenAI;
    private readonly model: string;
    private readonly maxTokens: number;

    constructor(config: AppConfig) {
        this.config = config;
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey,
        });
        this.model = config.openai.model;
        this.maxTokens = config.openai.maxTokens;
    }

    // Extract recipe from image pair
    async extractRecipe(recipe: Recipe): Promise<void> {
        if (!recipe.rectoPath || !recipe.versoPath) {
            throw new Error(
                'Recipe must have both recto and verso image paths'
            );
        }

        try {
            info(`Extracting recipe ${recipe.id}`);

            const images = await this.prepareImages(
                recipe.rectoPath,
                recipe.versoPath
            );

            const completion = await this.openai.chat.completions.create({
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
                                text: this.createExtractionPrompt(),
                            },
                            ...images as any,
                        ],
                    },
                ],
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            const extractedData = this.parseResponse(content);
            recipe.updateFromExtraction(extractedData);

            success(`Recipe ${recipe.id} extracted successfully`);
        } catch (error) {
            _error(
                `Failed to extract recipe ${recipe.id}:`,
                (error as Error).message
            );
            recipe.setError(error as Error);
        }
    }

    // Prepare images for OpenAI
    private async prepareImages(
        rectoPath: string,
        versoPath: string
    ): Promise<Array<{ type: 'image_url'; image_url: { url: string; detail: string } }>> {
        const images = [];

        for (const imagePath of [rectoPath, versoPath]) {
            const imageBuffer = readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');

            images.push({
                type: 'image_url' as const,
                image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high' as const,
                },
            });
        }

        return images;
    }

    // Create system prompt
    private getSystemPrompt(): string {
        return `You are an expert recipe extraction assistant. Your task is to analyze HelloFresh recipe cards and extract structured recipe data.

Extract the following information from the recipe cards:
- Title and subtitle
- Cooking time and difficulty
- Servings
- Complete ingredients list with quantities
- Step-by-step instructions
- Nutritional information (if available)
- Allergens and dietary tags

Always respond in valid JSON format. Be precise and comprehensive.`;
    }

    // Create extraction prompt (now simplified for user message)
    private createExtractionPrompt(): string {
        return `Please extract the recipe information from these HelloFresh recipe cards. The first image shows the front of the card, the second shows the back with instructions.

Return the data in this JSON format:
{
  "title": "Recipe Title",
  "subtitle": "Recipe Subtitle (if any)",
  "cookingTime": "30 min",
  "difficulty": "Easy/Medium/Hard",
  "servings": 2,
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount",
      "unit": "unit"
    }
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "nutritionalInfo": {
    "calories": 500,
    "carbs": "45g",
    "protein": "30g",
    "fat": "15g"
  },
  "allergens": ["allergen1", "allergen2"],
  "tags": ["tag1", "tag2"]
}`;
    }

    // Parse OpenAI response
    private parseResponse(content: string): any {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;

            return JSON.parse(jsonStr);
        } catch (error) {
            _error('Failed to parse OpenAI response:', content);
            throw new Error('Invalid JSON response from OpenAI');
        }
    }

    // Add delay between requests
    async delay(): Promise<void> {
        await new Promise((resolve) =>
            setTimeout(resolve, this.config.processing.delayBetweenRequests)
        );
    }
}

export default ExtractionService;
