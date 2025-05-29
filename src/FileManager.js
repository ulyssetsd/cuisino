/**
 * Gestionnaire de fichiers et dossiers
 * Responsabilité unique : Opérations sur le système de fichiers
 */
const fs = require('fs-extra');
const path = require('path');

class FileManager {
    constructor(paths) {
        this.paths = paths;
    }

    /**
     * Crée tous les dossiers nécessaires
     */
    async ensureDirectories() {
        await fs.ensureDir(this.paths.output);
        await fs.ensureDir(this.paths.temp);
    }

    /**
     * Sauvegarde une recette individuelle
     */
    async saveRecipe(recipe, index, prettyPrint = true) {
        const filename = `recipe_${String(index).padStart(3, '0')}.json`;
        const filepath = path.join(this.paths.output, filename);
        const jsonOptions = prettyPrint ? { spaces: 2 } : {};
        await fs.writeJson(filepath, recipe, jsonOptions);
        return filename;
    }

    /**
     * Sauvegarde toutes les recettes dans un fichier consolidé
     */
    async saveAllRecipes(summary, prettyPrint = true) {
        const allRecipesPath = path.join(this.paths.output, 'all_recipes.json');
        const jsonOptions = prettyPrint ? { spaces: 2 } : {};
        await fs.writeJson(allRecipesPath, summary, jsonOptions);
        return allRecipesPath;
    }

    /**
     * Charge les recettes existantes
     */
    async loadExistingRecipes() {
        const allRecipesPath = path.join(this.paths.output, 'all_recipes.json');
        
        if (!fs.existsSync(allRecipesPath)) {
            return { existingRecipes: [], existingErrors: [] };
        }

        try {
            const data = await fs.readJson(allRecipesPath);
            return {
                existingRecipes: data.recipes || [],
                existingErrors: data.metadata?.errors || []
            };
        } catch (error) {
            console.log(`⚠️ Erreur lors du chargement: ${error.message}`);
            return { existingRecipes: [], existingErrors: [] };
        }
    }

    /**
     * Génère un fichier de résumé Markdown
     */
    async generateSummaryFile(summary) {
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
        
        const summaryPath = path.join(this.paths.output, 'processing_summary.md');
        await fs.writeFile(summaryPath, summaryText, 'utf8');
        return summaryPath;
    }
}

module.exports = FileManager;
