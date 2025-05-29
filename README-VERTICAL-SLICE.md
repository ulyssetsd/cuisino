# Cuisino - Vertical Slice Architecture

A refactored and simplified recipe extraction system organized into autonomous vertical domains.

## 🏗️ Architecture Overview

The application is now organized into **5 vertical domains**, each being autonomous and focused:

```
├── recipes/          # Core recipe management
├── extraction/       # OpenAI-based recipe extraction  
├── quality/          # Data validation and quality assurance
├── images/           # Image processing and optimization
├── analysis/         # Reporting and statistics
├── shared/           # Common utilities (config, logging, filesystem)
└── scripts/          # Domain-specific entry points
```

## 🚀 Quick Start

### 1. Setup
```bash
npm install
cp .env.example .env  # Configure your OpenAI API key
```

### 2. Process Recipes (Full Pipeline)
```bash
npm start
```

### 3. Domain-Specific Operations

```bash
# Image operations
npm run images:analyze     # Analyze images and estimate costs
npm run images:optimize    # Optimize images for processing

# Extraction only
npm run extraction:run     # Extract recipes from images

# Quality validation only  
npm run quality:validate   # Validate extracted data quality

# Analysis and reporting
npm run analysis:report    # Generate comprehensive reports
```

## 📦 Domain Independence

Each domain is **autonomous** with:
- ✅ Own directory with all related code
- ✅ Independent functionality and tests
- ✅ Clear boundaries and interfaces
- ✅ Domain-specific scripts in package.json
- ✅ Documentation and examples

### No Cross-Dependencies
Domains communicate only through:
- Shared data structures (Recipe entity)
- Common utilities (config, logging, filesystem)
- Clean interfaces between domains

## 🧪 Testing

```bash
# Test all domains
npm test

# Test specific domains
npm run recipes:test
npm run quality:test
```

## 📊 Improvements from Refactoring

### Code Simplification
- **Removed**: Complex DDD layers and abstractions
- **Simplified**: Service classes with clear responsibilities  
- **Consolidated**: Configuration and utilities
- **Streamlined**: Error handling and logging

### Better Organization
- **Vertical Slices**: Each domain is self-contained
- **Clear Separation**: No mixing of concerns
- **Easy Navigation**: Find all related code in one place
- **Independent Testing**: Test domains in isolation

### Enhanced Maintainability
- **Single Responsibility**: Each service has one clear job
- **Simplified Dependencies**: Minimal coupling between components
- **Clear Interfaces**: Well-defined boundaries
- **Evolutionary Architecture**: Easy to extend or modify domains

## 🔧 Configuration

All configuration is centralized in `shared/config.js`:

```javascript
// Environment variables
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o
INPUT_DIR=./recipes
OUTPUT_DIR=./output
AUTO_CORRECTION=true
```

## 📈 Legacy Support

Legacy scripts are still available with `legacy:` prefix:
```bash
npm run legacy:start    # Old index.js
npm run legacy:ddd      # Old DDD architecture
npm run legacy:analyze  # Old analyze script
```

## 🎯 Next Steps

With this clean foundation, you can:
1. **Add new domains** easily (e.g., nutrition, meal planning)
2. **Extend existing domains** without affecting others
3. **Migrate to TypeScript** domain by domain
4. **Add advanced features** like caching, webhooks, etc.
5. **Scale individual domains** based on needs

Each domain can evolve independently while maintaining the overall system coherence.
