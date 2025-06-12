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
# Development
npm run dev                  # Run in development mode with tsx
npm run build                # Build the TypeScript project
npm start                    # Run the built application

# Main processing
npm run extraction:run       # Extract recipes only (no validation)
npm run quality:validate     # Validate existing recipes
npm run analysis:report      # Generate analysis reports

# Testing & Quality
npm test                     # Run all tests with Vitest
npm run test:watch           # Run tests in watch mode
npm run test:run             # Run tests once
npm run typecheck            # Check TypeScript types

# Code Quality
npm run lint                 # Lint TypeScript files
npm run lint:fix             # Fix linting issues
npm run format               # Format code with Prettier
npm run format:check         # Check code formatting
```

## Project Structure

```
cuisino/
├── src/               # TypeScript source code
│   ├── recipes/       # Recipe data management
│   │   ├── recipe.ts  # Recipe entity with HelloFresh format support
│   │   ├── repository.ts # Data persistence and loading
│   │   └── recipe.test.ts # Recipe domain tests
│   ├── extraction/    # OpenAI recipe extraction
│   │   ├── service.ts # OpenAI API integration
│   │   └── orchestrator.ts # Extraction workflow
│   ├── quality/       # Data validation and scoring
│   │   ├── validator.ts # Quality validation logic
│   │   └── validator.test.ts # Quality validation tests
│   ├── images/        # Image processing and optimization
│   │   └── processor.ts # Image analysis and cost estimation
│   ├── analysis/      # Reporting and statistics
│   │   └── service.ts # Analysis report generation
│   ├── scripts/       # Domain-specific scripts
│   │   ├── extract-only.ts
│   │   ├── validate-quality.ts
│   │   └── generate-report.ts
│   ├── shared/        # Common utilities
│   │   ├── config.ts  # Configuration management
│   │   ├── logger.ts  # Logging utility
│   │   ├── filesystem.ts # File operations
│   │   └── types.ts   # Shared configuration types
│   ├── recipes/       # Recipe data management
│   │   ├── recipe.ts  # Recipe entity with HelloFresh format support
│   │   ├── repository.ts # Data persistence and loading
│   │   ├── recipe.test.ts # Recipe domain tests
│   │   └── types.ts   # Recipe domain types
│   ├── extraction/    # OpenAI recipe extraction
│   │   ├── service.ts # OpenAI API integration
│   │   └── orchestrator.ts # Extraction workflow
│   ├── quality/       # Data validation and scoring
│   │   ├── validator.ts # Quality validation logic
│   │   ├── validator.test.ts # Quality validation tests
│   │   └── types.ts   # Quality validation types
│   ├── images/        # Image processing and optimization
│   │   ├── processor.ts # Image analysis and cost estimation
│   │   └── types.ts   # Image processing types
│   ├── analysis/      # Reporting and statistics
│   │   ├── service.ts # Analysis report generation
│   │   └── types.ts   # Analysis and reporting types
├── dist/              # Compiled JavaScript output
├── input/             # Input images
│   ├── compressed/    # Optimized images (use these)
│   └── uncompressed/  # Original images
├── output/            # Generated results
├── tsconfig.json      # TypeScript configuration
├── tsup.config.ts     # Build configuration
└── vitest.config.ts   # Test configuration
```

## TypeScript Stack

This project uses a modern TypeScript development stack:

- **Language**: TypeScript with strict type checking
- **Build Tool**: tsup (fast ESBuild-based bundler)
- **Test Framework**: Vitest (fast Vite-based testing)
- **Dev Runtime**: tsx (fast TypeScript execution)
- **Code Quality**: ESLint + Prettier
- **Type Safety**: Comprehensive interfaces for all domain objects

All source code is fully typed with proper interfaces, ensuring type safety and excellent developer experience.

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
    "instructions": ["Step 1 instruction", "Step 2 instruction"],
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
