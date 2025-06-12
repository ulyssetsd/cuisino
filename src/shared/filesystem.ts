/**
 * File system utilities using native Node.js APIs
 * Direct use of fs/promises and fs-extra for better performance
 */
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { ensureDir, pathExists, readJson, writeJson } from 'fs-extra';

// Re-export fs-extra functions that are commonly used
export { ensureDir, pathExists, readJson, writeJson };

// Simple file operations using native fs/promises
export async function readText(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
}

export async function writeText(filePath: string, content: string): Promise<void> {
    await ensureDir(dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
}

export async function listFiles(dirPath: string, extension?: string): Promise<string[]> {
    try {
        const files = await fs.readdir(dirPath);
        return extension 
            ? files.filter(file => file.toLowerCase().endsWith(extension.toLowerCase()))
            : files;
    } catch {
        return [];
    }
}

export async function getFileStats(filePath: string): Promise<{ size: number } | null> {
    try {
        const stats = await fs.stat(filePath);
        return { size: stats.size };
    } catch {
        return null;
    }
}

export function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
}
