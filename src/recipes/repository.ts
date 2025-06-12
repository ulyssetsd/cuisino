/**
 * Recipe Repository - Simplified data access
 * Handles loading and saving recipes with minimal complexity
 */
import { join } from 'path';
import { fromImagePaths, fromJson } from './recipe.js';
import {
    listFiles,
    readJson,
    writeJson,
    ensureDir,
} from '../shared/filesystem.js';
import { info, success } from '../shared/logger.js';
import type { AppConfig } from '../shared/types.js';
import type { ProcessingStats } from './types.js';
import type { ImagePair } from '../images/types.js';
import type Recipe from './recipe.js';

class RecipeRepository {
    private readonly config: AppConfig;
    private readonly recipesPath: string;
    private readonly outputPath: string;

    constructor(config: AppConfig) {
        this.config = config;
        this.recipesPath = config.paths.recipes;
        this.outputPath = config.paths.output;
    }

    // Load recipes from image pairs
    async loadFromImages(): Promise<Recipe[]> {
        const compressedDir = join(this.recipesPath, 'compressed');
        const images = await listFiles(compressedDir, '.jpg');

        // Group images into pairs (assuming they come in recto/verso pairs)
        const pairs = this.groupImagePairs(images, compressedDir);

        info(`Found ${pairs.length} image pairs in ${compressedDir}`);

        return pairs.map((pair, index) =>
            fromImagePaths(
                String(index + 1).padStart(3, '0'),
                pair.recto,
                pair.verso
            )
        );
    }

    // Load existing recipes from consolidated JSON file
    async loadExistingRecipes(): Promise<Recipe[]> {
        const recipes: Recipe[] = [];

        // Load from consolidated file only
        const consolidatedPath = join(this.outputPath, 'all_recipes.json');
        const consolidatedData = (await readJson(consolidatedPath)) as {
            recipes?: Array<Record<string, unknown>>;
        } | null;

        if (consolidatedData && consolidatedData.recipes) {
            for (let i = 0; i < consolidatedData.recipes.length; i++) {
                const data = consolidatedData.recipes[i];
                if (data) {
                    // Generate ID from index if not present
                    data.id = data.id || String(i + 1).padStart(3, '0');

                    recipes.push(fromJson(data));
                }
            }
        }

        info(
            `Loaded ${recipes.length} existing recipes from consolidated file`
        );
        return recipes;
    }

    // Save single recipe - updates the consolidated file
    async saveRecipe(recipe: Recipe): Promise<void> {
        // For individual saves, we update the consolidated file
        // This is simpler than maintaining individual files
        const existingRecipes = await this.loadExistingRecipes();

        // Find and update existing recipe or add new one
        const existingIndex = existingRecipes.findIndex(
            (r) => r.id === recipe.id
        );
        if (existingIndex >= 0) {
            existingRecipes[existingIndex] = recipe;
        } else {
            existingRecipes.push(recipe);
        }

        await this.saveAllRecipes(existingRecipes);
    }

    // Save multiple recipes efficiently (batch update)
    async saveRecipes(recipes: Recipe[]): Promise<void> {
        await this.saveAllRecipes(recipes);
    }

    // Save all recipes as consolidated file
    async saveAllRecipes(
        recipes: Recipe[],
        stats: ProcessingStats = {} as ProcessingStats
    ): Promise<string> {
        const data = {
            metadata: {
                ...stats,
                totalRecipes: recipes.length,
                generatedAt: new Date().toISOString(),
            },
            recipes: recipes.map((r) => r.toJson()),
        };

        const filePath = join(this.outputPath, 'all_recipes.json');
        await writeJson(filePath, data);

        success(
            `Saved ${recipes.length} recipes to consolidated file: ${filePath}`
        );
        return filePath;
    }

    // Group images into recto/verso pairs
    groupImagePairs(images: string[], baseDir: string): ImagePair[] {
        const pairs: ImagePair[] = [];
        const sortedImages = images.sort();

        for (let i = 0; i < sortedImages.length; i += 2) {
            if (i + 1 < sortedImages.length) {
                const rectoImage = sortedImages[i];
                const versoImage = sortedImages[i + 1];
                if (rectoImage && versoImage) {
                    pairs.push({
                        recto: join(baseDir, rectoImage),
                        verso: join(baseDir, versoImage),
                    });
                }
            }
        }

        return pairs;
    }

    // Ensure output directory exists
    async ensureDirectories(): Promise<void> {
        await ensureDir(this.outputPath);
    }
}

export default RecipeRepository;
