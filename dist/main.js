#!/usr/bin/env node

// src/main.ts
import "dotenv/config";

// src/shared/config.ts
import "dotenv/config";
var Config = class {
  openai;
  paths;
  processing;
  quality;
  images;
  constructor() {
    this.openai = {
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4o",
      maxTokens: parseInt(process.env.MAX_TOKENS || "4000", 10)
    };
    this.paths = {
      recipes: process.env.INPUT_DIR || "./input",
      output: process.env.OUTPUT_DIR || "./output",
      temp: "./temp"
    };
    this.processing = {
      retryAttempts: 3,
      delayBetweenRequests: 2e3,
      maxConcurrent: 1
    };
    this.quality = {
      autoCorrection: process.env.AUTO_CORRECTION === "true",
      validationThreshold: 0.8
    };
    const compression = {
      quality: 85,
      progressive: true,
      mozjpeg: true
    };
    this.images = {
      compression,
      maxSize: 2048
    };
  }
  validate() {
    if (!this.openai.apiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }
    return true;
  }
};
var config_default = new Config();

// src/shared/logger.ts
function info(message, ...args) {
  console.log(`\u2139\uFE0F  ${message}`, ...args);
}
function success(message, ...args) {
  console.log(`\u2705 ${message}`, ...args);
}
function warning(message, ...args) {
  console.log(`\u26A0\uFE0F  ${message}`, ...args);
}
function error(message, ...args) {
  console.error(`\u274C ${message}`, ...args);
}
function progress(current, total, message) {
  console.log(`\u{1F504} [${current}/${total}] ${message}`);
}
function section(title) {
  console.log(`
\u{1F539} ${title}`);
  console.log("\u2500".repeat(50));
}
function result(stats) {
  console.log("\n\u{1F4CA} Results:");
  Object.entries(stats).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

// src/recipes/repository.ts
import { join } from "path";

// src/recipes/recipe.ts
var Recipe = class _Recipe {
  id;
  rectoPath;
  versoPath;
  // Recipe data
  title;
  subtitle;
  cookingTime;
  difficulty;
  servings;
  ingredients;
  instructions;
  nutritionalInfo;
  allergens;
  tips;
  tags;
  image;
  source;
  metadata;
  // Status tracking
  extracted;
  validated;
  extractedAt;
  error;
  constructor(id, rectoPath, versoPath) {
    this.id = id;
    this.rectoPath = rectoPath;
    this.versoPath = versoPath;
    this.title = void 0;
    this.subtitle = void 0;
    this.cookingTime = void 0;
    this.difficulty = void 0;
    this.servings = void 0;
    this.ingredients = [];
    this.instructions = [];
    this.nutritionalInfo = {};
    this.allergens = [];
    this.tips = [];
    this.tags = [];
    this.image = "";
    this.source = void 0;
    this.metadata = {};
    this.extracted = false;
    this.validated = false;
    this.extractedAt = void 0;
    this.error = void 0;
  }
  // Factory method from image paths
  static fromImagePaths(id, rectoPath, versoPath) {
    return new _Recipe(id, rectoPath, versoPath);
  }
  // Factory method from JSON
  static fromJson(data) {
    const recipe = new _Recipe(data.id, data.rectoPath, data.versoPath);
    if (data.steps) {
      recipe.title = data.title || "Unknown Recipe";
      recipe.subtitle = data.subtitle;
      recipe.cookingTime = data.duration;
      recipe.difficulty = data.difficulty;
      recipe.servings = data.servings;
      recipe.ingredients = data.ingredients || [];
      recipe.instructions = data.steps ? data.steps.map((step) => step.text) : [];
      recipe.nutritionalInfo = data.nutrition || {};
      recipe.allergens = data.allergens || [];
      recipe.tips = data.tips || [];
      recipe.tags = data.tags || [];
      recipe.image = data.image;
      recipe.source = data.source;
      recipe.metadata = data.metadata || {};
      recipe.extracted = true;
      recipe.validated = false;
      recipe.extractedAt = data.metadata?.processedAt || (/* @__PURE__ */ new Date()).toISOString();
    } else if (data.title) {
      Object.assign(recipe, data);
    } else {
      recipe.title = data.title || "Unknown Recipe";
      recipe.cookingTime = data.duration || data.cookingTime;
      recipe.servings = data.servings;
      recipe.ingredients = data.ingredients || [];
      recipe.instructions = data.instructions || [];
      recipe.nutritionalInfo = data.nutritionalInfo || {};
      recipe.extracted = true;
      recipe.validated = false;
      recipe.extractedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    return recipe;
  }
  // Update with extraction data
  updateFromExtraction(data) {
    this.title = data.title;
    this.subtitle = data.subtitle;
    this.cookingTime = data.cookingTime || data.duration;
    this.difficulty = data.difficulty;
    this.servings = data.servings;
    this.ingredients = data.ingredients || [];
    this.instructions = data.instructions || [];
    this.nutritionalInfo = data.nutritionalInfo || data.nutrition || {};
    this.allergens = data.allergens || [];
    this.tips = data.tips || [];
    this.tags = data.tags || [];
    this.image = data.image || "";
    this.source = data.source || "Extracted";
    this.extracted = true;
    this.extractedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  // Mark as error
  setError(error2) {
    this.error = error2.message;
    this.extracted = false;
    this.validated = false;
  }
  // Check if needs extraction
  needsExtraction() {
    return !this.extracted && !this.hasError();
  }
  // Check if has error
  hasError() {
    return Boolean(this.error);
  }
  // Basic validation
  isValid() {
    const errors = [];
    if (!this.title) errors.push("Missing title");
    if (!this.ingredients || this.ingredients.length === 0)
      errors.push("Missing ingredients");
    if (!this.instructions || this.instructions.length === 0)
      errors.push("Missing instructions");
    return {
      valid: errors.length === 0,
      errors
    };
  }
  // Export to JSON (maintaining HelloFresh format)
  toJson() {
    const cleanMetadata = { ...this.metadata };
    if (!cleanMetadata.originalFiles && (this.rectoPath || this.versoPath)) {
      cleanMetadata.originalFiles = {
        recto: this.rectoPath,
        verso: this.versoPath
      };
    }
    if (cleanMetadata.originalFiles) {
      delete cleanMetadata.rectoPath;
      delete cleanMetadata.versoPath;
    }
    cleanMetadata.extracted = this.extracted;
    cleanMetadata.validated = this.validated;
    cleanMetadata.extractedAt = this.extractedAt;
    cleanMetadata.error = this.error;
    return {
      id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      duration: this.cookingTime,
      difficulty: this.difficulty,
      servings: this.servings,
      ingredients: this.ingredients,
      steps: this.instructions.map((instruction) => ({
        text: instruction
      })),
      nutrition: this.nutritionalInfo,
      allergens: this.allergens || [],
      tips: this.tips || [],
      tags: this.tags || [],
      image: this.image || "",
      source: this.source || "Extracted",
      metadata: cleanMetadata
    };
  }
};
var fromImagePaths = Recipe.fromImagePaths;
var fromJson = Recipe.fromJson;

// src/shared/filesystem.ts
import { promises as fs } from "fs";
import { dirname } from "path";
import { ensureDir, pathExists, readJson, writeJson } from "fs-extra";
async function writeText(filePath, content) {
  await ensureDir(dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
}
async function listFiles(dirPath, extension) {
  try {
    const files = await fs.readdir(dirPath);
    return extension ? files.filter((file) => file.toLowerCase().endsWith(extension.toLowerCase())) : files;
  } catch {
    return [];
  }
}
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return { size: stats.size };
  } catch {
    return null;
  }
}
function formatFileSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
}

// src/recipes/repository.ts
var RecipeRepository = class {
  config;
  recipesPath;
  outputPath;
  constructor(config) {
    this.config = config;
    this.recipesPath = config.paths.recipes;
    this.outputPath = config.paths.output;
  }
  // Load recipes from image pairs
  async loadFromImages() {
    const compressedDir = join(this.recipesPath, "compressed");
    const images = await listFiles(compressedDir, ".jpg");
    const pairs = this.groupImagePairs(images, compressedDir);
    info(`Found ${pairs.length} image pairs in ${compressedDir}`);
    return pairs.map(
      (pair, index) => fromImagePaths(
        String(index + 1).padStart(3, "0"),
        pair.recto,
        pair.verso
      )
    );
  }
  // Load existing recipes from consolidated JSON file
  async loadExistingRecipes() {
    const recipes = [];
    const consolidatedPath = join(this.outputPath, "all_recipes.json");
    const consolidatedData = await readJson(consolidatedPath);
    if (consolidatedData && consolidatedData.recipes) {
      for (let i = 0; i < consolidatedData.recipes.length; i++) {
        const data = consolidatedData.recipes[i];
        if (data) {
          data.id = data.id || String(i + 1).padStart(3, "0");
          recipes.push(fromJson(data));
        }
      }
    }
    info(
      `Loaded ${recipes.length} existing recipes from consolidated file`
    );
    return recipes;
  }
  // Save single recipe - updates the consolidated file
  async saveRecipe(recipe) {
    const existingRecipes = await this.loadExistingRecipes();
    const existingIndex = existingRecipes.findIndex(
      (r) => r.id === recipe.id
    );
    if (existingIndex >= 0) {
      existingRecipes[existingIndex] = recipe;
    } else {
      existingRecipes.push(recipe);
    }
    await this.saveAllRecipes(existingRecipes);
  }
  // Save multiple recipes efficiently (batch update)
  async saveRecipes(recipes) {
    await this.saveAllRecipes(recipes);
  }
  // Save all recipes as consolidated file
  async saveAllRecipes(recipes, stats = {}) {
    const data = {
      metadata: {
        ...stats,
        totalRecipes: recipes.length,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      recipes: recipes.map((r) => r.toJson())
    };
    const filePath = join(this.outputPath, "all_recipes.json");
    await writeJson(filePath, data);
    success(
      `Saved ${recipes.length} recipes to consolidated file: ${filePath}`
    );
    return filePath;
  }
  // Group images into recto/verso pairs
  groupImagePairs(images, baseDir) {
    const pairs = [];
    const sortedImages = images.sort();
    for (let i = 0; i < sortedImages.length; i += 2) {
      if (i + 1 < sortedImages.length) {
        const rectoImage = sortedImages[i];
        const versoImage = sortedImages[i + 1];
        if (rectoImage && versoImage) {
          pairs.push({
            recto: join(baseDir, rectoImage),
            verso: join(baseDir, versoImage)
          });
        }
      }
    }
    return pairs;
  }
  // Ensure output directory exists
  async ensureDirectories() {
    await ensureDir(this.outputPath);
  }
};
var repository_default = RecipeRepository;

// src/extraction/service.ts
import OpenAI from "openai";
import { readFileSync } from "fs";
var ExtractionService = class {
  config;
  openai;
  model;
  maxTokens;
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
  }
  // Extract recipe from image pair
  async extractRecipe(recipe) {
    if (!recipe.rectoPath || !recipe.versoPath) {
      throw new Error(
        "Recipe must have both recto and verso image paths"
      );
    }
    try {
      info(`Extracting recipe ${recipe.id}`);
      const images = await this.prepareImages(
        recipe.rectoPath,
        recipe.versoPath
      );
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: this.createExtractionPrompt()
              },
              ...images
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ]
            // OpenAI types issue - this is correct at runtime
          }
        ]
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }
      const extractedData = this.parseResponse(content);
      recipe.updateFromExtraction(extractedData);
      success(`Recipe ${recipe.id} extracted successfully`);
    } catch (error2) {
      error(
        `Failed to extract recipe ${recipe.id}:`,
        error2.message
      );
      recipe.setError(error2);
    }
  }
  // Prepare images for OpenAI
  async prepareImages(rectoPath, versoPath) {
    const images = [];
    for (const imagePath of [rectoPath, versoPath]) {
      const imageBuffer = readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      images.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
          detail: "high"
        }
      });
    }
    return images;
  }
  // Create system prompt
  getSystemPrompt() {
    return `You are an expert recipe extraction assistant. Your task is to analyze HelloFresh recipe cards and extract structured recipe data.

Extract the following information from the recipe cards:
- Title and subtitle
- Cooking time and difficulty
- Servings
- Complete ingredients list with quantities
- Step-by-step instructions
- Nutritional information (if available)
- Allergens and dietary tags

Always respond in valid JSON format. Be precise and comprehensive.`;
  }
  // Create extraction prompt (now simplified for user message)
  createExtractionPrompt() {
    return `Please extract the recipe information from these HelloFresh recipe cards. The first image shows the front of the card, the second shows the back with instructions.

Return the data in this JSON format:
{
  "title": "Recipe Title",
  "subtitle": "Recipe Subtitle (if any)",
  "cookingTime": "30 min",
  "difficulty": "Easy/Medium/Hard",
  "servings": 2,
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount",
      "unit": "unit"
    }
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "nutritionalInfo": {
    "calories": 500,
    "carbs": "45g",
    "protein": "30g",
    "fat": "15g"
  },
  "allergens": ["allergen1", "allergen2"],
  "tags": ["tag1", "tag2"]
}`;
  }
  // Parse OpenAI response
  parseResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      return JSON.parse(jsonStr);
    } catch (error2) {
      error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }
  }
  // Add delay between requests
  async delay() {
    await new Promise(
      (resolve) => setTimeout(resolve, this.config.processing.delayBetweenRequests)
    );
  }
};
var service_default = ExtractionService;

