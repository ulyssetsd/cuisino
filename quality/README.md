# Quality Domain

Validates and ensures the quality of extracted recipe data.

## Components

### Quality Validator (`validator.js`)
- Recipe data validation
- Quality scoring algorithm
- Issue detection and reporting

## Key Features

- **Multi-Factor Validation**: Validates title, ingredients, instructions, timing
- **Quality Scoring**: Numerical quality assessment
- **Issue Detection**: Identifies specific data quality problems
- **Batch Processing**: Validates multiple recipes efficiently

## Validation Criteria

### Title (2 points)
- Must be present and at least 3 characters long

### Ingredients (3 points)
- At least 3 ingredients required
- 80% must have valid names
- 70% should have quantities

### Instructions (3 points)
- At least 3 steps required
- 80% must be detailed (10+ characters)
- 50% should be comprehensive (30+ characters)

### Timing & Servings (2 points)
- Cooking time should be specified
- Serving information should be present

## Usage

```javascript
const QualityValidator = require('./validator');

const validator = new QualityValidator(config);
validator.validateRecipes(recipes);
```

## Scripts

```bash
# Validate quality only
npm run quality:validate

# Run quality tests
npm run quality:test
```

## Configuration

- `quality.validationThreshold`: Minimum quality score (0.0-1.0)
