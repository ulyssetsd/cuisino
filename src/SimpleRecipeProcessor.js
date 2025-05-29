/**
 * Processeur de recettes simplifié
 * Responsabilité unique : Orchestration du traitement
 */
const path = require('path');
const OpenAI = require('openai');
const ConfigManager = require('./infrastructure/persistence/ConfigManager');
const FileManager = require('./infrastructure/persistence/FileManager');
const ErrorManager = require('./infrastructure/persistence/ErrorManager');
const MetadataManager = require('./application/services/MetadataManager');
const ProcessingAnalyzer = require('./application/services/ProcessingAnalyzer');
const ImageProcessor = require('./infrastructure/external/ImageProcessor');
const SimpleRecipeExtractor = require('./SimpleRecipeExtractor');
const DataQualityValidator = require('./domain/services/DataQualityValidator');
const DataQualityCorrector = require('./application/services/DataQualityCorrector');

class SimpleRecipeProcessor {
    constructor() {
        // Charger la configuration
        this.config = ConfigManager.getConfig();
        this.paths = ConfigManager.getPaths();
        const openaiConfig = ConfigManager.getOpenAIConfig();

        // Initialiser les services
        this.openai = new OpenAI({ apiKey: openaiConfig.apiKey });
        this.fileManager = new FileManager(this.paths);
        this.errorManager = new ErrorManager(this.config);
        this.metadataManager = new MetadataManager(this.config);
        this.imageProcessor = new ImageProcessor();
        this.recipeExtractor = new SimpleRecipeExtractor(this.openai, openaiConfig);
        
        // Services de qualité des données
        this.dataQualityValidator = new DataQualityValidator(this.config);
        this.dataQualityCorrector = new DataQualityCorrector(this.openai, this.config);
        this.processingAnalyzer = new ProcessingAnalyzer(this.dataQualityValidator);
    }

    /**
     * Initialise les dossiers et démarre le traitement
     */
    async processAllRecipes() {
        await this.fileManager.ensureDirectories();
        
        console.log('📂 Lecture des images...');
        const images = await this.imageProcessor.getImagePairs(this.paths.input);
        console.log(`📸 ${images.length} paires d'images trouvées`);

        // Charger les recettes existantes
        const { existingRecipes, existingErrors } = await this.fileManager.loadExistingRecipes();
        console.log(`📚 ${existingRecipes.length} recettes existantes trouvées`);

        // Analyser ce qui doit être traité
        const imagesToProcess = await this.processingAnalyzer.determineImagesToProcess(images, existingRecipes);
        console.log(`🔄 ${imagesToProcess.length} images à traiter`);

        if (imagesToProcess.length === 0) {
            console.log('✨ Toutes les recettes sont déjà à jour et de bonne qualité !');
            return existingRecipes;
        }

        // Traiter les recettes
        const startTime = Date.now();
        const { recipes, errors } = await this.processRecipes(images, imagesToProcess, existingRecipes, existingErrors);

        // Sauvegarder et finaliser
        await this.finalizeBatch(recipes, errors, images.length, startTime);
        
        return recipes;
    }

    /**
     * Traite une liste de recettes
     */
    async processRecipes(allImages, imagesToProcess, existingRecipes, existingErrors) {
        const recipes = [...existingRecipes];
        const errors = [...existingErrors];

        for (let i = 0; i < imagesToProcess.length; i++) {
            const { imageIndex, recto, verso, reason } = imagesToProcess[i];
            
            console.log(`\n🔄 Traitement de la recette ${imageIndex + 1}/${allImages.length} (${i + 1}/${imagesToProcess.length})`);
            console.log(`   Recto: ${path.basename(recto)}`);
            console.log(`   Verso: ${path.basename(verso)}`);
            console.log(`   Raison: ${reason}`);

            try {
                const recipe = await this.processOneRecipe(recto, verso, imageIndex + 1);
                
                if (recipe) {
                    // Ajouter métadonnées et sauvegarder
                    const enrichedRecipe = this.metadataManager.addMetadata(recipe, recto, verso, imageIndex + 1);
                    recipes[imageIndex] = enrichedRecipe;
                    
                    const filename = await this.fileManager.saveRecipe(enrichedRecipe, imageIndex + 1, this.config.output.prettyPrint);
                    console.log(`   ✅ Recette mise à jour: ${filename}`);
                    
                    // Supprimer l'erreur existante si elle existait
                    this.errorManager.removeError(errors, imageIndex + 1);
                } else {
                    this.handleRecipeFailure(errors, imageIndex + 1, recto, verso, 'Échec de l\'extraction');
                }
            } catch (error) {
                this.handleRecipeFailure(errors, imageIndex + 1, recto, verso, error.message);
            }

            // Pause entre les requêtes (sauf pour la dernière)
            if (i < imagesToProcess.length - 1) {
                await this.errorManager.delayBetweenOperations();
            }
        }

        return { recipes, errors };
    }

