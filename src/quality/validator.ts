/**
 * Simplified Quality Validator
 * Clean validation logic for recipe data
 */
import {
    info,
    section,
    success,
    warning,
    result as _result,
} from '../shared/logger.js';
import type {
    AppConfig,
    QualityValidationResult,
    RecipeIngredient,
} from '../types/index.js';
import type Recipe from '../recipes/recipe.js';

class QualityValidator {
    private readonly config: AppConfig;
    private readonly threshold: number;

    constructor(config: AppConfig) {
        this.config = config;
        this.threshold = config.quality.validationThreshold;
    }

    // Validate all recipes that need quality check
    validateRecipes(recipes: Recipe[]): void {
        const toValidate = recipes.filter(
            (recipe) =>
                recipe.extracted && !recipe.validated && !recipe.hasError()
        );

        if (toValidate.length === 0) {
            info('No recipes need quality validation');
            return;
        }

        section(`Validating ${toValidate.length} recipes`);

        let passed = 0;
        let failed = 0;

        for (const recipe of toValidate) {
            const result = this.validateRecipe(recipe);

            if (result.passed) {
                recipe.validated = true;
                passed++;
                success(`Recipe ${recipe.id}: Quality validation passed`);
            } else {
                failed++;
                warning(`Recipe ${recipe.id}: Quality issues found`);
                result.issues.forEach((issue) => warning(`  - ${issue}`));
            }
        }

        _result({
            'Quality validations passed': passed,
            'Quality validations failed': failed,
            'Quality pass rate': `${Math.round((passed / toValidate.length) * 100)}%`,
        });
    }

    // Validate single recipe
    validateRecipe(recipe: Recipe): QualityValidationResult {
        const issues: string[] = [];
        let score = 0;
        const maxScore = 5;

        // Validate title
        if (this.validateTitle(recipe.title)) {
            score++;
        } else {
            issues.push('Title is missing or too short');
        }

        // Validate ingredients
        if (this.validateIngredients(recipe.ingredients)) {
            score++;
        } else {
            issues.push('Ingredients list is incomplete or missing quantities');
        }

        // Validate instructions
        if (this.validateInstructions(recipe.instructions)) {
            score++;
        } else {
            issues.push('Instructions are missing or too brief');
        }

        // Validate cooking time
        if (this.validateCookingTime(recipe.cookingTime)) {
            score++;
        } else {
            issues.push('Cooking time information is missing or invalid');
        }

        // Validate servings
        if (this.validateServings(recipe.servings)) {
            score++;
        } else {
            issues.push('Servings information is missing or invalid');
        }

        const qualityScore = score / maxScore;
        const passed = qualityScore >= this.threshold;

        return {
            passed,
            score: qualityScore,
            issues,
            needsCorrection: !passed && issues.length > 0,
        };
    }

    // Validate title
    private validateTitle(title?: string): boolean {
        return Boolean(title && title.trim().length >= 3);
    }

    // Validate ingredients
    private validateIngredients(ingredients: RecipeIngredient[]): boolean {
        if (!ingredients || ingredients.length === 0) return false;

        // Check if most ingredients have names and some have quantities
        const withNames = ingredients.filter((ing) => ing.name?.trim()).length;
        const withQuantities = ingredients.filter(
            (ing) => ing.quantity?.trim() || ing.unit?.trim()
        ).length;

        return (
            withNames >= ingredients.length * 0.8 && // 80% have names
            withQuantities >= ingredients.length * 0.5 // 50% have quantities
        );
    }

    // Validate instructions
    private validateInstructions(instructions: string[]): boolean {
        if (!instructions || instructions.length === 0) return false;

        // Check if instructions are detailed enough
        const validInstructions = instructions.filter(
            (instruction) => instruction.trim().length >= 10
        );

        return (
            validInstructions.length >= Math.min(instructions.length * 0.8, 3)
        );
    }

    // Validate cooking time
    private validateCookingTime(cookingTime?: string): boolean {
        if (!cookingTime) return false;

        const timeStr = cookingTime.toString().toLowerCase();
        return (
            timeStr.includes('min') ||
            timeStr.includes('h') ||
            /\d+/.test(timeStr)
        );
    }

    // Validate servings
    private validateServings(servings?: string | number): boolean {
        if (!servings) return false;

        const servingStr = servings.toString().toLowerCase();
        return (
            /\d+/.test(servingStr) ||
            servingStr.includes('portion') ||
            servingStr.includes('pers')
        );
    }
}

export default QualityValidator;
