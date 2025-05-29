/**
 * Image analysis script
 * Simplified version of analyze-images.js
 */
require('dotenv').config();
const CuisinoApp = require('../app');

async function analyzeImages() {
    const app = new CuisinoApp();
    
    try {
        const stats = await app.analyzeImages();
        
        console.log('\n🚀 Next steps:');
        console.log('   npm run images:optimize  # Optimize images first');
        console.log('   npm run main            # Process all recipes');
        
    } catch (error) {
        console.error('Analysis failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    analyzeImages();
}
