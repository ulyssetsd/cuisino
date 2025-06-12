/**
 * Simplified File System utilities
 * Common file operations used across domains
 */
import {
    ensureDir as _ensureDir,
    pathExists,
    readJson as _readJson,
    writeJson as _writeJson,
    readdir,
    stat,
    copy,
    writeFile,
} from 'fs-extra';
import { dirname } from 'path';

class FileSystem {
    static async ensureDir(dirPath) {
        await _ensureDir(dirPath);
    }

    static async readJson(filePath) {
        if (!(await pathExists(filePath))) {
            return null;
        }
        return await _readJson(filePath);
    }

    static async writeJson(filePath, data, pretty = true) {
        await this.ensureDir(dirname(filePath));
        const options = pretty ? { spaces: 2 } : {};
        await _writeJson(filePath, data, options);
    }

    static async listFiles(dirPath, extension = null) {
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

    static async getFileStats(filePath) {
        if (!(await pathExists(filePath))) {
            return null;
        }
        return await stat(filePath);
    }

    static async copyFile(src, dest) {
        await this.ensureDir(dirname(dest));
        await copy(src, dest);
    }

    static getFileSize(stats) {
        return Math.round(stats.size / 1024); // KB
    }
    static formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
        return `${Math.round(bytes / (1024 * 1024))}MB`;
    }

    static async writeText(filePath, content) {
        await this.ensureDir(dirname(filePath));
        await writeFile(filePath, content, 'utf8');
    }
}

export default FileSystem;
