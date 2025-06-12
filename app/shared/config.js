/**
 * Simplified Configuration Manager
 * Centralized configuration with environment variables
 */
require('dotenv').config();

class Config {
    constructor() {
        this.openai = {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4o',
            maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
        };

        this.paths = {
            recipes: process.env.INPUT_DIR || './recipes',
            output: process.env.OUTPUT_DIR || './output',
            temp: './temp',
        };

        this.processing = {
            retryAttempts: 3,
            delayBetweenRequests: 2000,
            maxConcurrent: 1,
        };

        this.quality = {
            autoCorrection: process.env.AUTO_CORRECTION === 'true',
            validationThreshold: 0.8,
        };

        this.images = {
            compression: {
                quality: 85,
                progressive: true,
                mozjpeg: true,
            },
            maxSize: 2048,
        };
    }

    validate() {
        if (!this.openai.apiKey) {
            throw new Error('OPENAI_API_KEY is required');
        }
        return true;
    }
}

export default new Config();
