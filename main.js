#!/usr/bin/env node
/**
 * Main entry point for Cuisino Recipe Processor
 * Simplified vertical slice architecture
 */
require('dotenv').config();
const CuisinoApp = require('./app');

async function main() {
    const app = new CuisinoApp();

    try {
        await app.run();
        process.exit(0);
    } catch (error) {
        console.error('💥 Application failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Graceful shutdown requested');
    process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled rejection:', reason);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };
