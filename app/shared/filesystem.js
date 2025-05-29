/**
 * Simplified File System utilities
 * Common file operations used across domains
 */
const fs = require('fs-extra');
const path = require('path');

class FileSystem {
    static async ensureDir(dirPath) {
        await fs.ensureDir(dirPath);
    }

    static async readJson(filePath) {
        if (!await fs.pathExists(filePath)) {
            return null;
        }
        return await fs.readJson(filePath);
    }

    static async writeJson(filePath, data, pretty = true) {
        await this.ensureDir(path.dirname(filePath));
        const options = pretty ? { spaces: 2 } : {};
        await fs.writeJson(filePath, data, options);
    }

    static async listFiles(dirPath, extension = null) {
        if (!await fs.pathExists(dirPath)) {
            return [];
        }
        
        const files = await fs.readdir(dirPath);
        if (extension) {
            return files.filter(file => file.toLowerCase().endsWith(extension.toLowerCase()));
        }
        return files;
    }

    static async getFileStats(filePath) {
        if (!await fs.pathExists(filePath)) {
            return null;
        }
        return await fs.stat(filePath);
    }

    static async copyFile(src, dest) {
        await this.ensureDir(path.dirname(dest));
        await fs.copy(src, dest);
    }

    static getFileSize(stats) {
        return Math.round(stats.size / 1024); // KB
    }    static formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
        return `${Math.round(bytes / (1024 * 1024))}MB`;
    }

    static async writeText(filePath, content) {
        await this.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content, 'utf8');
    }
}

module.exports = FileSystem;