// src/extraction/orchestrator.ts
var ExtractionOrchestrator = class {
  config;
  service;
  maxRetries;
  constructor(config) {
    this.config = config;
    this.service = new service_default(config);
    this.maxRetries = config.processing.retryAttempts;
  }
  // Extract all recipes that need extraction
  async extractRecipes(recipes) {
    const toExtract = recipes.filter((recipe) => recipe.needsExtraction());
    if (toExtract.length === 0) {
      info("No recipes need extraction");
      return;
    }
    section(`Extracting ${toExtract.length} recipes`);
    for (let i = 0; i < toExtract.length; i++) {
      const recipe = toExtract[i];
      if (!recipe) continue;
      progress(i + 1, toExtract.length, `Processing recipe ${recipe.id}`);
      try {
        await this.extractWithRetry(recipe);
        if (i < toExtract.length - 1) {
          await this.service.delay();
        }
      } catch (error2) {
        error(
          `Failed to extract recipe ${recipe.id} after ${this.maxRetries} attempts`
        );
      }
    }
    const successful = toExtract.filter((r) => r.extracted).length;
    const failed = toExtract.filter((r) => r.hasError()).length;
    result({
      "Successful extractions": successful,
      "Failed extractions": failed,
      "Success rate": `${Math.round(successful / toExtract.length * 100)}%`
    });
  }
  // Extract single recipe with retry logic
  async extractWithRetry(recipe) {
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          warning(`Retry attempt ${attempt} for recipe ${recipe.id}`);
          await this.service.delay();
        }
        await this.service.extractRecipe(recipe);
        return;
      } catch (error2) {
        lastError = error2;
        if (attempt === this.maxRetries) {
          recipe.setError(lastError);
          throw lastError;
        }
      }
    }
  }
};
var orchestrator_default = ExtractionOrchestrator;

