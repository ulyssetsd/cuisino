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
} from '../shared/filesystem';
import { section, result, progress, error as _error } from '../shared/logger';

class ImageProcessor {
    constructor(config) {
        this.config = config;
        this.compression = config.images.compression;
        this.maxSize = config.images.maxSize;
    }

    // Analyze images in directory
    async analyzeImages(inputDir) {
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

        const stats = {
            totalImages: images.length,
            imagePairs: pairs.length,
            totalSizeMB: Math.round(totalSize / (1024 * 1024)),
            minSizeKB: Math.round(minSize / 1024),
            maxSizeKB: Math.round(maxSize / 1024),
            avgSizeKB: Math.round(totalSize / images.length / 1024),
            estimatedCost: this.estimateProcessingCost(pairs.length),
        };

        result(stats);
        return stats;
    }

    // Optimize images for processing
    async optimizeImages(inputDir, outputDir) {
        section('Optimizing images');

        await ensureDir(outputDir);

        const images = await listFiles(inputDir, '.jpg');
        let processed = 0;
        let totalSizeBefore = 0;
        let totalSizeAfter = 0;

        for (let i = 0; i < images.length; i++) {
            const filename = images[i];
            const inputPath = join(inputDir, filename);
            const outputPath = join(outputDir, filename);

            progress(i + 1, images.length, `Processing ${filename}`);

            try {
                const beforeStats = await getFileStats(inputPath);
                totalSizeBefore += beforeStats.size;

                await this.processImage(inputPath, outputPath);

                const afterStats = await getFileStats(outputPath);
                totalSizeAfter += afterStats.size;

                processed++;
            } catch (error) {
                _error(`Failed to process ${filename}: ${error.message}`);
            }
        }

        const compressionRate = Math.round(
            (1 - totalSizeAfter / totalSizeBefore) * 100
        );

        result({
            'Images processed': processed,
            'Size before': formatFileSize(totalSizeBefore),
            'Size after': formatFileSize(totalSizeAfter),
            'Compression rate': `${compressionRate}%`,
        });
    }

    // Process single image
    async processImage(inputPath, outputPath) {
        const metadata = await sharp(inputPath).metadata();

        let processor = sharp(inputPath);

        // Handle rotation based on EXIF or dimensions
        if (metadata.orientation === 6 || metadata.orientation === 8) {
            processor = processor.rotate(); // Apply EXIF rotation
            processor = processor.rotate(-90); // Additional rotation if needed
        } else if (metadata.height > metadata.width) {
            processor = processor.rotate(-90); // Portrait to landscape
        }

        // Resize if too large
        if (metadata.width > this.maxSize || metadata.height > this.maxSize) {
            processor = processor.resize(this.maxSize, this.maxSize, {
                fit: 'inside',
                withoutEnlargement: true,
            });
        }

        // Apply compression
        await processor.jpeg(this.compression).toFile(outputPath);
    }

    // Group images into pairs (assuming sequential naming)
    groupImagePairs(images) {
        const pairs = [];
        const sorted = images.sort();

        for (let i = 0; i < sorted.length; i += 2) {
            if (i + 1 < sorted.length) {
                pairs.push({
                    recto: sorted[i],
                    verso: sorted[i + 1],
                });
            }
        }

        return pairs;
    }

    // Estimate processing cost
    estimateProcessingCost(pairCount) {
        const tokensPerImage = 1000; // Conservative estimate
        const totalTokens = pairCount * 2 * tokensPerImage;
        const costPer1kTokens = 0.01; // Approximate

        return {
            estimatedTokens: totalTokens,
            estimatedCostUSD:
                Math.round((totalTokens / 1000) * costPer1kTokens * 100) / 100,
        };
    }
}

export default ImageProcessor;
