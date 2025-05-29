/**
 * RecipeService - Service de gestion des recettes
 * Responsabilité: Orchestrer les opérations sur les recettes (extraction, qualité, sauvegarde)
 */
const OpenAI = require('openai');
const ConfigManager = require('../infrastructure/persistence/ConfigManager');
const RecipeRepository = require('../infrastructure/RecipeRepository');
const OpenAIExtractionService = require('./OpenAIExtractionService');
const DataQualityValidator = require('../domain/services/DataQualityValidator');
const DataQualityCorrector = require('../application/services/DataQualityCorrector');
const ErrorManager = require('../infrastructure/persistence/ErrorManager');

class RecipeService {
    constructor() {
        // Configuration
        this.config = ConfigManager.getConfig();
        this.paths = ConfigManager.getPaths();
        const openaiConfig = ConfigManager.getOpenAIConfig();

        // Services
        this.repository = new RecipeRepository(this.paths);
        this.openai = new OpenAI({ apiKey: openaiConfig.apiKey });
        this.extractionService = new OpenAIExtractionService(this.openai, openaiConfig);
        this.qualityValidator = new DataQualityValidator(this.config);
        this.qualityCorrector = new DataQualityCorrector(this.openai, this.config);
        this.errorManager = new ErrorManager(this.config);
    }

    /**
     * Point d'entrée principal - traite toutes les recettes
     */
    async processAllRecipes() {
        await this.repository.ensureDirectories();
        
        console.log('🍳 Démarrage du traitement des recettes...\n');

        // 1. Charger toutes les recettes depuis les sources
        const recipes = await this.repository.loadAllRecipes();
        
        // 2. Analyser ce qui doit être fait
        const analysis = this.analyzeRecipes(recipes);
        this.logAnalysis(analysis);

        if (analysis.toExtract.length === 0 && analysis.toValidate.length === 0) {
            console.log('✨ Toutes les recettes sont déjà à jour et de bonne qualité !');
            return recipes;
        }

        // 3. Traiter les extractions nécessaires
        const startTime = Date.now();
        await this.processExtractions(analysis.toExtract);

        // 4. Traiter les validations qualité
        await this.processQualityValidations(analysis.toValidate);

        // 5. Sauvegarder et finaliser
        await this.saveAllResults(recipes, startTime);

        return recipes;
    }

    /**
     * Analyse les recettes pour déterminer les actions nécessaires
     */
    analyzeRecipes(recipes) {
        const toExtract = [];
        const toValidate = [];
        const upToDate = [];

        recipes.forEach(recipe => {
            if (recipe.needsExtraction()) {
                toExtract.push(recipe);
            } else if (recipe._needsQualityCheck) {
                toValidate.push(recipe);
            } else {
                upToDate.push(recipe);
            }
        });

        return { toExtract, toValidate, upToDate, total: recipes.length };
    }

    /**
     * Affiche l'analyse des recettes
     */
    logAnalysis(analysis) {
        console.log(`📊 Analyse des ${analysis.total} recettes:`);
        console.log(`   🔄 ${analysis.toExtract.length} à extraire`);
        console.log(`   🔍 ${analysis.toValidate.length} à valider (qualité)`);
        console.log(`   ✅ ${analysis.upToDate.length} à jour\n`);
    }

    /**
     * Traite les extractions nécessaires
     */
    async processExtractions(recipesToExtract) {
        if (recipesToExtract.length === 0) return;

        console.log(`🤖 Extraction de ${recipesToExtract.length} recettes...\n`);

        for (let i = 0; i < recipesToExtract.length; i++) {
            const recipe = recipesToExtract[i];
            
            console.log(`📸 Recette ${recipe.id}/${recipesToExtract.length} (${i + 1}/${recipesToExtract.length})`);

            try {
                // Extraction avec retry automatique
                await this.errorManager.executeWithRetry(async () => {
                    await this.extractionService.extractRecipe(recipe);
                });

                // Validation de base
                const validation = recipe.isValid();
                if (!validation.valid) {
                    console.log(`   ⚠️ Validation échouée: ${validation.errors.join(', ')}`);
                }

                // Sauvegarder immédiatement
                await this.repository.saveRecipe(recipe, this.config.output.prettyPrint);
                console.log(`   💾 Sauvegardée: recipe_${String(recipe.id).padStart(3, '0')}.json`);

            } catch (error) {
                console.error(`   ❌ Échec définitif: ${error.message}`);
                // La recette garde son état d'erreur
            }

            // Pause entre les requêtes (sauf pour la dernière)
            if (i < recipesToExtract.length - 1) {
                await this.errorManager.delayBetweenOperations();
            }
        }
    }

