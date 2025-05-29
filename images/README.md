# Images Domain

Handles image processing, optimization, and analysis.

## Components

### Image Processor (`processor.js`)
- Image analysis and statistics
- Image optimization and compression
- Format conversion and rotation

## Key Features

- **Analysis**: Calculate size, count, and processing estimates
- **Optimization**: Compress and rotate images for API efficiency
- **Smart Rotation**: Handles EXIF and dimension-based rotation
- **Batch Processing**: Process multiple images efficiently
- **Cost Estimation**: Estimate API processing costs

## Usage

```javascript
const ImageProcessor = require('./processor');

const processor = new ImageProcessor(config);

// Analyze images
const stats = await processor.analyzeImages(inputDir);

// Optimize images
await processor.optimizeImages(inputDir, outputDir);
```

## Scripts

```bash
# Analyze images without processing
npm run images:analyze

# Optimize images for processing
npm run images:optimize
```

## Configuration

Image processing settings:
- `images.compression.quality`: JPEG quality (85)
- `images.compression.progressive`: Progressive JPEG
- `images.maxSize`: Maximum dimension (2048px)

## Image Pipeline

1. **Uncompressed** → Original photos from camera
2. **Compressed** → Optimized for API processing
3. **Processing** → Extract recipes from compressed images
