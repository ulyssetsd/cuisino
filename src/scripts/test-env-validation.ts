/**
 * Test Environment Validation
 * Tests the Zod schema validation for environment variables
 */
import { validateEnv, generateEnvExample } from '../shared/env-schema.js';

async function testEnvValidation(): Promise<void> {
    console.log('🧪 Testing environment validation...\n');

    try {
        // Test 1: Try to validate current environment
        console.log('📋 Testing current environment configuration:');
        const envConfig = validateEnv();
        console.log('✅ Environment validation passed!');
        console.log('🔧 Current configuration:');
        console.log(`  - OpenAI Model: ${envConfig.OPENAI_MODEL}`);
        console.log(`  - Max Tokens: ${envConfig.MAX_TOKENS}`);
        console.log(`  - Input Dir: ${envConfig.INPUT_DIR}`);
        console.log(`  - Output Dir: ${envConfig.OUTPUT_DIR}`);
        console.log(`  - Auto Correction: ${envConfig.AUTO_CORRECTION}`);
        console.log(`  - Node Environment: ${envConfig.NODE_ENV}`);
        
    } catch (error) {
        console.log('❌ Environment validation failed (expected if no .env file)');
        console.log(`Error: ${(error as Error).message}\n`);
    }

    // Test 2: Generate example .env file content
    console.log('📝 Generated .env.example content:');
    console.log('─'.repeat(50));
    console.log(generateEnvExample());
    console.log('─'.repeat(50));

    console.log('\n✅ Environment validation test completed!');
    console.log('💡 To test with a real environment:');
    console.log('   1. Copy .env.example to .env');
    console.log('   2. Add your OpenAI API key');
    console.log('   3. Run this test again');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    void testEnvValidation();
}