// src/quality/validator.ts
var QualityValidator = class {
  config;
  threshold;
  constructor(config) {
    this.config = config;
    this.threshold = config.quality.validationThreshold;
  }
  // Validate all recipes that need quality check
  validateRecipes(recipes) {
    const toValidate = recipes.filter(
      (recipe) => recipe.extracted && !recipe.validated && !recipe.hasError()
    );
    if (toValidate.length === 0) {
      info("No recipes need quality validation");
      return;
    }
    section(`Validating ${toValidate.length} recipes`);
    let passed = 0;
    let failed = 0;
    for (const recipe of toValidate) {
      const result2 = this.validateRecipe(recipe);
      if (result2.passed) {
        recipe.validated = true;
        passed++;
        success(`Recipe ${recipe.id}: Quality validation passed`);
      } else {
        failed++;
        warning(`Recipe ${recipe.id}: Quality issues found`);
        result2.issues.forEach((issue) => warning(`  - ${issue}`));
      }
    }
    result({
      "Quality validations passed": passed,
      "Quality validations failed": failed,
      "Quality pass rate": `${Math.round(passed / toValidate.length * 100)}%`
    });
  }
  // Validate single recipe
  validateRecipe(recipe) {
    const issues = [];
    let score = 0;
    const maxScore = 5;
    if (this.validateTitle(recipe.title)) {
      score++;
    } else {
      issues.push("Title is missing or too short");
    }
    if (this.validateIngredients(recipe.ingredients)) {
      score++;
    } else {
      issues.push("Ingredients list is incomplete or missing quantities");
    }
    if (this.validateInstructions(recipe.instructions)) {
      score++;
    } else {
      issues.push("Instructions are missing or too brief");
    }
    if (this.validateCookingTime(recipe.cookingTime)) {
      score++;
    } else {
      issues.push("Cooking time information is missing or invalid");
    }
    if (this.validateServings(recipe.servings)) {
      score++;
    } else {
      issues.push("Servings information is missing or invalid");
    }
    const qualityScore = score / maxScore;
    const passed = qualityScore >= this.threshold;
    return {
      passed,
      score: qualityScore,
      issues,
      needsCorrection: !passed && issues.length > 0
    };
  }
  // Validate title
  validateTitle(title) {
    return Boolean(title && title.trim().length >= 3);
  }
  // Validate ingredients
  validateIngredients(ingredients) {
    if (!ingredients || ingredients.length === 0) return false;
    const withNames = ingredients.filter((ing) => ing.name?.trim()).length;
    const withQuantities = ingredients.filter(
      (ing) => ing.quantity?.trim() || ing.unit?.trim()
    ).length;
    return withNames >= ingredients.length * 0.8 && // 80% have names
    withQuantities >= ingredients.length * 0.5;
  }
  // Validate instructions
  validateInstructions(instructions) {
    if (!instructions || instructions.length === 0) return false;
    const validInstructions = instructions.filter(
      (instruction) => instruction.trim().length >= 10
    );
    return validInstructions.length >= Math.min(instructions.length * 0.8, 3);
  }
  // Validate cooking time
  validateCookingTime(cookingTime) {
    if (!cookingTime) return false;
    const timeStr = cookingTime.toString().toLowerCase();
    return timeStr.includes("min") || timeStr.includes("h") || /\d+/.test(timeStr);
  }
  // Validate servings
  validateServings(servings) {
    if (!servings) return false;
    const servingStr = servings.toString().toLowerCase();
    return /\d+/.test(servingStr) || servingStr.includes("portion") || servingStr.includes("pers");
  }
};
var validator_default = QualityValidator;

