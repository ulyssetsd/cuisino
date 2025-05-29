# Extraction Domain

Handles recipe extraction from images using OpenAI's Vision API.

## Components

### Extraction Service (`service.js`)
- OpenAI API integration
- Image preparation and processing
- Response parsing and validation

### Orchestrator (`orchestrator.js`)
- Manages extraction workflow
- Implements retry logic
- Handles rate limiting and error recovery

## Key Features

- **Image Processing**: Prepares images for OpenAI API
- **Smart Prompting**: Optimized prompts for recipe extraction
- **Retry Logic**: Automatic retry on failures
- **Rate Limiting**: Respects API limits with delays
- **Error Handling**: Graceful failure recovery

## Usage

```javascript
const ExtractionOrchestrator = require('./orchestrator');

const extractor = new ExtractionOrchestrator(config);
await extractor.extractRecipes(recipes);
```

## Scripts

```bash
# Extract recipes only
npm run extraction:run
```

## Configuration

Set these environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: Model to use (default: gpt-4o)
- `MAX_TOKENS`: Maximum tokens per request
