/**
 * Image Processing Types
 * Interfaces for image processing, optimization, and statistics
 */

export interface ImagePair {
    recto: string;
    verso: string;
}

export interface ImageStats {
    totalImages: number;
    imagePairs: number;
    totalSizeMB: number;
    minSizeKB: number;
    maxSizeKB: number;
    avgSizeKB: number;
    estimatedCost: number;
}

export interface ImageProcessingResult extends Record<string, string | number> {
    'Images processed': number;
    'Size before': string;
    'Size after': string;
    'Compression rate': string;
}
