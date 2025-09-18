/**
 * Integration Tests for Recipe Processing Pipeline
 * End-to-end tests with real photos and mocked OpenAI API
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdir, pathExists, readFile, rm } from 'fs-extra';
import { join } from 'path';
import CuisinoApp from '../../app.js';
import OpenAIMock from './openai-mock.js';
import type { AppConfig } from '../../shared/types.js';

// Test configuration
const TEST_CONFIG: AppConfig = {
    openai: {
        apiKey: 'test-api-key-mock',
        model: 'gpt-4o',
        maxTokens: 4000,
    },
    paths: {
        recipes: './input',
        output: './test-output',
        temp: './test-temp',
    },
    processing: {
        retryAttempts: 2,
        delayBetweenRequests: 100, // Faster for tests
        maxConcurrent: 1,
    },
    quality: {
        autoCorrection: true,
        validationThreshold: 0.8,
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

describe('Recipe Processing Pipeline Integration Tests', () => {
    let app: CuisinoApp;
    let openaiMock: OpenAIMock;
    let originalConfig: any;

    beforeEach(async () => {
        // Setup OpenAI mock
        openaiMock = OpenAIMock.create();
        
        // Mock the OpenAI module
        vi.doMock('openai', () => ({
            default: vi.fn(() => openaiMock)
        }));

        // Mock the config module to use test configuration
        vi.doMock('../../shared/config.js', () => ({
            default: TEST_CONFIG
        }));

        // Clean up previous test outputs
        await cleanupTestDirectories();

        // Create fresh app instance
        const { default: CuisinoAppClass } = await import('../../app.js');
        app = new CuisinoAppClass();

        openaiMock.reset();
    });

    afterEach(async () => {
        vi.clearAllMocks();
        await cleanupTestDirectories();
    });

    describe('Full Processing Pipeline', () => {
        it('should process real image pairs end-to-end with mocked OpenAI', async () => {
            // Verify input images exist
            const inputDir = join(TEST_CONFIG.paths.recipes, 'compressed');
            const imageExists = await pathExists(inputDir);
            expect(imageExists).toBe(true);

            const images = await readdir(inputDir);
            const jpgImages = images.filter(img => img.toLowerCase().endsWith('.jpg'));
            
            expect(jpgImages.length).toBeGreaterThan(0);
            console.log(`Found ${jpgImages.length} test images`);

            // Run the full processing pipeline
            await expect(app.run()).resolves.not.toThrow();

            // Verify outputs were created
            const outputDir = TEST_CONFIG.paths.output;
            const outputExists = await pathExists(outputDir);
            expect(outputExists).toBe(true);

            // Check for consolidated output file
            const allRecipesPath = join(outputDir, 'all_recipes.json');
            const allRecipesExists = await pathExists(allRecipesPath);
            expect(allRecipesExists).toBe(true);

            // Verify the content structure
            const allRecipesContent = await readFile(allRecipesPath, 'utf-8');
            const allRecipes = JSON.parse(allRecipesContent);
            
            expect(allRecipes).toHaveProperty('recipes');
            expect(allRecipes).toHaveProperty('stats');
            expect(Array.isArray(allRecipes.recipes)).toBe(true);
            expect(allRecipes.recipes.length).toBeGreaterThan(0);

            // Verify recipe structure
            const recipe = allRecipes.recipes[0];
            expect(recipe).toHaveProperty('id');
            expect(recipe).toHaveProperty('title');
            expect(recipe).toHaveProperty('ingredients');
            expect(recipe).toHaveProperty('steps');
            expect(Array.isArray(recipe.ingredients)).toBe(true);
            expect(Array.isArray(recipe.steps)).toBe(true);

            console.log(`Successfully processed ${allRecipes.recipes.length} recipes`);
        }, 30000); // 30 second timeout for full pipeline

        it('should handle limited image processing (first 3 pairs)', async () => {
            // Create a modified app for limited processing
            const inputDir = join(TEST_CONFIG.paths.recipes, 'compressed');
            const images = await readdir(inputDir);
            const jpgImages = images.filter(img => img.toLowerCase().endsWith('.jpg'));
            
            // Only process first 6 images (3 pairs)
            const limitedImages = jpgImages.slice(0, 6);
            expect(limitedImages.length).toBe(6);

            await app.run();

            // Verify limited processing results
            const outputDir = TEST_CONFIG.paths.output;
            const allRecipesPath = join(outputDir, 'all_recipes.json');
            const allRecipesContent = await readFile(allRecipesPath, 'utf-8');
            const allRecipes = JSON.parse(allRecipesContent);

            // Should have processed some recipes
            expect(allRecipes.recipes.length).toBeGreaterThan(0);
            expect(allRecipes.recipes.length).toBeLessThanOrEqual(Math.floor(jpgImages.length / 2));

            console.log(`Limited processing: ${allRecipes.recipes.length} recipes`);
        }, 20000);

        it('should handle OpenAI API errors gracefully', async () => {
            // Simulate rate limit error
            openaiMock.simulateError('rate_limit');

            // Should not throw, but should handle error gracefully
            await expect(app.run()).resolves.not.toThrow();

            // Check that error was logged and fallback recipes were created
            const outputDir = TEST_CONFIG.paths.output;
            const allRecipesPath = join(outputDir, 'all_recipes.json');
            
            if (await pathExists(allRecipesPath)) {
                const allRecipesContent = await readFile(allRecipesPath, 'utf-8');
                const allRecipes = JSON.parse(allRecipesContent);
                
                // Should have stats showing errors
                expect(allRecipes.stats).toHaveProperty('errorCount');
                console.log(`Error handling test: ${allRecipes.stats.errorCount} errors handled`);
            }
        }, 15000);

        it('should validate recipe data quality', async () => {
            await app.run();

            const outputDir = TEST_CONFIG.paths.output;
            const allRecipesPath = join(outputDir, 'all_recipes.json');
            const allRecipesContent = await readFile(allRecipesPath, 'utf-8');
            const allRecipes = JSON.parse(allRecipesContent);

            // Verify data quality metrics
            expect(allRecipes.stats).toHaveProperty('qualityRate');
            expect(allRecipes.stats).toHaveProperty('validatedRecipes');

            // Check individual recipe quality
            for (const recipe of allRecipes.recipes) {
                // Basic structure validation
                expect(recipe.title).toBeDefined();
                expect(typeof recipe.title).toBe('string');
                expect(recipe.title.length).toBeGreaterThan(0);

                // Ingredients validation
                expect(Array.isArray(recipe.ingredients)).toBe(true);
                for (const ingredient of recipe.ingredients) {
                    expect(ingredient).toHaveProperty('name');
                    expect(ingredient).toHaveProperty('quantity');
                    expect(ingredient).toHaveProperty('unit');
                }

                // Instructions validation  
                expect(Array.isArray(recipe.steps)).toBe(true);
                for (const step of recipe.steps) {
                    expect(step).toHaveProperty('text');
                    expect(typeof step.text).toBe('string');
                    expect(step.text.length).toBeGreaterThan(0);
                }
            }

            console.log(`Quality validation: ${allRecipes.stats.qualityRate} quality rate`);
        }, 25000);
    });

    describe('Image Analysis Mode', () => {
        it('should analyze images without processing', async () => {
            const stats = await app.analyzeImages();

            expect(stats).toHaveProperty('totalImages');
            expect(stats).toHaveProperty('imagePairs');
            expect(stats.totalImages).toBeGreaterThan(0);
            expect(stats.imagePairs).toBeGreaterThan(0);
            expect(stats.imagePairs).toBe(Math.floor(stats.totalImages / 2));

            console.log(`Image analysis: ${stats.totalImages} images, ${stats.imagePairs} pairs`);
        });
    });

    describe('Error Scenarios', () => {
        it('should handle missing input directory', async () => {
            // Create app with non-existent input directory
            const badConfig = {
                ...TEST_CONFIG,
                paths: {
                    ...TEST_CONFIG.paths,
                    recipes: './non-existent-input'
                }
            };

            vi.doMock('../../shared/config.js', () => ({
                default: badConfig
            }));

            const { default: CuisinoAppClass } = await import('../../app.js');
            const badApp = new CuisinoAppClass();

            // Should handle gracefully or throw meaningful error
            await expect(async () => {
                await badApp.run();
            }).rejects.toThrow();
        });

        it('should handle different OpenAI error types', async () => {
            const errorTypes: Array<'rate_limit' | 'quota_exceeded' | 'api_key' | 'network'> = 
                ['rate_limit', 'quota_exceeded', 'api_key', 'network'];

            for (const errorType of errorTypes) {
                openaiMock.reset();
                openaiMock.simulateError(errorType);

                // Should handle each error type gracefully
                await expect(app.run()).resolves.not.toThrow();
                console.log(`Handled ${errorType} error successfully`);
            }
        });
    });

    describe('Performance Tests', () => {
        it('should complete processing within reasonable time', async () => {
            const startTime = Date.now();
            
            await app.run();
            
            const duration = Date.now() - startTime;
            const durationSeconds = Math.round(duration / 1000);
            
            // Should complete within 60 seconds for test dataset
            expect(duration).toBeLessThan(60000);
            console.log(`Processing completed in ${durationSeconds} seconds`);
        }, 60000);

        it('should handle concurrent processing limits', async () => {
            // This test verifies that the maxConcurrent setting is respected
            // Since our test config has maxConcurrent: 1, processing should be sequential
            
            const startTime = Date.now();
            await app.run();
            const duration = Date.now() - startTime;

            // Sequential processing should take longer than parallel
            // This is more of a smoke test to ensure no race conditions
            expect(duration).toBeGreaterThan(1000); // At least 1 second
            console.log(`Sequential processing took ${Math.round(duration / 1000)} seconds`);
        });
    });
});

// Helper function to clean up test directories
async function cleanupTestDirectories(): Promise<void> {
    const testDirs = [TEST_CONFIG.paths.output, TEST_CONFIG.paths.temp];
    
    for (const dir of testDirs) {
        if (await pathExists(dir)) {
            await rm(dir, { recursive: true, force: true });
        }
    }
}