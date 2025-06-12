/**
 * Simplified Logger utility
 * Clean, consistent logging across all domains
 */
class Logger {
    static info(message: string, ...args: any[]): void {
        console.log(`ℹ️  ${message}`, ...args);
    }

    static success(message: string, ...args: any[]): void {
        console.log(`✅ ${message}`, ...args);
    }

    static warning(message: string, ...args: any[]): void {
        console.log(`⚠️  ${message}`, ...args);
    }

    static error(message: string, ...args: any[]): void {
        console.error(`❌ ${message}`, ...args);
    }

    static progress(current: number, total: number, message: string): void {
        console.log(`🔄 [${current}/${total}] ${message}`);
    }

    static section(title: string): void {
        console.log(`\n🔹 ${title}`);
        console.log('─'.repeat(50));
    }

    static result(stats: Record<string, string | number>): void {
        console.log('\n📊 Results:');
        Object.entries(stats).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
    }
}

export default Logger;

// Named exports for convenience
export const info = Logger.info;
export const success = Logger.success;
export const warning = Logger.warning;
export const error = Logger.error;
export const progress = Logger.progress;
export const section = Logger.section;
export const result = Logger.result;
