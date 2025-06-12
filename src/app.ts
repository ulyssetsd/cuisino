/**
 * Main Application Orchestrator
 * Simplified main entry point that coordinates all domains
 */
import config from './shared/config.js';
import Logger from './shared/logger.js';

// Domain services
import RecipeRepository from './recipes/repository.js';
import ExtractionOrchestrator from './extraction/orchestrator.js';
import QualityValidator from './quality/validator.js';
import ImageProcessor from './images/processor.js';
import AnalysisService from './analysis/service.js';

import type {
    ProcessingStats,
} from './recipes/types.js';
import type {
    ImageStats,
    ImageProcessingResult,
} from './images/types.js';
import type Recipe from './recipes/recipe.js';

class CuisinoApp {
    private readonly recipeRepo: RecipeRepository;
    private readonly extractor: ExtractionOrchestrator;
    private readonly qualityValidator: QualityValidator;
    private readonly imageProcessor: ImageProcessor;
    private readonly analysisService: AnalysisService;

    constructor() {
        // Validate configuration
        config.validate();

        // Initialize domain services
        this.recipeRepo = new RecipeRepository(config);
        this.extractor = new ExtractionOrchestrator(config);
        this.qualityValidator = new QualityValidator(config);
        this.imageProcessor = new ImageProcessor(config);
        this.analysisService = new AnalysisService(config);
    }

    // Main processing pipeline
    async run(): Promise<void> {
        try {
            Logger.section('🍳 Cuisino Recipe Processor');
            const startTime = Date.now();

            // Setup
            await this.recipeRepo.ensureDirectories();

            // Load recipes (from images and existing data)
            const recipes = await this.loadRecipes();

            if (recipes.length === 0) {
                Logger.warning('No recipes found to process');
                return;
            }

            // Extract recipes from images
            await this.extractor.extractRecipes(recipes);

            // Validate data quality
            this.qualityValidator.validateRecipes(recipes);

            // Save all results
            await this.saveResults(recipes);

            // Generate analysis report
            await this.analysisService.generateReport(recipes);

            // Final summary
            const duration = Math.round((Date.now() - startTime) / 1000);
            Logger.section(`✨ Processing completed in ${duration}s`);
        } catch (error) {
            Logger.error('Application failed:', (error as Error).message);
            throw error;
        }
    }

    // Analyze images only (no processing)
    async analyzeImages(): Promise<ImageStats> {
        Logger.section('🔍 Image Analysis Mode');

        const inputDir = config.paths.recipes + '/compressed';
        return await this.imageProcessor.analyzeImages(inputDir);
    }

    // Optimize images only
    async optimizeImages(): Promise<ImageProcessingResult> {
        Logger.section('🎨 Image Optimization Mode');

        const inputDir = config.paths.recipes + '/uncompressed';
        const outputDir = config.paths.recipes + '/compressed';

        return await this.imageProcessor.optimizeImages(inputDir, outputDir);
    }

    // Load recipes from various sources
    private async loadRecipes(): Promise<Recipe[]> {
        Logger.section('Loading recipes');

        // Try to load existing recipes first
        let recipes = await this.recipeRepo.loadExistingRecipes();

        // If no existing recipes, load from images
        if (recipes.length === 0) {
            recipes = await this.recipeRepo.loadFromImages();
        }

        Logger.info(`Loaded ${recipes.length} recipes total`);
        return recipes;
    }

    // Save all results
    private async saveResults(recipes: Recipe[]): Promise<void> {
        Logger.section('Saving results');

        // Save individual recipes
        for (const recipe of recipes) {
            if (recipe.extracted || recipe.hasError()) {
                await this.recipeRepo.saveRecipe(recipe);
            }
        }

        // Save consolidated file
        const stats = this.calculateStats(recipes);
        await this.recipeRepo.saveAllRecipes(recipes, stats);

        Logger.success('All results saved successfully');
    }

    // Calculate processing statistics
    private calculateStats(recipes: Recipe[]): ProcessingStats {
        const extracted = recipes.filter((r) => r.extracted).length;
        const validated = recipes.filter((r) => r.validated).length;
        const errors = recipes.filter((r) => r.hasError()).length;

        return {
            totalRecipes: recipes.length,
            extractedRecipes: extracted,
            validatedRecipes: validated,
            errorCount: errors,
            successRate: `${Math.round((extracted / recipes.length) * 100)}%`,
            qualityRate: `${Math.round((validated / Math.max(extracted, 1)) * 100)}%`,
        };
    }
}

export default CuisinoApp;
