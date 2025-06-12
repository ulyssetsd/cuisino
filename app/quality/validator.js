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
} from '../shared/logger';

class QualityValidator {
    constructor(config) {
        this.config = config;
        this.threshold = config.quality.validationThreshold;
    }

    // Validate all recipes that need quality check
    validateRecipes(recipes) {
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
    validateRecipe(recipe) {
        const issues = [];
        let score = 0;
        const maxScore = 10;

        // Title validation
        if (this.validateTitle(recipe.title)) {
            score += 2;
        } else {
            issues.push('Title is missing or too short');
        }

        // Ingredients validation
        const ingredientScore = this.validateIngredients(recipe.ingredients);
        score += ingredientScore.score;
        issues.push(...ingredientScore.issues);

        // Instructions validation
        const instructionScore = this.validateInstructions(recipe.instructions);
        score += instructionScore.score;
        issues.push(...instructionScore.issues);

        // Cooking time validation
        if (this.validateCookingTime(recipe.cookingTime)) {
            score += 1;
        } else {
            issues.push('Cooking time is missing or invalid');
        }

        // Servings validation
        if (this.validateServings(recipe.servings)) {
            score += 1;
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
    validateTitle(title) {
        return title && typeof title === 'string' && title.trim().length >= 3;
    }

    // Validate ingredients
    validateIngredients(ingredients) {
        const issues = [];
        let score = 0;
        const maxScore = 3;

        if (!ingredients || !Array.isArray(ingredients)) {
            issues.push('Ingredients list is missing or invalid');
            return { score: 0, issues };
        }

        if (ingredients.length === 0) {
            issues.push('No ingredients found');
            return { score: 0, issues };
        }

        // Check if we have enough ingredients
        if (ingredients.length >= 3) {
            score += 1;
        } else {
            issues.push('Very few ingredients (less than 3)');
        }

        // Check ingredient structure
        const validIngredients = ingredients.filter(
            (ing) =>
                ing &&
                ing.name &&
                typeof ing.name === 'string' &&
                ing.name.trim().length > 0
        );

        if (validIngredients.length >= ingredients.length * 0.8) {
            score += 1;
        } else {
            issues.push('Many ingredients have invalid or missing names');
        }

        // Check for quantities
        const withQuantities = ingredients.filter(
            (ing) => ing.quantity && ing.quantity.toString().trim().length > 0
        );

        if (withQuantities.length >= ingredients.length * 0.7) {
            score += 1;
        } else {
            issues.push('Many ingredients are missing quantities');
        }

        return { score, issues };
    }

    // Validate instructions
    validateInstructions(instructions) {
        const issues = [];
        let score = 0;
        const maxScore = 3;

        if (!instructions || !Array.isArray(instructions)) {
            issues.push('Instructions list is missing or invalid');
            return { score: 0, issues };
        }

        if (instructions.length === 0) {
            issues.push('No instructions found');
            return { score: 0, issues };
        }

        // Check if we have enough steps
        if (instructions.length >= 3) {
            score += 1;
        } else {
            issues.push('Very few cooking steps (less than 3)');
        }

        // Check instruction content
        const validInstructions = instructions.filter(
            (inst) =>
                inst && typeof inst === 'string' && inst.trim().length >= 10
        );

        if (validInstructions.length >= instructions.length * 0.8) {
            score += 1;
        } else {
            issues.push('Many instructions are too short or invalid');
        }

        // Check for detailed instructions
        const detailedInstructions = instructions.filter(
            (inst) => inst && inst.length >= 30
        );

        if (detailedInstructions.length >= instructions.length * 0.5) {
            score += 1;
        } else {
            issues.push('Instructions lack detail');
        }

        return { score, issues };
    }

    // Validate cooking time
    validateCookingTime(cookingTime) {
        if (!cookingTime) return false;

        const timeStr = cookingTime.toString().toLowerCase();
        return (
            timeStr.includes('min') ||
            timeStr.includes('h') ||
            /\d+/.test(timeStr)
        );
    }

    // Validate servings
    validateServings(servings) {
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
