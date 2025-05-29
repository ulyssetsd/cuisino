/**
 * Simplified Logger utility
 * Clean, consistent logging across all domains
 */
class Logger {
    static info(message, ...args) {
        console.log(`ℹ️  ${message}`, ...args);
    }

    static success(message, ...args) {
        console.log(`✅ ${message}`, ...args);
    }

    static warning(message, ...args) {
        console.log(`⚠️  ${message}`, ...args);
    }

    static error(message, ...args) {
        console.error(`❌ ${message}`, ...args);
    }

    static progress(current, total, message) {
        console.log(`🔄 [${current}/${total}] ${message}`);
    }

    static section(title) {
        console.log(`\n🔹 ${title}`);
        console.log('─'.repeat(50));
    }

    static result(stats) {
        console.log('\n📊 Results:');
        Object.entries(stats).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
    }
}

module.exports = Logger;
