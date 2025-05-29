# Data Quality Validation - Demonstration

This document demonstrates the automatic data quality validation and correction system integrated into the recipe extraction pipeline.

## How it Works

The system automatically:
1. **Detects** data quality issues in extracted ingredients
2. **Analyzes** what information is missing or incorrect
3. **Calls OpenAI API** with targeted prompts to fix only problematic ingredients
4. **Updates** the recipe with corrected data while preserving valid fields

## Example: Before and After

### Before Data Quality Validation
```json
{
  "ingredients": [
    {
      "name": "Carotte",
      "quantity": {
        "value": 1,
        "unit": "pièce(s)"  // ❌ Non-standard unit
      }
    },
    {
      "name": "Paprika fumé en poudre",
      "quantity": {
        "value": null,      // ❌ Missing value
        "unit": "sachet(s)" // ❌ Non-standard unit
      }
    },
    {
      "name": "Huile d'olive",
      "quantity": {
        "value": null,              // ❌ Missing value
        "unit": "selon votre goût"  // ❌ Non-standard unit
      }
    }
  ]
}
```

### After Data Quality Validation
```json
{
  "ingredients": [
    {
      "name": "Carotte",
      "quantity": {
        "value": 1,
        "unit": "pièce"    // ✅ Standardized
      }
    },
    {
      "name": "Paprika fumé en poudre",
      "quantity": {
        "value": 1,        // ✅ Value extracted
        "unit": "cs"       // ✅ Standardized
      }
    },
    {
      "name": "Huile d'olive",
      "quantity": {
        "value": null,     // ✅ Correctly null (variable amount)
        "unit": ""         // ✅ Empty for variable amounts
      }
    }
  ]
}
```

## Console Output Example

```
🔄 Traitement de la recette 1/34
   Recto: 20250529_115832.jpg
   Verso: 20250529_120413.jpg
   🔄 Conversion des images en base64...
   🤖 Envoi à l'API OpenAI...
   🔍 Vérification de la qualité des données...
   ⚠️  8 problème(s) détecté(s) - correction en cours...
   ✏️  Corrigé: "Carotte" - 1 pièce
   ✏️  Corrigé: "Oignon" - 1 pièce
   ✏️  Corrigé: "Gousse d'ail" - 1 gousse
   ✏️  Corrigé: "Citron" - 0.5 pièce
   ✏️  Corrigé: "Paprika fumé en poudre" - 1 cs
   ✏️  Corrigé: "Filet de lieu noir" - 2 pièce
   ✏️  Corrigé: "Cube de bouillon de légumes" - 0.5 cube
   ✏️  Corrigé: "Huile d'olive" - null 
   ✅ Données corrigées avec succès
   ✅ Recette extraite: "Lieu meunière & tombée d'épinards"
```

## Validation Rules

### Ingredient Name
- ✅ Must be a non-empty string
- ❌ Empty, null, or undefined names

### Quantity Value
- ✅ Must be a number or `null`
- ❌ Invalid numbers, strings, or undefined

### Quantity Unit
- ✅ Must be from standard units list:
  - Weight: `g`, `kg`
  - Volume: `ml`, `cl`, `l`, `dl`
  - Spoons: `cs`, `cc`, `c. à soupe`, `c. à café`
  - Count: `pièce`, `pièces`, `unité`, `gousse`, `tranche`, `sachet`, etc.
  - Empty: `""` for variable amounts
- ❌ Non-standard units like `"pièce(s)"`, `"selon votre goût"`

## API Optimization

The system is designed to minimize API calls:

### ✅ Efficient
- Only calls API when issues are detected
- Sends targeted prompts for missing data only
- Preserves all valid existing data

### ❌ No Unnecessary Calls
- Perfect data → No API call
- Complete ingredients → No correction needed

## Configuration

Control the feature in `config.json`:

```json
{
  "dataQuality": {
    "enabled": true,              // Master switch
    "validateIngredients": true,  // Validate ingredient data
    "autoCorrection": true,       // Auto-fix issues
    "skipCorrectionIfComplete": true
  }
}
```

## Benefits

1. **🎯 Higher Data Quality**: Ensures consistent, complete ingredient data
2. **💰 Cost Optimization**: Only makes API calls when needed
3. **🔧 Automatic**: No manual intervention required
4. **📊 Transparent**: Detailed logging of all corrections
5. **🛡️ Safe**: Preserves valid data, only fixes problems

## Testing

Run the data quality test:
```bash
npm run test-data-quality
```

This will show you the system in action with a single recipe extraction.
