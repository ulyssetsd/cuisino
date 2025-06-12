/**
 * Simplified File System utilities
 * Common file operations used across domains
 */
import fs from 'fs-extra';
import { dirname } from 'path';

const {
    ensureDir: _ensureDir,
    pathExists,
    readJson: _readJson,
    writeJson: _writeJson,
    readdir,
    stat,
    copy,
    writeFile,
} = fs;

class FileSystem {
    static async ensureDir(dirPath: string): Promise<void> {
        await _ensureDir(dirPath);
    }

    static async readJson<T = any>(filePath: string): Promise<T | null> {
        if (!(await pathExists(filePath))) {
            return null;
        }
        return await _readJson(filePath);
    }

    static async writeJson(
        filePath: string,
        data: any,
        pretty = true
    ): Promise<void> {
        await this.ensureDir(dirname(filePath));
        const options = pretty ? { spaces: 2 } : {};
        await _writeJson(filePath, data, options);
    }

    static async listFiles(
        dirPath: string,
        extension: string | null = null
    ): Promise<string[]> {
        if (!(await pathExists(dirPath))) {
            return [];
        }

        const files = await readdir(dirPath);
        if (extension) {
            return files.filter((file) =>
                file.toLowerCase().endsWith(extension.toLowerCase())
            );
        }
        return files;
    }

    static async getFileStats(filePath: string): Promise<fs.Stats | null> {
        if (!(await pathExists(filePath))) {
            return null;
        }
        return await stat(filePath);
    }

    static async copyFile(src: string, dest: string): Promise<void> {
        await this.ensureDir(dirname(dest));
        await copy(src, dest);
    }

    static getFileSize(stats: fs.Stats): number {
        return Math.round(stats.size / 1024); // KB
    }

    static formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
        return `${Math.round(bytes / (1024 * 1024))}MB`;
    }

    static async writeText(filePath: string, content: string): Promise<void> {
        await this.ensureDir(dirname(filePath));
        await writeFile(filePath, content, 'utf8');
    }
}

export default FileSystem;

// Named exports for convenience
export const listFiles = FileSystem.listFiles;
export const readJson = FileSystem.readJson;
export const writeJson = FileSystem.writeJson;
export const ensureDir = FileSystem.ensureDir;
export const getFileStats = FileSystem.getFileStats;
export const formatFileSize = FileSystem.formatFileSize;
export const writeText = FileSystem.writeText;
