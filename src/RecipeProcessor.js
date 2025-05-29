const fs = require('fs-extra');
const path = require('path');
const OpenAI = require('openai');
const ImageProcessor = require('./ImageProcessor');
const RecipeExtractor = require('./RecipeExtractor');

class RecipeProcessor {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
          this.inputDir = process.env.INPUT_DIR || './recipes/compressed';
        this.outputDir = process.env.OUTPUT_DIR || './output';
        this.tempDir = process.env.TEMP_DIR || './temp';
        
        // Charger la configuration AVANT de créer les autres instances
        this.config = this.loadConfig();
        
        this.imageProcessor = new ImageProcessor();
        this.recipeExtractor = new RecipeExtractor(this.openai, this.config);
        
        // Créer les dossiers nécessaires
        this.ensureDirectories();
    }
    
    loadConfig() {
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            if (fs.existsSync(configPath)) {
                return fs.readJsonSync(configPath);
            }
        } catch (error) {
            console.log('⚠️  Impossible de charger config.json, utilisation des valeurs par défaut');
        }
        
        // Configuration par défaut
        return {
            processing: {
                batchSize: 5,
                delayBetweenRequests: 2000,
                retryAttempts: 3,
                retryDelay: 5000
            },
            output: {
                prettyPrint: true,
                includeMetadata: true,
                generateSummary: true
            },
            extraction: {
                includeOriginalFilenames: true,
                validateJson: true,
                fallbackOnError: true
            }
        };
    }
    
    async ensureDirectories() {
        await fs.ensureDir(this.outputDir);
        await fs.ensureDir(this.tempDir);
    }    async processAllRecipes() {
        console.log('📂 Lecture des images...');
        
        // Lire toutes les images et les trier par timestamp
        const images = await this.imageProcessor.getImagePairs(this.inputDir);
        
        console.log(`📸 ${images.length} paires d'images trouvées`);
        
        // Charger les recettes existantes pour traitement incrémental
        const { existingRecipes, existingErrors } = await this.loadExistingRecipes();
        console.log(`📚 ${existingRecipes.length} recettes existantes trouvées`);
        
        const recipes = [...existingRecipes];
        const errors = [...existingErrors];
        const startTime = Date.now();
        
        // Déterminer quelles images nécessitent un traitement
        const imagesToProcess = await this.determineImagesToProcess(images, existingRecipes);
        console.log(`🔄 ${imagesToProcess.length} images à traiter (nouvelles ou avec problèmes de qualité)`);
        
        if (imagesToProcess.length === 0) {
            console.log('✨ Toutes les recettes sont déjà à jour et de bonne qualité !');
            return existingRecipes;
        }
        
        for (let i = 0; i < imagesToProcess.length; i++) {
            const { imageIndex, recto, verso, reason } = imagesToProcess[i];
            
            console.log(`\n🔄 Traitement de la recette ${imageIndex + 1}/${images.length} (${i + 1}/${imagesToProcess.length})`);
            console.log(`   Recto: ${path.basename(recto)}`);
            console.log(`   Verso: ${path.basename(verso)}`);
            console.log(`   Raison: ${reason}`);
            
            try {
                const recipe = await this.processRecipeWithRetry(recto, verso, imageIndex + 1);
                
                if (recipe) {
                    // Ajouter les métadonnées si configuré
                    if (this.config.extraction.includeOriginalFilenames) {
                        recipe.metadata = {
                            originalFiles: {
                                recto: path.basename(recto),
                                verso: path.basename(verso)
                            },
                            processedAt: new Date().toISOString(),
                            recipeIndex: imageIndex + 1
                        };
                    }
                    
                    // Mettre à jour ou ajouter la recette
                    recipes[imageIndex] = recipe;
                    
                    // Sauvegarder chaque recette individuellement
                    const filename = `recipe_${String(imageIndex + 1).padStart(3, '0')}.json`;
                    const filepath = path.join(this.outputDir, filename);
                    const jsonOptions = this.config.output.prettyPrint ? { spaces: 2 } : {};
                    await fs.writeJson(filepath, recipe, jsonOptions);
                    
                    console.log(`   ✅ Recette mise à jour: ${filename}`);
                    
                    // Supprimer l'erreur existante si elle existait
                    const errorIndex = errors.findIndex(e => e.pair === imageIndex + 1);
                    if (errorIndex !== -1) {
                        errors.splice(errorIndex, 1);
                    }
                } else {
                    const errorMsg = `Échec de l'extraction pour la paire ${imageIndex + 1}`;
                    console.log(`   ⚠️ ${errorMsg}`);
                    this.updateError(errors, imageIndex + 1, path.basename(recto), path.basename(verso), errorMsg);
                }
            } catch (error) {
                const errorMsg = `Erreur lors du traitement de la paire ${imageIndex + 1}: ${error.message}`;
                console.error(`   ❌ ${errorMsg}`);
                this.updateError(errors, imageIndex + 1, path.basename(recto), path.basename(verso), error.message);
            }
            
            // Délai entre les requêtes pour éviter la limitation de taux
            if (i < imagesToProcess.length - 1) {
                console.log(`   ⏱️ Pause de ${this.config.processing.delayBetweenRequests}ms...`);
                await this.sleep(this.config.processing.delayBetweenRequests);
            }
        }
        
        // Sauvegarder toutes les recettes dans un fichier global
        const processingTime = Math.round((Date.now() - startTime) / 1000);
        const summary = {
            recipes,
            metadata: {
                totalRecipes: recipes.length,
                totalErrors: errors.length,
                successRate: `${Math.round((recipes.length / images.length) * 100)}%`,
                processingTimeSeconds: processingTime,
                processedAt: new Date().toISOString(),
                source: 'HelloFresh',
                errors: errors
            }
        };
        
        const allRecipesPath = path.join(this.outputDir, 'all_recipes.json');
        const jsonOptions = this.config.output.prettyPrint ? { spaces: 2 } : {};
        await fs.writeJson(allRecipesPath, summary, jsonOptions);
        
        // Générer un résumé si configuré
        if (this.config.output.generateSummary) {
            await this.generateProcessingSummary(summary);
        }
        
        console.log(`\n🎉 Traitement terminé !`);
        console.log(`✅ ${recipes.length} recettes traitées avec succès`);
        if (errors.length > 0) {
            console.log(`❌ ${errors.length} erreurs rencontrées`);
        }
        console.log(`⏱️ Temps total: ${processingTime}s`);
        console.log(`📁 Résultats sauvegardés dans : ${this.outputDir}`);
        
        return recipes;
    }
    
    async processRecipeWithRetry(rectoPath, versoPath, recipeIndex) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.config.processing.retryAttempts; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`   🔄 Tentative ${attempt}/${this.config.processing.retryAttempts}...`);
                    await this.sleep(this.config.processing.retryDelay);
                }
                
                const recipe = await this.recipeExtractor.extractRecipe(rectoPath, versoPath);
                
                if (this.config.extraction.validateJson && recipe) {
                    this.validateRecipe(recipe);
                }
                
                return recipe;
                
            } catch (error) {
                lastError = error;
                console.log(`   ⚠️ Tentative ${attempt} échouée: ${error.message}`);
                
                if (attempt === this.config.processing.retryAttempts) {
                    console.log(`   ❌ Échec après ${this.config.processing.retryAttempts} tentatives`);
                }
            }
        }
        
        if (this.config.extraction.fallbackOnError) {
            return this.createFallbackRecipe(rectoPath, versoPath, lastError);
        }
        
        throw lastError;
    }
    
    validateRecipe(recipe) {
        const requiredFields = ['title', 'source'];
        const missingFields = requiredFields.filter(field => !recipe[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Champs requis manquants: ${missingFields.join(', ')}`);
        }
        
        if (recipe.ingredients && !Array.isArray(recipe.ingredients)) {
            throw new Error('Le champ ingredients doit être un tableau');
        }
        
        if (recipe.steps && !Array.isArray(recipe.steps)) {
            throw new Error('Le champ steps doit être un tableau');
        }
    }
    
    createFallbackRecipe(rectoPath, versoPath, error) {
        console.log('   🛡️ Création d\'une recette de fallback...');
        
        return {
            title: `Recette non extraite - ${path.basename(rectoPath)}`,
            subtitle: "",
            duration: "",
            difficulty: null,
            servings: null,
            ingredients: [],
            allergens: [],
            steps: [],
            nutrition: {},
            tips: [],
            tags: ["Erreur d'extraction"],
            image: "",
            source: "HelloFresh",
            extractionError: {
                message: error.message,
                timestamp: new Date().toISOString(),
                originalFiles: {
                    recto: path.basename(rectoPath),
                    verso: path.basename(versoPath)
                }
            }
        };
    }
    
    async generateProcessingSummary(summary) {
        const summaryText = `# Résumé du traitement des recettes
        
Traitement effectué le: ${new Date(summary.metadata.processedAt).toLocaleString('fr-FR')}

## Statistiques
- **Total de recettes traitées**: ${summary.metadata.totalRecipes}
- **Erreurs**: ${summary.metadata.totalErrors}
- **Taux de réussite**: ${summary.metadata.successRate}
- **Temps de traitement**: ${summary.metadata.processingTimeSeconds} secondes

## Recettes extraites
${summary.recipes.map((recipe, i) => `${i + 1}. ${recipe.title}`).join('\n')}

${summary.metadata.errors.length > 0 ? `
## Erreurs rencontrées
${summary.metadata.errors.map(err => `- Paire ${err.pair} (${err.recto} / ${err.verso}): ${err.error}`).join('\n')}
` : ''}

## Fichiers générés
- \`all_recipes.json\`: Fichier consolidé avec toutes les recettes
- \`recipe_001.json\` à \`recipe_${String(summary.metadata.totalRecipes).padStart(3, '0')}.json\`: Recettes individuelles
`;
        
        const summaryPath = path.join(this.outputDir, 'processing_summary.md');
        await fs.writeFile(summaryPath, summaryText, 'utf8');
        console.log(`📄 Résumé généré: processing_summary.md`);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Charge les recettes existantes depuis le fichier all_recipes.json
     */
    async loadExistingRecipes() {
        const allRecipesPath = path.join(this.outputDir, 'all_recipes.json');
        
        if (!fs.existsSync(allRecipesPath)) {
            console.log('📝 Aucun fichier de recettes existant trouvé - traitement complet');
            return { existingRecipes: [], existingErrors: [] };
        }
        
        try {
            const data = await fs.readJson(allRecipesPath);
            const recipes = data.recipes || [];
            const errors = data.metadata?.errors || [];
            
            console.log(`📚 ${recipes.length} recettes chargées depuis all_recipes.json`);
            return { existingRecipes: recipes, existingErrors: errors };
        } catch (error) {
            console.log(`⚠️ Erreur lors du chargement des recettes existantes: ${error.message}`);
            return { existingRecipes: [], existingErrors: [] };
        }
    }
    
    /**
     * Détermine quelles images nécessitent un traitement basé sur la qualité des données
     */
    async determineImagesToProcess(images, existingRecipes) {
        const imagesToProcess = [];
        
        for (let i = 0; i < images.length; i++) {
            const { recto, verso } = images[i];
            const existingRecipe = existingRecipes[i];
            
            // Si pas de recette existante, traiter
            if (!existingRecipe) {
                imagesToProcess.push({
                    imageIndex: i,
                    recto,
                    verso,
                    reason: 'Nouvelle recette'
                });
                continue;
            }
            
            // Vérifier si les fichiers sources correspondent
            const shouldReprocess = await this.shouldReprocessRecipe(existingRecipe, recto, verso, i);
            
            if (shouldReprocess.reprocess) {
                imagesToProcess.push({
                    imageIndex: i,
                    recto,
                    verso,
                    reason: shouldReprocess.reason
                });
            }
        }
        
        return imagesToProcess;
    }
    
    /**
     * Détermine si une recette doit être retraitée
     */
    async shouldReprocessRecipe(recipe, rectoPath, versoPath, index) {
        // Vérifier si les fichiers sources correspondent
        if (recipe.metadata?.originalFiles) {
            const currentRecto = path.basename(rectoPath);
            const currentVerso = path.basename(versoPath);
            const existingRecto = recipe.metadata.originalFiles.recto;
            const existingVerso = recipe.metadata.originalFiles.verso;
            
            if (currentRecto !== existingRecto || currentVerso !== existingVerso) {
                return {
                    reprocess: true,
                    reason: `Fichiers sources différents (${currentRecto}/${currentVerso} vs ${existingRecto}/${existingVerso})`
                };
            }
        }
        
        // Évaluer la qualité des données
        console.log(`   🔍 Évaluation qualité recette ${index + 1}: "${recipe.title}"`);
        
        try {
            const qualityIssues = this.recipeExtractor.dataQualityValidator.detectDataQualityIssues(recipe);
            
            if (qualityIssues.length > 0) {
                const totalProblems = qualityIssues.reduce((sum, issue) => sum + issue.problems.length, 0);
                console.log(`   ⚠️ ${qualityIssues.length} ingrédient(s) avec ${totalProblems} problème(s) de qualité`);
                
                // Afficher quelques exemples de problèmes
                qualityIssues.slice(0, 3).forEach(issue => {
                    console.log(`     • "${issue.ingredient.name}": ${issue.problems.join(', ')}`);
                });
                
                if (qualityIssues.length > 3) {
                    console.log(`     • ... et ${qualityIssues.length - 3} autre(s) ingrédient(s)`);
                }
                
                return {
                    reprocess: true,
                    reason: `Qualité des données insuffisante (${totalProblems} problèmes détectés)`
                };
            } else {
                console.log(`   ✅ Qualité des données satisfaisante`);
                return {
                    reprocess: false,
                    reason: null
                };
            }
        } catch (error) {
            console.log(`   ⚠️ Erreur lors de l'évaluation qualité: ${error.message}`);
            return {
                reprocess: true,
                reason: `Erreur lors de l'évaluation qualité: ${error.message}`
            };
        }
    }
    
    /**
     * Met à jour ou ajoute une erreur dans la liste
     */
    updateError(errors, pair, recto, verso, errorMessage) {
        const existingErrorIndex = errors.findIndex(e => e.pair === pair);
        
        const errorData = {
            pair,
            recto,
            verso,
            error: errorMessage,
            lastAttempt: new Date().toISOString()
        };
        
        if (existingErrorIndex !== -1) {
            errors[existingErrorIndex] = errorData;
        } else {
            errors.push(errorData);
        }
    }
}

module.exports = RecipeProcessor;
