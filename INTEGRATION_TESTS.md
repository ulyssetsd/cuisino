# Integration Tests Documentation

## Overview

This document describes the integration test suite for the Cuisino recipe extraction pipeline. The tests are designed to validate the entire processing workflow using real photos while mocking the OpenAI API to avoid costs.

## Test Structure

### Test Files

- `src/__tests__/integration/processing-pipeline.test.ts` - End-to-end application tests
- `src/__tests__/integration/real-image-processing.test.ts` - Focused image processing tests  
- `src/__tests__/integration/openai-mock.ts` - OpenAI API mock implementation

### What the Tests Cover

1. **Full Processing Pipeline**
   - Loading and pairing real images from `input/compressed/`
   - Recipe extraction using mocked OpenAI API
   - Data quality validation
   - Output file generation
   - Error handling and graceful degradation

2. **Real Image Processing**
   - Image discovery and pairing validation
   - Recipe extraction from actual photo pairs
   - Quality validation of extracted data
   - File I/O operations
   - Error scenarios with different API failures

3. **OpenAI API Mocking**
   - Realistic response generation with proper delays
   - Multiple recipe templates for variety
   - Error simulation (rate limits, quota exceeded, API key issues)
   - Token usage estimation

## Running the Tests

### Prerequisites

1. Ensure you have real test images in `input/compressed/`
2. Images should be paired (even number of JPG files)
3. No OpenAI API key required for integration tests

### Commands

```bash
# Run all tests
npm test

# Run only unit tests (exclude integration)
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch integration tests during development
npm run test:integration:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Configuration

Integration tests use a separate configuration to avoid conflicts:

- **Output Directory**: `./test-integration-output`
- **Temp Directory**: `./test-integration-temp`
- **Reduced Timeouts**: Faster processing for testing
- **Limited Retries**: Fewer retry attempts
- **Mocked OpenAI**: No real API calls

## Test Scenarios

### Successful Processing Path

1. **Image Discovery**: Verifies real images are found and paired correctly
2. **Extraction**: Uses mocked OpenAI to extract recipe data
3. **Validation**: Checks data quality and structure
4. **Output**: Saves individual and consolidated recipe files

### Error Handling

1. **OpenAI Rate Limits**: Simulates and handles rate limiting
2. **Quota Exceeded**: Tests quota exhaustion scenarios  
3. **API Key Issues**: Validates authentication error handling
4. **Network Errors**: Simulates connection timeouts
5. **Missing Input**: Tests behavior with invalid input directories

### Performance Tests

1. **Processing Time**: Ensures reasonable completion times
2. **Concurrent Limits**: Validates maxConcurrent settings
3. **Memory Usage**: Monitors resource consumption during processing

## Expected Results

After running integration tests, you should see:

```
✓ Real Image Processing Integration (6 tests)
  ✓ should discover and pair real images correctly
  ✓ should extract recipes from first 3 image pairs using mocked OpenAI  
  ✓ should validate extracted recipe quality
  ✓ should save processing results correctly
  ✓ should handle OpenAI API errors gracefully during real image processing
  ✓ should process image pairs in correct order

✓ Recipe Processing Pipeline Integration Tests (4 test suites)
  ✓ Full Processing Pipeline (4 tests)
  ✓ Image Analysis Mode (1 test)  
  ✓ Error Scenarios (2 tests)
  ✓ Performance Tests (2 tests)
```

## OpenAI Mock Details

The OpenAI mock provides:

- **3 Recipe Templates**: Variety in mocked responses
- **Realistic Delays**: 1-3 second response times
- **Token Estimation**: Approximate token usage calculation
- **Error Simulation**: Different error types for testing
- **Consistent Responses**: Predictable output for testing

### Mock Recipe Templates

1. **Spaghetti Bolognese**: Traditional Italian recipe
2. **Quinoa Salad**: Vegetarian healthy option
3. **Chicken Teriyaki**: Japanese-inspired dish

Each template includes:
- Complete ingredient lists with quantities and units
- Step-by-step instructions
- Nutritional information
- Allergens and tags
- Realistic French recipe text (HelloFresh style)

## Troubleshooting

### Common Issues

1. **No Images Found**
   - Ensure `input/compressed/` contains JPG files
   - Check file permissions
   - Verify even number of images for pairing

2. **Test Timeouts**
   - Integration tests have 30-second timeouts
   - Large image sets may need timeout adjustments
   - Check system performance during tests

3. **Mock Failures**
   - Ensure vi.doMock() calls are before imports
   - Check mock implementation consistency
   - Verify OpenAI module mocking

4. **Output Directory Issues**
   - Tests clean up automatically
   - Manual cleanup: remove `test-*-output` directories
   - Check write permissions

### Debug Mode

Add logging to see test progress:

```bash
# Verbose test output
npm run test:integration -- --reporter=verbose

# Debug specific test
npm run test:integration -- --reporter=verbose --grep "should extract recipes"
```

## Local Development

For local development with real OpenAI API:

1. Copy integration test structure
2. Replace OpenAI mock with real client
3. Add environment variable for test API key
4. Use smaller image subset to minimize costs
5. Consider using cheaper models (gpt-4o-mini)

## Contributing

When adding new integration tests:

1. Follow existing test patterns
2. Use the OpenAI mock for consistency  
3. Include both success and error scenarios
4. Add appropriate timeouts for long operations
5. Clean up test artifacts in teardown
6. Update this documentation

## Performance Expectations

Typical integration test run times:

- **Full Pipeline**: ~60 seconds for complete dataset
- **Limited Processing**: ~20 seconds for 3 image pairs
- **Error Scenarios**: ~15 seconds per error type
- **Quality Validation**: ~10 seconds for validation checks

Tests should complete within 5 minutes total on modern hardware.