# Analysis Domain

Generates comprehensive reports and statistics from processed recipes.

## Components

### Analysis Service (`service.js`)
- Statistical analysis of recipe data
- Report generation (JSON and Markdown)
- Insight extraction and trend analysis

## Key Features

- **Comprehensive Statistics**: Success rates, quality metrics, averages
- **Ingredient Analysis**: Most common ingredients and usage patterns
- **Quality Insights**: Validation rates and common issues
- **Multiple Formats**: JSON data and human-readable Markdown
- **Error Tracking**: Detailed error analysis and reporting

## Generated Reports

### JSON Report (`analysis_report.json`)
- Structured data for programmatic access
- Complete statistics and metadata
- Error details and ingredient analysis

### Markdown Report (`analysis_report.md`)
- Human-readable summary
- Key insights and recommendations
- Top ingredients and common issues

## Usage

```javascript
const AnalysisService = require('./service');

const analyzer = new AnalysisService(config);
const report = await analyzer.generateReport(recipes);
```

## Scripts

```bash
# Generate analysis report
npm run analysis:report
```

## Report Contents

- **Summary**: Total recipes, success rates, validation rates
- **Insights**: Average cooking times, ingredient counts, top ingredients
- **Issues**: Extraction errors, quality problems, recommendations
- **Trends**: Ingredient popularity, recipe complexity analysis