// src/images/processor.ts
import sharp from "sharp";
import { join as join2 } from "path";
var ImageProcessor = class {
  config;
  compression;
  maxSize;
  constructor(config) {
    this.config = config;
    this.compression = config.images.compression;
    this.maxSize = config.images.maxSize;
  }
  // Analyze images in directory
  async analyzeImages(inputDir) {
    section("Analyzing images");
    const images = await listFiles(inputDir, ".jpg");
    const pairs = this.groupImagePairs(images);
    let totalSize = 0;
    let minSize = Infinity;
    let maxSize = 0;
    for (const pair of pairs) {
      const rectoStats = await getFileStats(join2(inputDir, pair.recto));
      const versoStats = await getFileStats(join2(inputDir, pair.verso));
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
      estimatedCost: this.estimateProcessingCost(pairs.length)
    };
    result({
      "Total Images": stats.totalImages,
      "Image Pairs": stats.imagePairs,
      "Total Size (MB)": stats.totalSizeMB,
      "Average Size (KB)": stats.avgSizeKB,
      "Estimated Cost": stats.estimatedCost
    });
    return stats;
  }
  // Optimize images for processing
  async optimizeImages(inputDir, outputDir) {
    section("Optimizing images");
    await ensureDir(outputDir);
    const images = await listFiles(inputDir, ".jpg");
    let processed = 0;
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;
    for (let i = 0; i < images.length; i++) {
      const filename = images[i];
      if (!filename) continue;
      const inputPath = join2(inputDir, filename);
      const outputPath = join2(outputDir, filename);
      progress(i + 1, images.length, `Processing ${filename}`);
      try {
        const beforeStats = await getFileStats(inputPath);
        if (beforeStats) {
          totalSizeBefore += beforeStats.size;
        }
        await this.processImage(inputPath, outputPath);
        const afterStats = await getFileStats(outputPath);
        if (afterStats) {
          totalSizeAfter += afterStats.size;
        }
        processed++;
      } catch (error2) {
        error(
          `Failed to process ${filename}: ${error2.message}`
        );
      }
    }
    const compressionRate = Math.round(
      (1 - totalSizeAfter / totalSizeBefore) * 100
    );
    const resultData = {
      "Images processed": processed,
      "Size before": formatFileSize(totalSizeBefore),
      "Size after": formatFileSize(totalSizeAfter),
      "Compression rate": `${compressionRate}%`
    };
    result(resultData);
    return resultData;
  }
  // Process single image
  async processImage(inputPath, outputPath) {
    await sharp(inputPath).resize(this.maxSize, this.maxSize, {
      fit: "inside",
      withoutEnlargement: true
    }).jpeg({
      quality: this.compression.quality,
      progressive: this.compression.progressive,
      mozjpeg: this.compression.mozjpeg
    }).toFile(outputPath);
  }
  // Group images into pairs (assuming sequential naming)
  groupImagePairs(images) {
    const pairs = [];
    const sortedImages = images.sort();
    for (let i = 0; i < sortedImages.length; i += 2) {
      if (i + 1 < sortedImages.length) {
        const rectoImage = sortedImages[i];
        const versoImage = sortedImages[i + 1];
        if (rectoImage && versoImage) {
          pairs.push({
            recto: rectoImage,
            verso: versoImage
          });
        }
      }
    }
    return pairs;
  }
  // Estimate processing cost
  estimateProcessingCost(pairCount) {
    return Math.round(pairCount * 0.02 * 100) / 100;
  }
};
var processor_default = ImageProcessor;

