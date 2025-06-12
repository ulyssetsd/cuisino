/**
 * Shared Configuration Types
 * Core configuration interfaces used across the application
 */

export interface OpenAIConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
}

export interface PathsConfig {
    recipes: string;
    output: string;
    temp: string;
}

export interface ProcessingConfig {
    retryAttempts: number;
    delayBetweenRequests: number;
    maxConcurrent: number;
}

export interface QualityConfig {
    autoCorrection: boolean;
    validationThreshold: number;
}

export interface ImageCompressionConfig {
    quality: number;
    progressive: boolean;
    mozjpeg: boolean;
}

export interface ImagesConfig {
    compression: ImageCompressionConfig;
    maxSize: number;
}

export interface AppConfig {
    openai: OpenAIConfig;
    paths: PathsConfig;
    processing: ProcessingConfig;
    quality: QualityConfig;
    images: ImagesConfig;
    validate(): boolean;
}
