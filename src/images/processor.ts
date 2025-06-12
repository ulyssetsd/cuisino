/**
 * Simplified Image Processor
 * Clean image optimization and analysis
 */
import sharp from 'sharp';
import { join } from 'path';
import {
    listFiles,
    getFileStats,
    ensureDir,
    formatFileSize,
} from '../shared/filesystem.js';
import {
    section,
    result,
    progress,
    error as _error,
} from '../shared/logger.js';
import type { AppConfig, ImageCompressionConfig } from '../shared/types.js';
import type {
    ImagePair,
    ImageStats,
    ImageProcessingResult,
} from './types.js';

class ImageProcessor {
    private readonly config: AppConfig;
    private readonly compression: ImageCompressionConfig;
    private readonly maxSize: number;

    constructor(config: AppConfig) {
        this.config = config;
        this.compression = config.images.compression;
        this.maxSize = config.images.maxSize;
    }

    // Analyze images in directory
    async analyzeImages(inputDir: string): Promise<ImageStats> {
        section('Analyzing images');

        const images = await listFiles(inputDir, '.jpg');
        const pairs = this.groupImagePairs(images);

        let totalSize = 0;
        let minSize = Infinity;
        let maxSize = 0;

        for (const pair of pairs) {
            const rectoStats = await getFileStats(join(inputDir, pair.recto));
            const versoStats = await getFileStats(join(inputDir, pair.verso));

            if (rectoStats && versoStats) {
                totalSize += rectoStats.size + versoStats.size;
                minSize = Math.min(minSize, rectoStats.size, versoStats.size);
                maxSize = Math.max(maxSize, rectoStats.size, versoStats.size);
            }
        }

        const stats: ImageStats = {
            totalImages: images.length,
            imagePairs: pairs.length,
            totalSizeMB: Math.round(totalSize / (1024 * 1024)),
            minSizeKB: Math.round(minSize / 1024),
            maxSizeKB: Math.round(maxSize / 1024),
            avgSizeKB: Math.round(totalSize / images.length / 1024),
            estimatedCost: this.estimateProcessingCost(pairs.length),
        };

        result({
            'Total Images': stats.totalImages,
            'Image Pairs': stats.imagePairs,
            'Total Size (MB)': stats.totalSizeMB,
            'Average Size (KB)': stats.avgSizeKB,
            'Estimated Cost': stats.estimatedCost,
        });
        return stats;
    }

    // Optimize images for processing
    async optimizeImages(
        inputDir: string,
        outputDir: string
    ): Promise<ImageProcessingResult> {
        section('Optimizing images');

        await ensureDir(outputDir);

        const images = await listFiles(inputDir, '.jpg');
        let processed = 0;
        let totalSizeBefore = 0;
        let totalSizeAfter = 0;

        for (let i = 0; i < images.length; i++) {
            const filename = images[i];
            if (!filename) continue;
            
            const inputPath = join(inputDir, filename);
            const outputPath = join(outputDir, filename);

            progress(i + 1, images.length, `Processing ${filename}`);

            try {
                const beforeStats = await getFileStats(inputPath);
                if (beforeStats) {
                    totalSizeBefore += beforeStats.size;
                }

                await this.processImage(inputPath, outputPath);

                const afterStats = await getFileStats(outputPath);
                if (afterStats) {
                    totalSizeAfter += afterStats.size;
                }

                processed++;
            } catch (error) {
                _error(
                    `Failed to process ${filename}: ${(error as Error).message}`
                );
            }
        }

        const compressionRate = Math.round(
            (1 - totalSizeAfter / totalSizeBefore) * 100
        );

        const resultData: ImageProcessingResult = {
            'Images processed': processed,
            'Size before': formatFileSize(totalSizeBefore),
            'Size after': formatFileSize(totalSizeAfter),
            'Compression rate': `${compressionRate}%`,
        };

        result(resultData as Record<string, string | number>);
        return resultData;
    }

    // Process single image
    private async processImage(
        inputPath: string,
        outputPath: string
    ): Promise<void> {
        await sharp(inputPath)
            .resize(this.maxSize, this.maxSize, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({
                quality: this.compression.quality,
                progressive: this.compression.progressive,
                mozjpeg: this.compression.mozjpeg,
            })
            .toFile(outputPath);
    }

    // Group images into pairs (assuming sequential naming)
    private groupImagePairs(images: string[]): ImagePair[] {
        const pairs: ImagePair[] = [];
        const sortedImages = images.sort();

        for (let i = 0; i < sortedImages.length; i += 2) {
            if (i + 1 < sortedImages.length) {
                const rectoImage = sortedImages[i];
                const versoImage = sortedImages[i + 1];
                if (rectoImage && versoImage) {
                    pairs.push({
                        recto: rectoImage,
                        verso: versoImage,
                    });
                }
            }
        }

        return pairs;
    }

    // Estimate processing cost
    private estimateProcessingCost(pairCount: number): number {
        // Rough estimate: $0.01 per image pair for GPT-4V
        return Math.round(pairCount * 0.02 * 100) / 100;
    }
}

export default ImageProcessor;