// src/analysis/service.ts
import { join as join3 } from "path";
var AnalysisService = class {
  config;
  outputPath;
  constructor(config) {
    this.config = config;
    this.outputPath = config.paths.output;
  }
  // Generate comprehensive report
  async generateReport(recipes) {
    section("Generating analysis report");
    const stats = this.calculateStatistics(recipes);
    const report = this.buildReport(stats);
    const jsonPath = join3(this.outputPath, "analysis_report.json");
    await writeJson(jsonPath, report);
    const markdownPath = join3(this.outputPath, "analysis_report.md");
    const markdown = this.generateMarkdown(report);
    await writeText(markdownPath, markdown);
    success(`Analysis report saved to ${jsonPath} and ${markdownPath}`);
    this.logSummary(stats);
    return report;
  }
  // Calculate statistics from recipes
  calculateStatistics(recipes) {
    const total = recipes.length;
    const extracted = recipes.filter((r) => r.extracted).length;
    const validated = recipes.filter((r) => r.validated).length;
    const withErrors = recipes.filter((r) => r.hasError()).length;
    const allIngredients = recipes.filter((r) => r.ingredients).flatMap((r) => r.ingredients).filter((i) => Boolean(i && i.name));
    const ingredientCounts = this.countOccurrences(
      allIngredients.map((i) => i.name.toLowerCase())
    );
    const avgIngredientsPerRecipe = allIngredients.length / Math.max(extracted, 1);
    const cookingTimes = recipes.filter((r) => r.cookingTime).map((r) => r.cookingTime ? this.extractMinutes(r.cookingTime) : 0).filter((t) => t > 0);
    const avgCookingTime = cookingTimes.length > 0 ? Math.round(
      cookingTimes.reduce((a, b) => a + b, 0) / cookingTimes.length
    ) : 0;
    const qualityIssues = recipes.filter(
      (r) => r.extracted && !r.validated
    ).length;
    return {
      total,
      extracted,
      validated,
      withErrors,
      successRate: Math.round(extracted / total * 100),
      qualityRate: Math.round(validated / Math.max(extracted, 1) * 100),
      avgIngredientsPerRecipe: Math.round(avgIngredientsPerRecipe * 10) / 10,
      avgCookingTime,
      qualityIssues,
      topIngredients: Object.entries(ingredientCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, count]) => ({ name, count })),
      errors: recipes.filter((r) => r.hasError()).map((r) => ({
        id: r.id,
        error: r.error || "Unknown error",
        timestamp: r.extractedAt
      }))
    };
  }
  // Build structured report
  buildReport(stats) {
    return {
      metadata: {
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        version: "1.0.0"
      },
      summary: {
        totalRecipes: stats.total,
        successfulExtractions: stats.extracted,
        validatedRecipes: stats.validated,
        failedExtractions: stats.withErrors,
        successRate: `${stats.successRate}%`,
        qualityRate: `${stats.qualityRate}%`
      },
      insights: {
        averageIngredientsPerRecipe: stats.avgIngredientsPerRecipe,
        averageCookingTimeMinutes: stats.avgCookingTime,
        qualityIssuesCount: stats.qualityIssues,
        topIngredients: stats.topIngredients
      },
      issues: {
        extractionErrors: stats.errors,
        qualityIssuesCount: stats.qualityIssues
      }
    };
  }
  // Generate Markdown report
  generateMarkdown(report) {
    return `# Recipe Analysis Report

Generated on: ${new Date(report.metadata.generatedAt).toLocaleString()}

## Summary

- **Total Recipes**: ${report.summary.totalRecipes}
- **Successful Extractions**: ${report.summary.successfulExtractions}
- **Validated Recipes**: ${report.summary.validatedRecipes}
- **Failed Extractions**: ${report.summary.failedExtractions}
- **Success Rate**: ${report.summary.successRate}
- **Quality Rate**: ${report.summary.qualityRate}

## Insights

### Recipe Characteristics
- **Average Ingredients per Recipe**: ${report.insights.averageIngredientsPerRecipe}
- **Average Cooking Time**: ${report.insights.averageCookingTimeMinutes} minutes
- **Quality Issues**: ${report.insights.qualityIssuesCount}

### Top Ingredients
${report.insights.topIngredients.map((ing) => `- ${ing.name}: ${ing.count} recipes`).join("\n")}

## Issues

### Extraction Errors
${report.issues.extractionErrors.length > 0 ? report.issues.extractionErrors.map((err) => `- Recipe ${err.id}: ${err.error}`).join("\n") : "- No extraction errors"}

### Quality Issues
- **Recipes with quality issues**: ${report.issues.qualityIssuesCount}

---
*Report generated by Cuisino Recipe Processor*`;
  }
  // Count occurrences in array
  countOccurrences(items) {
    const counts = {};
    for (const item of items) {
      counts[item] = (counts[item] || 0) + 1;
    }
    return counts;
  }
  // Extract minutes from cooking time string
  extractMinutes(timeStr) {
    const match = timeStr.match(/(\d+)/);
    if (!match || !match[1]) return 0;
    const value = parseInt(match[1], 10);
    if (timeStr.toLowerCase().includes("h")) {
      return value * 60;
    }
    return value;
  }
  // Log summary to console
  logSummary(stats) {
    result({
      "Total recipes": stats.total,
      "Successful extractions": stats.extracted,
      "Validation rate": `${stats.qualityRate}%`,
      "Average cooking time": `${stats.avgCookingTime} min`,
      "Average ingredients": stats.avgIngredientsPerRecipe
    });
  }
};
var service_default2 = AnalysisService;

