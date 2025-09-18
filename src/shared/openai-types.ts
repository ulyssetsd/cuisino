/**
 * Type definitions for OpenAI API responses
 * Provides strongly typed interfaces for external API interactions
 */

export interface OpenAIChoice {
    index: number;
    message: {
        role: 'assistant' | 'user' | 'system';
        content: string | null;
    };
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
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
    usage: OpenAIUsage;
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

export interface OpenAIImageMessage {
    type: 'image_url';
    image_url: {
        url: string;
        detail: 'low' | 'high' | 'auto';
    };
}

export interface OpenAITextMessage {
    type: 'text';
    text: string;
}

export type OpenAIUserMessageContent = OpenAITextMessage | OpenAIImageMessage;

export interface OpenAIChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | OpenAIUserMessageContent[];
}

export interface OpenAIChatCompletionRequest {
    model: string;
    messages: OpenAIChatMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    n?: number;
    stop?: string | string[];
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: Record<string, number>;
    user?: string;
}

// Rate limiting and error types
export interface OpenAIRateLimitError extends OpenAIError {
    error: {
        message: string;
        type: 'requests' | 'tokens';
        param: null;
        code: 'rate_limit_exceeded';
    };
}

export interface OpenAIQuotaError extends OpenAIError {
    error: {
        message: string;
        type: 'insufficient_quota';
        param: null;
        code: 'insufficient_quota';
    };
}

// Type guards for error handling
export function isOpenAIRateLimitError(error: unknown): error is OpenAIRateLimitError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as any).error === 'object' &&
        (error as any).error.code === 'rate_limit_exceeded'
    );
}

export function isOpenAIQuotaError(error: unknown): error is OpenAIQuotaError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as any).error === 'object' &&
        (error as any).error.code === 'insufficient_quota'
    );
}

export function isOpenAIError(error: unknown): error is OpenAIError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as any).error === 'object' &&
        typeof (error as any).error.message === 'string'
    );
}