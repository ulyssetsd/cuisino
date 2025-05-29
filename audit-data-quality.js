#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const DataQualityValidator = require('./src/DataQualityValidator');

class RecipeAuditor {
    constructor() {
        // Initialize the DataQualityValidator without OpenAI client since we only need validation
        this.validator = new DataQualityValidator(null);
        this.stats = {
            totalRecipes: 0,
            recipesWithIssues: 0,
            totalIssues: 0,
            issueTypes: {},
            unitDistribution: {},
            correctionsSuggested: 0
        };
    }

    /**
     * Launches the complete audit of all recipes
     */
    async auditAllRecipes() {
        console.log('🔍 AUDIT DE QUALITÉ DES DONNÉES');
        console.log('================================\n');

        const recipesPath = path.join(__dirname, 'output', 'all_recipes.json');
        
        if (!fs.existsSync(recipesPath)) {
            console.error('❌ Fichier all_recipes.json non trouvé dans output/');
            process.exit(1);
        }        const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
        const recipes = data.recipes || data; // Handle both array and object with recipes property
        this.stats.totalRecipes = recipes.length;

        console.log(`📊 Analyse de ${recipes.length} recettes...\n`);

        const allIssues = [];
        
        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];
            const issues = this.auditRecipe(recipe, i);
            
            if (issues.length > 0) {
                this.stats.recipesWithIssues++;
                this.stats.totalIssues += issues.length;
                allIssues.push({
                    recipeIndex: i,
                    title: recipe.title || `Recette ${i + 1}`,
                    issues: issues
                });

                // Count issue types
                issues.forEach(issue => {
                    issue.problems.forEach(problem => {
                        this.stats.issueTypes[problem] = (this.stats.issueTypes[problem] || 0) + 1;
                    });
                });
            }

