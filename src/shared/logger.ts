/**
 * Simple logging utilities using native console
 * Consistent formatting without unnecessary abstractions
 */

export function info(message: string, ...args: unknown[]): void {
    console.log(`ℹ️  ${message}`, ...args);
}

export function success(message: string, ...args: unknown[]): void {
    console.log(`✅ ${message}`, ...args);
}

export function warning(message: string, ...args: unknown[]): void {
    console.log(`⚠️  ${message}`, ...args);
}

export function error(message: string, ...args: unknown[]): void {
    console.error(`❌ ${message}`, ...args);
}

export function progress(current: number, total: number, message: string): void {
    console.log(`🔄 [${current}/${total}] ${message}`);
}

export function section(title: string): void {
    console.log(`\n🔹 ${title}`);
    console.log('─'.repeat(50));
}

export function result(stats: Record<string, string | number>): void {
    console.log('\n📊 Results:');
    Object.entries(stats).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
}
