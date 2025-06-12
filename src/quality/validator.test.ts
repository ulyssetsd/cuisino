/**
 * Quality Validator Tests
 * Tests for quality validation logic using Vitest
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import QualityValidator from './validator.js';
import { fromImagePaths } from '../recipes/recipe.js';
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

describe('Quality Validator', () => {
    let validator: QualityValidator;

    beforeEach(() => {
        validator = new QualityValidator(mockConfig);
    });

    it('should create validator with correct config', () => {
        expect(validator).toBeDefined();
    });

    it('should validate high-quality recipe', () => {
        const recipe = fromImagePaths('001', '/recto.jpg', '/verso.jpg');
        recipe.extracted = true;
        recipe.title = 'Delicious Pasta Recipe';
        recipe.cookingTime = '30 min';
        recipe.servings = '4 portions';
        recipe.ingredients = [
            { name: 'Pasta', quantity: '400g', unit: 'g' },
            { name: 'Tomatoes', quantity: '2', unit: 'pieces' },
            { name: 'Olive Oil', quantity: '2', unit: 'tbsp' },
        ];
        recipe.instructions = [
            'Boil water in a large pot and add salt',
            'Add pasta and cook according to package instructions',
            'Meanwhile, heat olive oil in a pan and add chopped tomatoes',
            'Drain pasta and mix with tomato sauce',
            'Serve hot with grated cheese',
        ];

        const result = validator.validateRecipe(recipe);

        expect(result.passed).toBe(true);
        expect(result.score).toBeGreaterThan(0.8);
        expect(result.issues).toHaveLength(0);
    });

    it('should identify low-quality recipe', () => {
        const recipe = fromImagePaths('002', '/recto.jpg', '/verso.jpg');
        recipe.extracted = true;
        recipe.title = 'X'; // Too short
        recipe.ingredients = [{ name: 'Ingredient', quantity: '', unit: '' }]; // Missing quantities
        recipe.instructions = ['Do something']; // Too brief

        const result = validator.validateRecipe(recipe);

        expect(result.passed).toBe(false);
        expect(result.score).toBeLessThan(0.8);
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.issues).toContain('Title is missing or too short');
        expect(result.issues).toContain(
            'Ingredients list is incomplete or missing quantities'
        );
        expect(result.issues).toContain(
            'Cooking time information is missing or invalid'
        );
        expect(result.issues).toContain(
            'Servings information is missing or invalid'
        );
    });

    it('should validate recipes batch correctly', () => {
        const recipes = [
            fromImagePaths('001', '/recto1.jpg', '/verso1.jpg'),
            fromImagePaths('002', '/recto2.jpg', '/verso2.jpg'),
        ];

        // Setup first recipe as high quality
        recipes[0].extracted = true;
        recipes[0].title = 'Good Recipe';
        recipes[0].cookingTime = '25 min';
        recipes[0].servings = '2';
        recipes[0].ingredients = [
            { name: 'Ingredient 1', quantity: '100g', unit: 'g' },
            { name: 'Ingredient 2', quantity: '1', unit: 'cup' },
        ];
        recipes[0].instructions = [
            'Step 1: Prepare ingredients carefully',
            'Step 2: Cook according to directions',
            'Step 3: Serve immediately',
        ];

        // Setup second recipe as low quality
        recipes[1].extracted = true;
        recipes[1].title = 'Bad Recipe';
        recipes[1].ingredients = [
            { name: 'Something', quantity: '', unit: '' },
        ];
        recipes[1].instructions = ['Cook it'];

        // Mock console methods to avoid test output
        const consoleSpy = vi
            .spyOn(console, 'log')
            .mockImplementation(() => {});

        validator.validateRecipes(recipes);

        expect(recipes[0]?.validated).toBe(true);
        expect(recipes[1]?.validated).toBe(false);

        consoleSpy.mockRestore();
    });

    it('should skip non-extracted recipes', () => {
        const recipes = [fromImagePaths('001', '/recto.jpg', '/verso.jpg')];
        // Don't set extracted to true

        const consoleSpy = vi
            .spyOn(console, 'log')
            .mockImplementation(() => {});

        validator.validateRecipes(recipes);

        expect(recipes[0]?.validated).toBe(false);

        consoleSpy.mockRestore();
    });

    it('should validate individual recipe components', () => {
        const recipe = fromImagePaths('001', '/recto.jpg', '/verso.jpg');
        recipe.extracted = true;

        // Test with missing components
        let result = validator.validateRecipe(recipe);
        expect(result.issues).toContain('Title is missing or too short');
        expect(result.issues).toContain(
            'Ingredients list is incomplete or missing quantities'
        );
        expect(result.issues).toContain(
            'Instructions are missing or too brief'
        );
        expect(result.issues).toContain(
            'Cooking time information is missing or invalid'
        );
        expect(result.issues).toContain(
            'Servings information is missing or invalid'
        );

        // Add components one by one
        recipe.title = 'Test Recipe Title';
        result = validator.validateRecipe(recipe);
        expect(result.issues).not.toContain('Title is missing or too short');

        recipe.cookingTime = '45 minutes';
        result = validator.validateRecipe(recipe);
        expect(result.issues).not.toContain(
            'Cooking time information is missing or invalid'
        );

        recipe.servings = '4 people';
        result = validator.validateRecipe(recipe);
        expect(result.issues).not.toContain(
            'Servings information is missing or invalid'
        );

        recipe.ingredients = [
            { name: 'Flour', quantity: '200g', unit: 'g' },
            { name: 'Eggs', quantity: '2', unit: 'pieces' },
        ];
        result = validator.validateRecipe(recipe);
        expect(result.issues).not.toContain(
            'Ingredients list is incomplete or missing quantities'
        );

        recipe.instructions = [
            'Mix the flour and eggs in a large bowl',
            'Knead the dough for 10 minutes until smooth',
            'Let rest for 30 minutes before use',
        ];
        result = validator.validateRecipe(recipe);
        expect(result.issues).not.toContain(
            'Instructions are missing or too brief'
        );

        expect(result.passed).toBe(true);
    });
});