            // Analyze unit distribution
            this.analyzeUnits(recipe);
        }

        // Generate reports
        await this.generateReports(allIssues);
        this.displaySummary();
    }

    /**
     * Audit of an individual recipe
     */
    auditRecipe(recipe, index) {
        try {
            // Use the existing DataQualityValidator method
            return this.validator.detectDataQualityIssues(recipe);
        } catch (error) {
            console.warn(`⚠️ Erreur lors de l'audit de la recette ${index + 1}: ${error.message}`);
            return [];
        }
    }

    /**
     * Analyze unit distribution
     */
    analyzeUnits(recipe) {
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
            return;
        }

        recipe.ingredients.forEach(ingredient => {
            if (ingredient.quantity && ingredient.quantity.unit !== undefined) {
                const unit = ingredient.quantity.unit || '(vide)';
                this.stats.unitDistribution[unit] = (this.stats.unitDistribution[unit] || 0) + 1;
            }
        });
    }

    /**
     * Generate audit reports
     */
    async generateReports(allIssues) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportsDir = path.join(__dirname, 'output');
        
        // Detailed JSON report
        const jsonReport = {
            timestamp: new Date().toISOString(),
            summary: this.stats,
            qualityScore: this.calculateQualityScore(),
            issues: allIssues,
            recommendations: this.generateRecommendations()
        };

        fs.writeFileSync(
            path.join(reportsDir, `data_quality_audit_${timestamp}.json`),
            JSON.stringify(jsonReport, null, 2)
        );

        // Readable Markdown report
        const markdownReport = this.generateMarkdownReport(jsonReport);
        fs.writeFileSync(
            path.join(reportsDir, `data_quality_audit_${timestamp}.md`),
            markdownReport
        );

        console.log(`📄 Rapports générés:`);
        console.log(`   - data_quality_audit_${timestamp}.json`);
        console.log(`   - data_quality_audit_${timestamp}.md\n`);
    }

    /**
     * Calculate a quality score out of 100
     */
    calculateQualityScore() {
        if (this.stats.totalRecipes === 0) return 100;
        
        const problemFreeRatio = (this.stats.totalRecipes - this.stats.recipesWithIssues) / this.stats.totalRecipes;
        const issuesSeverity = Math.min(this.stats.totalIssues / this.stats.totalRecipes, 3) / 3; // Max 3 issues per recipe
        
        return Math.round((problemFreeRatio * 70 + (1 - issuesSeverity) * 30));
    }

    /**
     * Generate improvement recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.stats.issueTypes['quantity.unit manquant'] > 0) {
            recommendations.push({
                priority: 'HIGH',
                issue: 'Unités manquantes',
                count: this.stats.issueTypes['quantity.unit manquant'],
                action: 'Utiliser le script de correction automatique ou réviser manuellement les recettes'
            });
        }

        const nonStandardUnits = Object.keys(this.stats.issueTypes).filter(issue => 
            issue.includes('non standard')).reduce((sum, issue) => 
            sum + this.stats.issueTypes[issue], 0);

        if (nonStandardUnits > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                issue: 'Unités non standardisées',
                count: nonStandardUnits,
                action: 'Normaliser les unités vers les formats standards (g, ml, cs, cc, pièce, etc.)'
            });
        }

        if (this.stats.issueTypes['nom manquant ou vide'] > 0) {
            recommendations.push({
                priority: 'HIGH',
                issue: 'Noms d\'ingrédients manquants',
                count: this.stats.issueTypes['nom manquant ou vide'],
                action: 'Réviser manuellement les extractions pour compléter les noms'
            });
        }

        return recommendations;
    }

    /**
     * Generate a Markdown report
     */
    generateMarkdownReport(jsonReport) {
        const { summary, qualityScore, issues, recommendations } = jsonReport;
        
        let markdown = `# Rapport d'Audit - Qualité des Données\n\n`;
        markdown += `**Date:** ${new Date(jsonReport.timestamp).toLocaleString('fr-FR')}\n\n`;
        
        // Quality score
        const scoreEmoji = qualityScore >= 90 ? '🟢' : qualityScore >= 70 ? '🟡' : '🔴';
        markdown += `## Score de Qualité: ${scoreEmoji} ${qualityScore}/100\n\n`;
        
        // Global statistics
        markdown += `## 📊 Statistiques Globales\n\n`;
        markdown += `- **Total recettes:** ${summary.totalRecipes}\n`;
        markdown += `- **Recettes avec problèmes:** ${summary.recipesWithIssues} (${Math.round(summary.recipesWithIssues/summary.totalRecipes*100)}%)\n`;
        markdown += `- **Total des problèmes:** ${summary.totalIssues}\n\n`;
        
        // Problem types
        if (Object.keys(summary.issueTypes).length > 0) {
            markdown += `## ⚠️ Types de Problèmes Détectés\n\n`;
            Object.entries(summary.issueTypes)
                .sort(([,a], [,b]) => b - a)
                .forEach(([problem, count]) => {
                    markdown += `- **${problem}:** ${count} occurrences\n`;
                });
            markdown += '\n';
        }
        
        // Unit distribution
        if (Object.keys(summary.unitDistribution).length > 0) {
            markdown += `## 📏 Distribution des Unités\n\n`;
            Object.entries(summary.unitDistribution)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 15) // Top 15
                .forEach(([unit, count]) => {
                    markdown += `- **"${unit}":** ${count} utilisations\n`;
                });
            markdown += '\n';
        }
        
        // Recommendations
        if (recommendations.length > 0) {
            markdown += `## 💡 Recommandations\n\n`;
            recommendations.forEach((rec, i) => {
                const priorityEmoji = rec.priority === 'HIGH' ? '🔴' : '🟡';
                markdown += `### ${priorityEmoji} ${rec.issue}\n`;
                markdown += `**Occurrences:** ${rec.count}\n`;
                markdown += `**Action recommandée:** ${rec.action}\n\n`;
            });
        }
        
        // Detailed problems by recipe
        if (issues.length > 0) {
            markdown += `## 📋 Détail par Recette\n\n`;
            issues.slice(0, 20).forEach(issue => { // Limit to 20 for readability
                markdown += `### ${issue.title}\n`;
                issue.issues.forEach((ing, i) => {
                    markdown += `**Ingrédient ${ing.index + 1}:** "${ing.ingredient.name || 'N/A'}"\n`;
                    markdown += `- Problèmes: ${ing.problems.join(', ')}\n`;
                    if (ing.ingredient.quantity) {
                        markdown += `- Quantité actuelle: ${ing.ingredient.quantity.value} "${ing.ingredient.quantity.unit}"\n`;
                    }
                    markdown += '\n';
                });
            });
            
            if (issues.length > 20) {
                markdown += `*... et ${issues.length - 20} autres recettes avec des problèmes*\n\n`;
            }
        }
        
        markdown += `---\n*Rapport généré automatiquement par le système d'audit de qualité*\n`;
        
        return markdown;
    }

    /**
     * Display summary in console
     */
    displaySummary() {
        const qualityScore = this.calculateQualityScore();
        const scoreEmoji = qualityScore >= 90 ? '🟢' : qualityScore >= 70 ? '🟡' : '🔴';
        
        console.log('📊 RÉSUMÉ DE L\'AUDIT');
        console.log('====================');
        console.log(`${scoreEmoji} Score de qualité: ${qualityScore}/100`);
        console.log(`📈 Recettes analysées: ${this.stats.totalRecipes}`);
        console.log(`⚠️  Recettes avec problèmes: ${this.stats.recipesWithIssues}/${this.stats.totalRecipes} (${Math.round(this.stats.recipesWithIssues/this.stats.totalRecipes*100)}%)`);
        console.log(`🔍 Total des problèmes: ${this.stats.totalIssues}`);
        
        if (Object.keys(this.stats.issueTypes).length > 0) {
            console.log('\nTop 3 des problèmes:');
            Object.entries(this.stats.issueTypes)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .forEach(([problem, count], i) => {
                    console.log(`  ${i + 1}. ${problem}: ${count} occurrences`);
                });
        }
        
        console.log('\n✅ Audit terminé avec succès!');
    }
}

// Entry point
if (require.main === module) {
    console.log('🚀 Démarrage de l\'audit...');
    const auditor = new RecipeAuditor();
    auditor.auditAllRecipes().catch(error => {
        console.error('❌ Erreur lors de l\'audit:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = RecipeAuditor;
