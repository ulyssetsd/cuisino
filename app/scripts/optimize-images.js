/**
 * Image optimization script
 * Simplified version of optimize-images.js
 */
require('dotenv').config();
const CuisinoApp = require('../app');

async function optimizeImages() {
    const app = new CuisinoApp();
    
    try {
        await app.optimizeImages();
        
        console.log('\n✨ Images optimized successfully!');
        console.log('🚀 Ready to process recipes: npm run main');
        
    } catch (error) {
        console.error('Optimization failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    optimizeImages();
}