// src/app.ts
var CuisinoApp = class {
  recipeRepo;
  extractor;
  qualityValidator;
  imageProcessor;
  analysisService;
  constructor() {
    config_default.validate();
    this.recipeRepo = new repository_default(config_default);
    this.extractor = new orchestrator_default(config_default);
    this.qualityValidator = new validator_default(config_default);
    this.imageProcessor = new processor_default(config_default);
    this.analysisService = new service_default2(config_default);
  }
  // Main processing pipeline
  async run() {
    try {
      section("\u{1F373} Cuisino Recipe Processor");
      const startTime = Date.now();
      await this.recipeRepo.ensureDirectories();
      const recipes = await this.loadRecipes();
      if (recipes.length === 0) {
        warning("No recipes found to process");
        return;
      }
      await this.extractor.extractRecipes(recipes);
      this.qualityValidator.validateRecipes(recipes);
      await this.saveResults(recipes);
      await this.analysisService.generateReport(recipes);
      const duration = Math.round((Date.now() - startTime) / 1e3);
      section(`\u2728 Processing completed in ${duration}s`);
    } catch (error2) {
      error("Application failed:", error2.message);
      throw error2;
    }
  }
  // Analyze images only (no processing)
  async analyzeImages() {
    section("\u{1F50D} Image Analysis Mode");
    const inputDir = config_default.paths.recipes + "/compressed";
    return await this.imageProcessor.analyzeImages(inputDir);
  }
  // Optimize images only
  async optimizeImages() {
    section("\u{1F3A8} Image Optimization Mode");
    const inputDir = config_default.paths.recipes + "/uncompressed";
    const outputDir = config_default.paths.recipes + "/compressed";
    return await this.imageProcessor.optimizeImages(inputDir, outputDir);
  }
  // Load recipes from various sources
  async loadRecipes() {
    section("Loading recipes");
    let recipes = await this.recipeRepo.loadExistingRecipes();
    if (recipes.length === 0) {
      recipes = await this.recipeRepo.loadFromImages();
    }
    info(`Loaded ${recipes.length} recipes total`);
    return recipes;
  }
  // Save all results
  async saveResults(recipes) {
    section("Saving results");
    for (const recipe of recipes) {
      if (recipe.extracted || recipe.hasError()) {
        await this.recipeRepo.saveRecipe(recipe);
      }
    }
    const stats = this.calculateStats(recipes);
    await this.recipeRepo.saveAllRecipes(recipes, stats);
    success("All results saved successfully");
  }
  // Calculate processing statistics
  calculateStats(recipes) {
    const extracted = recipes.filter((r) => r.extracted).length;
    const validated = recipes.filter((r) => r.validated).length;
    const errors = recipes.filter((r) => r.hasError()).length;
    return {
      totalRecipes: recipes.length,
      extractedRecipes: extracted,
      validatedRecipes: validated,
      errorCount: errors,
      successRate: `${Math.round(extracted / recipes.length * 100)}%`,
      qualityRate: `${Math.round(validated / Math.max(extracted, 1) * 100)}%`
    };
  }
};
var app_default = CuisinoApp;

// src/main.ts
async function main() {
  const app = new app_default();
  try {
    await app.run();
    process.exit(0);
  } catch (error2) {
    console.error("\u{1F4A5} Application failed:", error2.message);
    process.exit(1);
  }
}
process.on("SIGINT", () => {
  console.log("\n\u{1F6D1} Graceful shutdown requested");
  process.exit(0);
});
process.on("unhandledRejection", (reason) => {
  console.error("\u{1F4A5} Unhandled rejection:", reason);
  process.exit(1);
});
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export {
  main
};
//# sourceMappingURL=main.js.map