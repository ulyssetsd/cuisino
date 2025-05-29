# Cuisino 🍳

Automatic HelloFresh recipe extractor from front/back photos using AI vision.

## What it does

Cuisino processes pairs of HelloFresh recipe card photos (front and back) and extracts structured recipe data using OpenAI's GPT-4 Vision API. It automatically:

- Reads front images (title, ingredients, image)
- Reads back images (instructions, nutrition, timing)
- Extracts structured JSON data
- Validates data quality
- Generates consolidated recipe database

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up OpenAI API**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Add your recipe photos**
   - Place front/back photo pairs in `input/compressed/`
   - Photos should be ordered: all fronts first, then all backs in same order

4. **Run extraction**
   ```bash
   npm start
   ```

Results will be saved in `output/all_recipes.json`

## Available Commands

```bash
# Main processing
npm start                    # Extract all recipes with quality validation
npm run extraction:run       # Extract recipes only (no validation)

# Quality & Analysis
npm run quality:validate     # Validate existing recipes
npm run analysis:report      # Generate analysis reports

# Image processing
npm run images:analyze       # Analyze image costs and sizes
npm run images:optimize      # Optimize images for API

# Testing
npm test                     # Run all tests
npm run recipes:test         # Test recipe functionality
npm run quality:test         # Test quality validation

# Utilities
npm run clean:metadata       # Clean temporary files
```

## Project Structure

```
cuisino/
├── recipes/           # Recipe data management
│   ├── recipe.js      # Recipe entity with HelloFresh format support
│   ├── repository.js  # Data persistence and loading
│   └── test.js        # Recipe domain tests
├── extraction/        # OpenAI recipe extraction
│   ├── service.js     # OpenAI API integration
│   └── orchestrator.js # Extraction workflow
├── quality/           # Data validation and scoring
│   ├── validator.js   # Quality validation logic
│   └── test.js        # Quality validation tests
├── images/            # Image processing and optimization
│   └── processor.js   # Image analysis and cost estimation
├── analysis/          # Reporting and statistics
│   └── service.js     # Analysis report generation
├── scripts/           # Domain-specific scripts
├── shared/            # Common utilities
│   ├── config.js      # Configuration management
│   ├── logger.js      # Logging utility
│   └── filesystem.js  # File operations
├── input/             # Input images
│   ├── compressed/    # Optimized images (use these)
│   └── uncompressed/  # Original images
├── output/            # Generated results
├── main.js            # Application entry point
└── app.js             # Application orchestrator
```

## Data Format

Each recipe is extracted as structured JSON:

```json
{
  "id": "recipe_001",
  "title": "Recipe Name",
  "cookingTime": "25 min",
  "servings": 4,
  "ingredients": [
    {
      "name": "Ingredient name",
      "quantity": "150g",
      "unit": "g"
    }
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "tags": ["Italian", "Vegetarian"],
  "nutrition": {
    "calories": "650 kcal",
    "protein": "25g",
    "carbs": "45g"
  },
  "extracted": true,
  "validated": true
}
```

## Quality Validation

The system automatically validates:

- **Title**: Present and meaningful
- **Ingredients**: Valid names, quantities, and units
- **Instructions**: Detailed cooking steps
- **Timing**: Cooking time and servings information

Quality scores are calculated and recipes failing validation can be automatically corrected.

## Configuration

Key settings in `config.json`:

```json
{
  "paths": {
    "inputImages": "./input/compressed",
    "output": "./output"
  },
  "openai": {
    "model": "gpt-4o",
    "maxTokens": 4096
  },
  "quality": {
    "validationThreshold": 0.8,
    "autoCorrection": true
  }
}
```

Environment variables in `.env`:

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `NODE_ENV`: Environment (development/production)

## Requirements

- Node.js 14+
- OpenAI API key with GPT-4 Vision access
- HelloFresh recipe card photos (JPG/PNG format)

## Cost Optimization

- Use `npm run images:optimize` to compress images (~54% size reduction)
- This significantly reduces OpenAI API costs
- Original images are preserved in `input/uncompressed/`

## Support

This tool is specifically designed for HelloFresh recipe cards but can be adapted for other recipe formats by modifying the extraction prompts.
