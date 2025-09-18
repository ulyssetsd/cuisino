/**
 * Simplified Configuration Manager
 * Centralized configuration with environment variables and Zod validation
 */
import 'dotenv/config';
import { validateEnv, type EnvConfig } from './env-schema.js';
import type {
    AppConfig,
    OpenAIConfig,
    PathsConfig,
    ProcessingConfig,
    QualityConfig,
    ImagesConfig,
    ImageCompressionConfig,
} from './types.js';

class Config implements AppConfig {
    public readonly openai: OpenAIConfig;
    public readonly paths: PathsConfig;
    public readonly processing: ProcessingConfig;
    public readonly quality: QualityConfig;
    public readonly images: ImagesConfig;
    private readonly envConfig: EnvConfig;

    constructor() {
        // Validate environment variables first
        this.envConfig = validateEnv();

        this.openai = {
            apiKey: this.envConfig.OPENAI_API_KEY,
            model: this.envConfig.OPENAI_MODEL,
            maxTokens: this.envConfig.MAX_TOKENS,
        };

        this.paths = {
            recipes: this.envConfig.INPUT_DIR,
            output: this.envConfig.OUTPUT_DIR,
            temp: './temp',
        };

        this.processing = {
            retryAttempts: 3,
            delayBetweenRequests: 2000,
            maxConcurrent: 1,
        };

        this.quality = {
            autoCorrection: this.envConfig.AUTO_CORRECTION,
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
        // Environment validation is now handled by Zod schema
        // Additional application-specific validation can be added here
        return true;
    }

    getEnvConfig(): EnvConfig {
        return this.envConfig;
    }
}

export default new Config();
