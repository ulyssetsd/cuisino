/**
 * Main Application Orchestrator
 * Simplified main entry point that coordinates all domains
 */
const config = require('./app/shared/config').default;
const Logger = require('./app/shared/logger');

// Domain services
const RecipeRepository = require('./app/recipes/repository').default;
const ExtractionOrchestrator = require('./app/extraction/orchestrator').default;
const QualityValidator = require('./app/quality/validator').default;
const ImageProcessor = require('./app/images/processor').default;
const AnalysisService = require('./app/analysis/service').default;

class CuisinoApp {
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
    async run() {
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
            Logger.error('Application failed:', error.message);
            throw error;
        }
    }

    // Analyze images only (no processing)
    async analyzeImages() {
        Logger.section('🔍 Image Analysis Mode');

        const inputDir = config.paths.recipes + '/compressed';
        return await this.imageProcessor.analyzeImages(inputDir);
    }

    // Optimize images only
    async optimizeImages() {
        Logger.section('🎨 Image Optimization Mode');

        const inputDir = config.paths.recipes + '/uncompressed';
        const outputDir = config.paths.recipes + '/compressed';

        return await this.imageProcessor.optimizeImages(inputDir, outputDir);
    }

    // Load recipes from various sources
    async loadRecipes() {
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
    async saveResults(recipes) {
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
    calculateStats(recipes) {
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

module.exports = CuisinoApp;
