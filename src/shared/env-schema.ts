/**
 * Environment Variables Schema Validation
 * Provides runtime validation for environment variables using Zod
 */
import { z } from 'zod';

// Schema for environment variables
export const envSchema = z.object({
    // OpenAI Configuration
    OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
    OPENAI_MODEL: z.string().default('gpt-4o'),
    MAX_TOKENS: z.string().regex(/^\d+$/, 'MAX_TOKENS must be a number').transform(Number).default('4000'),
    
    // Path Configuration  
    INPUT_DIR: z.string().default('./input'),
    OUTPUT_DIR: z.string().default('./output'),
    
    // Processing Configuration
    AUTO_CORRECTION: z.string().transform(val => val === 'true').default('false'),
    
    // Node Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed config
 * @throws {z.ZodError} When validation fails
 */
export function validateEnv(): EnvConfig {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
        console.error('❌ Environment validation failed:');
        result.error.errors.forEach(error => {
            console.error(`  - ${error.path.join('.')}: ${error.message}`);
        });
        throw new Error('Invalid environment configuration');
    }
    
    return result.data;
}

/**
 * Creates a .env.example file with all required variables
 */
export function generateEnvExample(): string {
    return `# Cuisino Environment Configuration

# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
MAX_TOKENS=4000

# Directory Paths
INPUT_DIR=./input
OUTPUT_DIR=./output

# Processing Options
AUTO_CORRECTION=false

# Environment
NODE_ENV=development
`;
}