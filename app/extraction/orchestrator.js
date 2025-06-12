/**
 * Extraction Orchestrator
 * Manages the extraction process with retry logic
 */
import ExtractionService from './service.js';
import {
    info,
    section,
    progress,
    error as _error,
    result,
    warning,
} from '../shared/logger.js';

class ExtractionOrchestrator {
    constructor(config) {
        this.config = config;
        this.service = new ExtractionService(config);
        this.maxRetries = config.processing.retryAttempts;
    }

    // Extract all recipes that need extraction
    async extractRecipes(recipes) {
        const toExtract = recipes.filter((recipe) => recipe.needsExtraction());

        if (toExtract.length === 0) {
            info('No recipes need extraction');
            return;
        }

        section(`Extracting ${toExtract.length} recipes`);

        for (let i = 0; i < toExtract.length; i++) {
            const recipe = toExtract[i];

            progress(i + 1, toExtract.length, `Processing recipe ${recipe.id}`);

            try {
                await this.extractWithRetry(recipe);

                // Delay between requests (except for last one)
                if (i < toExtract.length - 1) {
                    await this.service.delay();
                }
            } catch (error) {
                _error(
                    `Failed to extract recipe ${recipe.id} after ${this.maxRetries} attempts`
                );
            }
        }

        const successful = toExtract.filter((r) => r.extracted).length;
        const failed = toExtract.filter((r) => r.hasError()).length;

        result({
            'Successful extractions': successful,
            'Failed extractions': failed,
            'Success rate': `${Math.round((successful / toExtract.length) * 100)}%`,
        });
    }

    // Extract single recipe with retry logic
    async extractWithRetry(recipe) {
        let lastError;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                await this.service.extractRecipe(recipe);
                return; // Success
            } catch (error) {
                lastError = error;

                if (attempt < this.maxRetries) {
                    warning(`Attempt ${attempt} failed, retrying...`);
                    await this.service.delay();
                }
            }
        }

        // All attempts failed
        recipe.setError(lastError);
        throw lastError;
    }
}

export default ExtractionOrchestrator;
