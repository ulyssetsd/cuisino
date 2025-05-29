const fs = require('fs-extra');
const path = require('path');

async function analyzeUnitsInDatabase() {
    console.log('🔍 Analyse des unités dans la base de données existante...\n');
    
    try {
        const outputDir = './output';
        const allRecipesPath = path.join(outputDir, 'all_recipes.json');
        console.log('📁 Chemin du fichier:', allRecipesPath);
        
        if (!await fs.pathExists(allRecipesPath)) {
            console.log('❌ Fichier all_recipes.json non trouvé');
            console.log('💡 Lancez d\'abord le traitement des recettes avec: npm start');
            return;
        }
        
        // Charger toutes les recettes
        const data = await fs.readJson(allRecipesPath);
        const recipes = data.recipes || [];
        
        console.log(`📊 Analyse de ${recipes.length} recettes...\n`);
        
        // Collecter toutes les unités
        const unitsMap = new Map();
        let totalIngredients = 0;
        let ingredientsWithUnits = 0;
        let ingredientsWithValues = 0;
        
        recipes.forEach((recipe, recipeIndex) => {
            if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
                return;
            }
            
            recipe.ingredients.forEach((ingredient, ingredientIndex) => {
                totalIngredients++;
                
                if (ingredient.quantity && typeof ingredient.quantity === 'object') {
                    const unit = ingredient.quantity.unit;
                    const value = ingredient.quantity.value;
                    
                    if (unit !== undefined && unit !== null) {
                        ingredientsWithUnits++;
                        
                        // Compter les occurrences de chaque unité
                        const unitKey = unit.toString().trim();
                        const existing = unitsMap.get(unitKey) || { count: 0, examples: [] };
                        existing.count++;
                        
                        // Ajouter quelques exemples
                        if (existing.examples.length < 3) {
                            existing.examples.push({
                                ingredient: ingredient.name,
                                value: value,
                                recipe: recipe.title,
                                recipeIndex: recipeIndex + 1
                            });
                        }
                        
                        unitsMap.set(unitKey, existing);
                    }
                    
                    if (value !== null && value !== undefined) {
                        ingredientsWithValues++;
                    }
                }
            });
        });
        
        // Trier les unités par fréquence d'utilisation
        const sortedUnits = Array.from(unitsMap.entries())
            .sort((a, b) => b[1].count - a[1].count);
        
        // Afficher les statistiques générales
        console.log('📈 STATISTIQUES GÉNÉRALES');
        console.log('═══════════════════════════');
        console.log(`Ingrédients totaux: ${totalIngredients}`);
        console.log(`Ingrédients avec unité: ${ingredientsWithUnits} (${Math.round((ingredientsWithUnits / totalIngredients) * 100)}%)`);
        console.log(`Ingrédients avec valeur: ${ingredientsWithValues} (${Math.round((ingredientsWithValues / totalIngredients) * 100)}%)`);
        console.log(`Unités différentes trouvées: ${sortedUnits.length}`);
        
        // Afficher toutes les unités trouvées
        console.log('\n📝 UNITÉS TROUVÉES (par fréquence)');
        console.log('═════════════════════════════════');
        
        sortedUnits.forEach(([unit, data], index) => {
            const displayUnit = unit === '' ? '(vide)' : `"${unit}"`;
            console.log(`${index + 1}. ${displayUnit} - ${data.count} occurrences`);
            
            // Afficher quelques exemples
            data.examples.forEach(example => {
                const displayValue = example.value === null ? 'null' : example.value;
                console.log(`   → ${example.ingredient}: ${displayValue} ${unit} (Recette ${example.recipeIndex}: ${example.recipe})`);
            });
            console.log('');
        });
        
        // Analyser les unités problématiques
        console.log('\n⚠️  UNITÉS POTENTIELLEMENT PROBLÉMATIQUES');
        console.log('═════════════════════════════════════════');
        
        const problematicUnits = sortedUnits.filter(([unit, data]) => {
            // Détecter les unités non-standard
            const standardUnits = [
                'g', 'kg', 'ml', 'cl', 'l', 'dl',
                'pièce', 'pièces', 'unité', 'unités',
                'cs', 'cc', 'c. à soupe', 'c. à café',
                'sachet', 'sachets', 'botte', 'bottes',
                'tranche', 'tranches', 'gousse', 'gousses',
                'branches', 'branche', 'feuille', 'feuilles',
                'conserve', 'pot', 'barquette', 'paquet', 'paquets',
                ''  // unité vide acceptable
            ];
            
            return !standardUnits.some(standard => 
                standard.toLowerCase() === unit.toLowerCase().trim()
            );
        });
        
        if (problematicUnits.length > 0) {
            problematicUnits.forEach(([unit, data], index) => {
                console.log(`${index + 1}. "${unit}" - ${data.count} occurrences`);
                data.examples.forEach(example => {
                    console.log(`   → ${example.ingredient} (Recette ${example.recipeIndex})`);
                });
            });
        } else {
            console.log('✅ Aucune unité problématique détectée');
        }
        
        // Générer la liste complète pour DataQualityValidator
        console.log('\n🔧 LISTE COMPLÈTE POUR DATAQUALITYVALIDATOR');
        console.log('═══════════════════════════════════════════════');
        console.log('Copiez cette liste dans le tableau validUnits:');
        console.log('');
        
        const allUnits = sortedUnits.map(([unit]) => unit).sort();
        const jsArrayFormat = allUnits.map(unit => `'${unit}'`).join(', ');
        
        console.log('this.validUnits = [');
        allUnits.forEach((unit, index) => {
            const displayUnit = unit === '' ? '' : unit;
            const comma = index < allUnits.length - 1 ? ',' : '';
            console.log(`    '${displayUnit}'${comma}`);
        });
        console.log('];');
        
        console.log('\n✅ Analyse terminée !');
        console.log(`📄 ${sortedUnits.length} unités différentes trouvées dans votre base de données`);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error.message);
    }
}

if (require.main === module) {
    analyzeUnitsInDatabase();
}

module.exports = { analyzeUnitsInDatabase };
