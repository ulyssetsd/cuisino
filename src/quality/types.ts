/**
 * Quality Validation Types
 * Interfaces for quality validation results and processes
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface QualityValidationResult {
    passed: boolean;
    score: number;
    issues: string[];
    needsCorrection: boolean;
}
