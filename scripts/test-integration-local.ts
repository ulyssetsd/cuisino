#!/usr/bin/env tsx
/**
 * Local Integration Test Runner
 * Run this script locally with your OpenAI API key to test the full pipeline
 */
import 'dotenv/config';
import CuisinoApp from '../src/app.js';
import { pathExists, readdir } from 'fs-extra';
import { join } from 'path';

async function runLocalIntegrationTest(): Promise<void> {
    console.log('🧪 Local Integration Test - Real OpenAI API');
    console.log('==========================================\n');

    // Check environment setup
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not found in environment');
        console.log('💡 Add your OpenAI API key to .env file');
        console.log('💡 Copy .env.example to .env and edit it');
        process.exit(1);
    }

    // Check for input images
    const inputDir = './input/compressed';
    if (!(await pathExists(inputDir))) {
        console.error('❌ Input directory not found:', inputDir);
        console.log('💡 Create the directory and add recipe photos');
        process.exit(1);
    }

    const images = await readdir(inputDir);
    const jpgImages = images.filter(img => img.toLowerCase().endsWith('.jpg'));

    if (jpgImages.length === 0) {
        console.error('❌ No JPG images found in:', inputDir);
        console.log('💡 Add recipe photos to the input directory');
        process.exit(1);
    }

    if (jpgImages.length % 2 !== 0) {
        console.error('❌ Odd number of images found:', jpgImages.length);
        console.log('💡 Recipe photos should come in pairs (recto/verso)');
        process.exit(1);
    }

    const pairCount = Math.floor(jpgImages.length / 2);
    console.log(`✅ Found ${jpgImages.length} images (${pairCount} pairs)`);

    // Cost estimation
    const estimatedCost = pairCount * 0.02; // Rough estimate
    console.log(`💰 Estimated cost: ~$${estimatedCost.toFixed(2)} (${pairCount} pairs × ~$0.02)`);
    
    // Ask for confirmation
    console.log('\n⚠️  This will make real OpenAI API calls and incur costs.');
    console.log('   Press Ctrl+C to cancel, or any key to continue...');
    
    // Wait for user confirmation (simplified for demo)
    await new Promise(resolve => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve(void 0);
        });
    });

    console.log('\n🚀 Starting integration test with real OpenAI API...\n');

    try {
        const app = new CuisinoApp();
        const startTime = Date.now();
        
        await app.run();
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n✅ Integration test completed in ${duration} seconds`);
        
        // Check results
        const outputDir = './output';
        const allRecipesPath = join(outputDir, 'all_recipes.json');
        
        if (await pathExists(allRecipesPath)) {
            const { readFile } = await import('fs/promises');
            const content = await readFile(allRecipesPath, 'utf-8');
            const data = JSON.parse(content);
            
            console.log('\n📊 Results Summary:');
            console.log(`   Total recipes: ${data.metadata?.totalRecipes || 0}`);
            console.log(`   Extracted: ${data.metadata?.extractedRecipes || 0}`);
            console.log(`   Success rate: ${data.metadata?.successRate || 'N/A'}`);
            console.log(`   Output file: ${allRecipesPath}`);
            
            if (data.recipes && data.recipes.length > 0) {
                console.log('\n📝 Sample Recipe:');
                const firstRecipe = data.recipes[0];
                console.log(`   Title: ${firstRecipe.title || 'N/A'}`);
                console.log(`   Ingredients: ${firstRecipe.ingredients?.length || 0}`);
                console.log(`   Instructions: ${firstRecipe.steps?.length || 0}`);
            }
        }
        
        console.log('\n🎉 Local integration test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Integration test failed:', (error as Error).message);
        console.log('\n🔍 This could indicate:');
        console.log('   - OpenAI API issues (rate limits, quota, etc.)');
        console.log('   - Invalid API key');
        console.log('   - Network connectivity problems');
        console.log('   - Issues in the application code');
        process.exit(1);
    }
}

// Tips for cost-effective testing
function printCostSavingTips(): void {
    console.log('\n💡 Tips for cost-effective testing:');
    console.log('   - Test with 2-6 image pairs first');
    console.log('   - Use gpt-4o-mini model (set OPENAI_MODEL=gpt-4o-mini)');
    console.log('   - Reduce MAX_TOKENS to 2000 for shorter responses');
    console.log('   - Move unused images temporarily to limit processing');
    console.log('   - Check your OpenAI usage dashboard regularly');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    printCostSavingTips();
    runLocalIntegrationTest().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}