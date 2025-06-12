/**
 * Recipes Domain Tests
 * Tests for Recipe entity and RecipeRepository using Vitest
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { fromImagePaths, fromJson } from './recipe.js';
import RecipeRepository from './repository.js';
import type { AppConfig } from '../types/index.js';

// Mock configuration for tests
const mockConfig: AppConfig = {
    openai: {
        apiKey: 'test-key',
        model: 'gpt-4o',
        maxTokens: 4000,
    },
    paths: {
        recipes: './test/data/recipes',
        output: './test/output',
        temp: './test/temp',
    },
    processing: {
        retryAttempts: 3,
        delayBetweenRequests: 1000,
        maxConcurrent: 1,
    },
    quality: {
        autoCorrection: false,
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
    validate: () => true,
};

describe('Recipe Entity', () => {
    it('should create recipe from image paths', () => {
        const recipe = fromImagePaths(
            '001',
            '/path/to/recto.jpg',
            '/path/to/verso.jpg'
        );

        expect(recipe.id).toBe('001');
        expect(recipe.rectoPath).toBe('/path/to/recto.jpg');
        expect(recipe.versoPath).toBe('/path/to/verso.jpg');
        expect(recipe.extracted).toBe(false);
        expect(recipe.validated).toBe(false);
    });

    it('should create recipe from JSON data', () => {
        const jsonData = {
            id: '002',
            title: 'Test Recipe',
            ingredients: [
                { name: 'Test Ingredient', quantity: '1', unit: 'cup' },
            ],
            steps: [{ text: 'Test instruction' }],
        };

        const recipe = fromJson(jsonData);

        expect(recipe.id).toBe('002');
        expect(recipe.title).toBe('Test Recipe');
        expect(recipe.ingredients).toHaveLength(1);
        expect(recipe.instructions).toHaveLength(1);
    });

    it('should validate recipe correctly', () => {
        const recipe = fromImagePaths('003', '/recto.jpg', '/verso.jpg');

        // Invalid recipe (missing required fields)
        let validation = recipe.isValid();
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Missing title');

        // Valid recipe
        recipe.title = 'Valid Recipe';
        recipe.ingredients = [
            { name: 'Ingredient 1', quantity: '1', unit: 'cup' },
        ];
        recipe.instructions = ['Step 1: Do something'];

        validation = recipe.isValid();
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
    });

    it('should handle extraction data update', () => {
        const recipe = fromImagePaths('004', '/recto.jpg', '/verso.jpg');

        const extractionData = {
            title: 'Extracted Recipe',
            cookingTime: '30 min',
            ingredients: [{ name: 'Flour', quantity: '2', unit: 'cups' }],
            instructions: ['Mix flour', 'Bake for 30 minutes'],
        };

        recipe.updateFromExtraction(extractionData);

        expect(recipe.title).toBe('Extracted Recipe');
        expect(recipe.cookingTime).toBe('30 min');
        expect(recipe.extracted).toBe(true);
        expect(recipe.extractedAt).toBeDefined();
    });

    it('should handle errors correctly', () => {
        const recipe = fromImagePaths('005', '/recto.jpg', '/verso.jpg');
        const error = new Error('Test error');

        recipe.setError(error);

        expect(recipe.hasError()).toBe(true);
        expect(recipe.error).toBe('Test error');
        expect(recipe.extracted).toBe(false);
    });

    it('should export to JSON correctly', () => {
        const recipe = fromImagePaths('006', '/recto.jpg', '/verso.jpg');
        recipe.title = 'JSON Test Recipe';
        recipe.ingredients = [
            { name: 'Test Ingredient', quantity: '1', unit: 'cup' },
        ];
        recipe.instructions = ['Test instruction'];
        recipe.extracted = true;

        const json = recipe.toJson();

        expect(json.id).toBe('006');
        expect(json.title).toBe('JSON Test Recipe');
        expect(json.ingredients).toHaveLength(1);
        expect(json.steps).toHaveLength(1);
        expect(json.steps[0].text).toBe('Test instruction');
    });
});

describe('Recipe Repository', () => {
    let repository: RecipeRepository;

    beforeEach(() => {
        repository = new RecipeRepository(mockConfig);
    });

    it('should create repository with correct config', () => {
        expect(repository).toBeDefined();
    });

    it('should group images into pairs correctly', () => {
        const images = [
            'image_001.jpg',
            'image_002.jpg',
            'image_003.jpg',
            'image_004.jpg',
        ];
        const pairs = repository.groupImagePairs(images, '/test/dir');

        expect(pairs).toHaveLength(2);
        expect(pairs[0].recto).toContain('image_001.jpg');
        expect(pairs[0].verso).toContain('image_002.jpg');
        expect(pairs[1].recto).toContain('image_003.jpg');
        expect(pairs[1].verso).toContain('image_004.jpg');
    });

    it('should handle odd number of images', () => {
        const images = ['image_001.jpg', 'image_002.jpg', 'image_003.jpg'];
        const pairs = repository.groupImagePairs(images, '/test/dir');

        expect(pairs).toHaveLength(1);
        expect(pairs[0].recto).toContain('image_001.jpg');
        expect(pairs[0].verso).toContain('image_002.jpg');
    });

    it('should handle empty images array', () => {
        const images: string[] = [];
        const pairs = repository.groupImagePairs(images, '/test/dir');

        expect(pairs).toHaveLength(0);
    });
});