    /**
     * Traite une seule recette avec toute la logique de qualité
     */
    async processOneRecipe(rectoPath, versoPath, recipeIndex) {
        return await this.errorManager.executeWithRetry(async () => {
            // Extraction de base
            let recipe = await this.recipeExtractor.extractRecipe(rectoPath, versoPath);
            
            // Validation de base
            this.metadataManager.validateRecipe(recipe);
            
            // Validation et correction de la qualité des données
            recipe = await this.processDataQuality(recipe, rectoPath, versoPath);
            
            return recipe;
        });
    }

    /**
     * Gère la validation et correction de la qualité des données
     */
    async processDataQuality(recipe, rectoPath, versoPath) {
        // Validation de la qualité des données
        const validationResult = this.dataQualityValidator.validateRecipe(recipe);
        let normalizedRecipe = validationResult.normalizedRecipe;

        // Correction automatique si nécessaire et activée
        if (validationResult.needsCorrection && this.config?.dataQuality?.autoCorrection) {
            console.log('   🔧 Correction automatique des problèmes détectés...');
            try {
                normalizedRecipe = await this.dataQualityCorrector.correctRecipeData(
                    normalizedRecipe, 
                    validationResult.issues, 
                    rectoPath, 
                    versoPath
                );
                console.log('   ✅ Données corrigées avec succès');
            } catch (error) {
                console.log(`   ⚠️  Échec de la correction: ${error.message}`);
                console.log('   📝 Conservation des données normalisées');
            }
        } else if (validationResult.needsCorrection) {
            console.log('   ⚠️  Problèmes détectés mais auto-correction désactivée');
        }

        return normalizedRecipe;
    }

    /**
     * Gère l'échec d'une recette
     */
    handleRecipeFailure(errors, recipeIndex, rectoPath, versoPath, errorMessage) {
        console.error(`   ❌ ${errorMessage}`);
        
        const fallbackRecipe = this.metadataManager.createFallbackRecipe(rectoPath, versoPath, new Error(errorMessage));
        if (fallbackRecipe) {
            // Si fallback activé, on continue quand même
            return fallbackRecipe;
        }
        
        // Sinon on enregistre l'erreur
        this.errorManager.updateError(errors, recipeIndex, path.basename(rectoPath), path.basename(versoPath), errorMessage);
    }

    /**
     * Finalise le traitement en sauvegardant tout
     */
    async finalizeBatch(recipes, errors, totalImages, startTime) {
        const processingTime = Math.round((Date.now() - startTime) / 1000);
        
        // Créer le résumé
        const summary = this.metadataManager.createProcessingSummary(recipes, errors, processingTime, totalImages);
        
        // Sauvegarder le fichier consolidé
        await this.fileManager.saveAllRecipes(summary, this.config.output.prettyPrint);
        
        // Générer le résumé Markdown si configuré
        if (this.config.output.generateSummary) {
            await this.fileManager.generateSummaryFile(summary);
        }

        // Afficher les résultats
        this.logResults(recipes, errors, processingTime);
    }

    /**
     * Affiche les résultats finaux
     */
    logResults(recipes, errors, processingTime) {
        console.log(`\n🎉 Traitement terminé !`);
        console.log(`✅ ${recipes.length} recettes traitées avec succès`);
        if (errors.length > 0) {
            console.log(`❌ ${errors.length} erreurs rencontrées`);
        }
        console.log(`⏱️ Temps total: ${processingTime}s`);
        console.log(`📁 Résultats sauvegardés dans : ${this.paths.output}`);
    }
}

module.exports = SimpleRecipeProcessor;
