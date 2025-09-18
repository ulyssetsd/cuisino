/**
 * External API Response Types
 * Type definitions for external service responses (OpenAI, etc.)
 */

// OpenAI Chat Completion Types
export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | OpenAIContentPart[];
}

export interface OpenAIContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
    };
}

export interface OpenAIChoice {
    index: number;
    message: {
        role: 'assistant';
        content: string | null;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface OpenAIUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface OpenAIChatCompletionResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: OpenAIChoice[];
    usage?: OpenAIUsage;
    system_fingerprint?: string;
}

export interface OpenAIError {
    error: {
        message: string;
        type: string;
        param?: string;
        code?: string;
    };
}

// OpenAI Chat Completion Request Types
export interface OpenAIChatCompletionRequest {
    model: string;
    messages: OpenAIMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    n?: number;
    stream?: boolean;
    stop?: string | string[];
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: Record<string, number>;
    user?: string;
}

// Type guards for OpenAI responses
export function isOpenAIError(response: unknown): response is OpenAIError {
    return (
        typeof response === 'object' &&
        response !== null &&
        'error' in response &&
        typeof (response as { error: unknown }).error === 'object'
    );
}

export function isValidOpenAIResponse(response: unknown): response is OpenAIChatCompletionResponse {
    return (
        typeof response === 'object' &&
        response !== null &&
        'choices' in response &&
        Array.isArray((response as { choices: unknown }).choices) &&
        'model' in response &&
        typeof (response as { model: unknown }).model === 'string'
    );
}

// External API Error Types
export interface ExternalAPIError {
    service: string;
    statusCode?: number;
    message: string;
    originalError?: unknown;
    timestamp: string;
}

// Generic external service response wrapper
export interface ExternalServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: ExternalAPIError;
    metadata?: {
        requestId?: string;
        duration?: number;
        retryCount?: number;
    };
}

// File system API types (for Sharp/image processing)
export interface ImageProcessingOptions {
    quality?: number;
    progressive?: boolean;
    mozjpeg?: boolean;
    maxWidth?: number;
    maxHeight?: number;
}

export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha?: boolean;
    orientation?: number;
}

// Environment variable validation result
export interface EnvValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    config?: Record<string, unknown>;
}