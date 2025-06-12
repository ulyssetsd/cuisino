/**
 * Simplified Configuration Manager
 * Centralized configuration with environment variables
 */
import 'dotenv/config';
import type {
    AppConfig,
    OpenAIConfig,
    PathsConfig,
    ProcessingConfig,
    QualityConfig,
    ImagesConfig,
    ImageCompressionConfig,
} from '../types/index.js';

class Config implements AppConfig {
    public readonly openai: OpenAIConfig;
    public readonly paths: PathsConfig;
    public readonly processing: ProcessingConfig;
    public readonly quality: QualityConfig;
    public readonly images: ImagesConfig;

    constructor() {
        this.openai = {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: process.env.OPENAI_MODEL || 'gpt-4o',
            maxTokens: parseInt(process.env.MAX_TOKENS || '4000', 10),
        };

        this.paths = {
            recipes: process.env.INPUT_DIR || './input',
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

        const compression: ImageCompressionConfig = {
            quality: 85,
            progressive: true,
            mozjpeg: true,
        };

        this.images = {
            compression,
            maxSize: 2048,
        };
    }

    validate(): boolean {
        if (!this.openai.apiKey) {
            throw new Error('OPENAI_API_KEY is required');
        }
        return true;
    }
}

export default new Config();
