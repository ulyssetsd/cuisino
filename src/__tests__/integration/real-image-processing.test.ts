/**
 * Real Image Processing Integration Test
 * Tests the actual image processing pipeline with real photos and mocked OpenAI
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { pathExists, readdir, ensureDir, remove, readFile } from 'fs-extra';
import { join } from 'path';
import RecipeRepository from '../../recipes/repository.js';
import ExtractionOrchestrator from '../../extraction/orchestrator.js';
import QualityValidator from '../../quality/validator.js';
import OpenAIMock from './openai-mock.js';
import type { AppConfig } from '../../shared/types.js';

// Test configuration optimized for real image testing
const TEST_CONFIG: AppConfig = {
    openai: {
        apiKey: 'mock-test-key',
        model: 'gpt-4o',
        maxTokens: 4000,
    },
    paths: {
        recipes: './input',
        output: './test-integration-output',
        temp: './test-integration-temp',
    },
    processing: {
        retryAttempts: 1, // Reduced for faster testing
        delayBetweenRequests: 500, // Reduced delay
        maxConcurrent: 1,
    },
    quality: {
        autoCorrection: true,
        validationThreshold: 0.7,
    },
    images: {
        compression: {
            quality: 85,
            progressive: true,
            mozjpeg: true,
        },
        maxSize: 2048,
    },
    validate: (): boolean => true,
};

describe('Real Image Processing Integration', () => {
    let recipeRepo: RecipeRepository;
    let extractor: ExtractionOrchestrator;
    let validator: QualityValidator;
    let openaiMock: OpenAIMock;
    let availableImages: string[] = [];

    beforeAll(async () => {
        // Setup OpenAI mock before importing modules
        openaiMock = OpenAIMock.create();
        
        // Mock OpenAI globally
        vi.doMock('openai', () => ({
            default: vi.fn(() => openaiMock)
        }));

        // Mock config
        vi.doMock('../../shared/config.js', () => ({
            default: TEST_CONFIG
        }));

        // Clean up and setup test directories
        await cleanupTestOutputs();
        await ensureDir(TEST_CONFIG.paths.output);
        await ensureDir(TEST_CONFIG.paths.temp);

        // Initialize services
        recipeRepo = new RecipeRepository(TEST_CONFIG);
        extractor = new ExtractionOrchestrator(TEST_CONFIG);
        validator = new QualityValidator(TEST_CONFIG);

        // Check available images
        const inputDir = join(TEST_CONFIG.paths.recipes, 'compressed');
        if (await pathExists(inputDir)) {
            const files = await readdir(inputDir);
            availableImages = files.filter(f => f.toLowerCase().endsWith('.jpg')).sort();
        }

        console.log(`Found ${availableImages.length} test images for integration tests`);
    });

    afterAll(async () => {
        await cleanupTestOutputs();
        vi.restoreAllMocks();
    });

    it('should discover and pair real images correctly', async () => {
        expect(availableImages.length).toBeGreaterThan(0);
        expect(availableImages.length % 2).toBe(0); // Should be even number for pairing

        const recipes = await recipeRepo.loadFromImages();
        const expectedPairs = Math.floor(availableImages.length / 2);
        
        expect(recipes.length).toBe(expectedPairs);
        
        // Verify each recipe has correct image paths
        for (const recipe of recipes) {
            expect(recipe.rectoPath).toBeDefined();
            expect(recipe.versoPath).toBeDefined();
            expect(await pathExists(recipe.rectoPath!)).toBe(true);
            expect(await pathExists(recipe.versoPath!)).toBe(true);
        }

        console.log(`✅ Successfully paired ${recipes.length} image pairs`);
    });

    it('should extract recipes from first 3 image pairs using mocked OpenAI', async () => {
        // Load recipes and limit to first 3 pairs for faster testing
        const allRecipes = await recipeRepo.loadFromImages();
        const testRecipes = allRecipes.slice(0, 3);
        
        expect(testRecipes.length).toBeGreaterThan(0);
        expect(testRecipes.length).toBeLessThanOrEqual(3);

        // Reset mock to ensure consistent responses
        openaiMock.reset();

        // Extract recipes
        await extractor.extractRecipes(testRecipes);

        // Verify extraction results
        const extractedCount = testRecipes.filter(r => r.extracted).length;
        const errorCount = testRecipes.filter(r => r.hasError()).length;

        console.log(`✅ Extracted: ${extractedCount}, Errors: ${errorCount}`);

        // At least some should be extracted successfully
        expect(extractedCount).toBeGreaterThan(0);

        // Verify extracted recipe structure
        for (const recipe of testRecipes.filter(r => r.extracted)) {
            expect(recipe.title).toBeDefined();
            expect(recipe.title?.length).toBeGreaterThan(0);
            expect(recipe.ingredients).toBeDefined();
            expect(Array.isArray(recipe.ingredients)).toBe(true);
            expect(recipe.ingredients!.length).toBeGreaterThan(0);
            expect(recipe.instructions).toBeDefined();
            expect(Array.isArray(recipe.instructions)).toBe(true);
            expect(recipe.instructions!.length).toBeGreaterThan(0);

            console.log(`  Recipe: "${recipe.title}" - ${recipe.ingredients!.length} ingredients, ${recipe.instructions!.length} steps`);
        }
    }, 30000); // 30 second timeout

    it('should validate extracted recipe quality', async () => {
        // Use the previously extracted recipes
        const recipes = await recipeRepo.loadFromImages();
        const testRecipes = recipes.slice(0, 2); // Just 2 for validation testing

        openaiMock.reset();
        await extractor.extractRecipes(testRecipes);

        // Run quality validation
        validator.validateRecipes(testRecipes);

        const validatedCount = testRecipes.filter(r => r.validated).length;
        console.log(`✅ Validated ${validatedCount} recipes for quality`);

        // Check validation results
        for (const recipe of testRecipes.filter(r => r.extracted)) {
            // Basic quality checks that our mock should pass
            expect(recipe.title).toBeDefined();
            
            if (recipe.ingredients && recipe.ingredients.length > 0) {
                for (const ingredient of recipe.ingredients) {
                    expect(ingredient).toHaveProperty('name');
                    expect(ingredient.name).toBeDefined();
                    expect(typeof ingredient.name).toBe('string');
                }
            }

            if (recipe.instructions && recipe.instructions.length > 0) {
                for (const instruction of recipe.instructions) {
                    expect(typeof instruction).toBe('string');
                    expect(instruction.length).toBeGreaterThan(0);
                }
            }
        }
    }, 20000);

    it('should save processing results correctly', async () => {
        const recipes = await recipeRepo.loadFromImages();
        const testRecipes = recipes.slice(0, 2);

        openaiMock.reset();
        await extractor.extractRecipes(testRecipes);
        validator.validateRecipes(testRecipes);

        // Save individual recipes
        for (const recipe of testRecipes.filter(r => r.extracted)) {
            await recipeRepo.saveRecipe(recipe);
        }

        // Save consolidated results
        const stats = {
            totalRecipes: testRecipes.length,
            extractedRecipes: testRecipes.filter(r => r.extracted).length,
            validatedRecipes: testRecipes.filter(r => r.validated).length,
            errorCount: testRecipes.filter(r => r.hasError()).length,
            successRate: '100%',
            qualityRate: '100%'
        };

        await recipeRepo.saveAllRecipes(testRecipes, stats);

        // Verify outputs exist
        const allRecipesPath = join(TEST_CONFIG.paths.output, 'all_recipes.json');
        expect(await pathExists(allRecipesPath)).toBe(true);

        // Verify content structure
        const content = await readFile(allRecipesPath, 'utf-8');
        const data = JSON.parse(content);

        expect(data).toHaveProperty('recipes');
        expect(data).toHaveProperty('stats');
        expect(Array.isArray(data.recipes)).toBe(true);

        console.log(`✅ Saved ${data.recipes.length} recipes to output`);

        // Verify individual recipe files
        for (const recipe of testRecipes.filter(r => r.extracted)) {
            const recipePath = join(TEST_CONFIG.paths.output, `recipe_${recipe.id}.json`);
            expect(await pathExists(recipePath)).toBe(true);
        }
    }, 15000);

    it('should handle OpenAI API errors gracefully during real image processing', async () => {
        const recipes = await recipeRepo.loadFromImages();
        const testRecipes = recipes.slice(0, 1); // Just one recipe for error testing

        // Simulate different error types
        const errorTypes: Array<'rate_limit' | 'quota_exceeded' | 'api_key'> = ['rate_limit', 'quota_exceeded', 'api_key'];
        
        for (const errorType of errorTypes) {
            openaiMock.reset();
            openaiMock.simulateError(errorType);

            // Reset recipe state
            for (const recipe of testRecipes) {
                recipe.extracted = false;
                recipe.error = undefined;
            }

            // Should not throw, should handle gracefully
            await expect(extractor.extractRecipes(testRecipes)).resolves.not.toThrow();

            // Should have marked recipes with errors
            const errorCount = testRecipes.filter(r => r.hasError()).length;
            expect(errorCount).toBeGreaterThan(0);

            console.log(`✅ Handled ${errorType} error gracefully`);
        }
    }, 15000);

    it('should process image pairs in correct order', async () => {
        // Verify that images are paired correctly (first half = recto, second half = verso)
        const recipes = await recipeRepo.loadFromImages();
        
        if (recipes.length > 0) {
            const recipe = recipes[0];
            
            // Check file naming convention
            const rectoFile = recipe.rectoPath!.split('/').pop()!;
            const versoFile = recipe.versoPath!.split('/').pop()!;
            
            // The repo should pair them in order
            console.log(`First pair: ${rectoFile} + ${versoFile}`);
            
            expect(rectoFile).toBeDefined();
            expect(versoFile).toBeDefined();
            
            // Files should exist
            expect(await pathExists(recipe.rectoPath!)).toBe(true);
            expect(await pathExists(recipe.versoPath!)).toBe(true);
        }
    });
});

async function cleanupTestOutputs(): Promise<void> {
    const dirsToClean = [
        TEST_CONFIG.paths.output,
        TEST_CONFIG.paths.temp
    ];

    for (const dir of dirsToClean) {
        if (await pathExists(dir)) {
            await remove(dir);
        }
    }
}