    /**
     * Traite les validations qualité
     */
    async processQualityValidations(recipesToValidate) {
        if (recipesToValidate.length === 0) return;

        console.log(`\n🔍 Validation qualité de ${recipesToValidate.length} recettes...\n`);

        for (const recipe of recipesToValidate) {
            console.log(`🔍 Validation qualité recette ${recipe.id}: "${recipe.title}"`);

            try {
                // 1. Normalisation automatique (sans API)
                recipe.normalizeData(this.qualityValidator);

                // 2. Validation de la qualité
                const validationResult = recipe.validateDataQuality(this.qualityValidator);

                if (!validationResult.needsCorrection) {
                    console.log(`   ✅ Qualité satisfaisante`);
                    recipe._needsQualityCheck = false;
                } else {
                    console.log(`   ⚠️ ${validationResult.issues.length} problème(s) détecté(s)`);

                    // 3. Correction automatique si activée
                    if (this.config?.dataQuality?.autoCorrection) {
                        console.log('   🔧 Correction automatique...');
                        try {
                            await recipe.applyQualityCorrection(this.qualityCorrector, validationResult.issues);
                            console.log('   ✅ Données corrigées avec succès');
                            recipe._needsQualityCheck = false;
                        } catch (error) {
                            console.log(`   ⚠️ Échec de la correction: ${error.message}`);
                            // On garde les données normalisées
                        }
                    }
                }

                // Sauvegarder les modifications
                await this.repository.saveRecipe(recipe, this.config.output.prettyPrint);

            } catch (error) {
                console.error(`   ❌ Erreur validation: ${error.message}`);
            }
        }
    }

    /**
     * Sauvegarde tous les résultats finaux
     */
    async saveAllResults(recipes, startTime) {
        const processingTime = Math.round((Date.now() - startTime) / 1000);
        
        // Statistiques
        const stats = this.calculateStats(recipes, processingTime);
        
        // Sauvegarder le fichier consolidé
        await this.repository.saveAllRecipes(recipes, stats, this.config.output.prettyPrint);
        
        // Générer le résumé si configuré
        if (this.config.output.generateSummary) {
            await this.generateSummaryFile(recipes, stats);
        }

        // Afficher les résultats
        this.logFinalResults(stats);
    }

    /**
     * Calcule les statistiques finales
     */
    calculateStats(recipes, processingTime) {
        const extracted = recipes.filter(r => r.isExtracted() && !r.hasExtractionError());
        const errors = recipes.filter(r => r.hasExtractionError());

        return {
            totalRecipes: extracted.length,
            totalErrors: errors.length,
            successRate: `${Math.round((extracted.length / recipes.length) * 100)}%`,
            processingTimeSeconds: processingTime,
            processedAt: new Date().toISOString(),
            source: 'HelloFresh',
            errors: errors.map(r => ({
                pair: r.id,
                recto: r.extractionError?.originalFiles?.recto || 'inconnu',
                verso: r.extractionError?.originalFiles?.verso || 'inconnu',
                error: r.extractionError?.message || 'Erreur inconnue',
                lastAttempt: r.extractionError?.timestamp
            }))
        };
    }

    /**
     * Génère le fichier de résumé Markdown
     */
    async generateSummaryFile(recipes, stats) {
        const FileManager = require('../infrastructure/persistence/FileManager');
        const fileManager = new FileManager(this.paths);
        
        const summary = {
            recipes: recipes.map(r => r.toJson()),
            metadata: stats
        };
        
        await fileManager.generateSummaryFile(summary);
    }

    /**
     * Affiche les résultats finaux
     */
    logFinalResults(stats) {
        console.log(`\n🎉 Traitement terminé !`);
        console.log(`✅ ${stats.totalRecipes} recettes traitées avec succès`);
        if (stats.totalErrors > 0) {
            console.log(`❌ ${stats.totalErrors} erreurs rencontrées`);
        }
        console.log(`⏱️ Temps total: ${stats.processingTimeSeconds}s`);
        console.log(`📁 Résultats sauvegardés dans : ${this.paths.output}`);
    }
}

module.exports = RecipeService;
