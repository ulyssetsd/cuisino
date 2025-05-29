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
        
        this.imageProcessor = new ImageProcessor();
        this.recipeExtractor = new RecipeExtractor(this.openai);
        
        // Charger la configuration
        this.config = this.loadConfig();
        
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
    }
      async processAllRecipes() {
        console.log('📂 Lecture des images...');
        
        // Lire toutes les images et les trier par timestamp
        const images = await this.imageProcessor.getImagePairs(this.inputDir);
        
        console.log(`📸 ${images.length} paires d'images trouvées`);
        
        const recipes = [];
        const errors = [];
        const startTime = Date.now();
        
        for (let i = 0; i < images.length; i++) {
            const { recto, verso } = images[i];
            
            console.log(`\n🔄 Traitement de la recette ${i + 1}/${images.length}`);
            console.log(`   Recto: ${path.basename(recto)}`);
            console.log(`   Verso: ${path.basename(verso)}`);
            
            try {
                const recipe = await this.processRecipeWithRetry(recto, verso, i + 1);
                
                if (recipe) {
                    // Ajouter les métadonnées si configuré
                    if (this.config.extraction.includeOriginalFilenames) {
                        recipe.metadata = {
                            originalFiles: {
                                recto: path.basename(recto),
                                verso: path.basename(verso)
                            },
                            processedAt: new Date().toISOString(),
                            recipeIndex: i + 1
                        };
                    }
                    
                    recipes.push(recipe);
                    
                    // Sauvegarder chaque recette individuellement
                    const filename = `recipe_${String(i + 1).padStart(3, '0')}.json`;
                    const filepath = path.join(this.outputDir, filename);
                    const jsonOptions = this.config.output.prettyPrint ? { spaces: 2 } : {};
                    await fs.writeJson(filepath, recipe, jsonOptions);
                    
                    console.log(`   ✅ Recette sauvegardée: ${filename}`);
                } else {
                    const errorMsg = `Échec de l'extraction pour la paire ${i + 1}`;
                    console.log(`   ⚠️ ${errorMsg}`);
                    errors.push({ pair: i + 1, recto: path.basename(recto), verso: path.basename(verso), error: errorMsg });
                }
            } catch (error) {
                const errorMsg = `Erreur lors du traitement de la paire ${i + 1}: ${error.message}`;
                console.error(`   ❌ ${errorMsg}`);
                errors.push({ pair: i + 1, recto: path.basename(recto), verso: path.basename(verso), error: error.message });
            }
            
            // Délai entre les requêtes pour éviter la limitation de taux
            if (i < images.length - 1) {
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
}

module.exports = RecipeProcessor;
