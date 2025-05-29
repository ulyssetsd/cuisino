# 🏗️ Réorganisation Architecture DDD Authentique

## ❌ Problème identifié : "Couche Support" non-standard

La "couche support" actuelle **n'est pas un concept DDD**. Ces 8 composants doivent être reclassifiés selon les **vraies couches DDD**.

## 🎯 Reclassification selon les principes DDD authentiques

### **📁 Domain Layer (Couche Domaine)**
```
src/domain/
├── Recipe.js                    ✅ Entité métier riche
├── services/                    🆕 Domain Services
│   ├── DataQualityValidator.js  ↗️ (depuis src/)
│   └── DataQualityCorrector.js  ↗️ (depuis src/)
```

**Responsabilités :**
- **Recipe.js** : Entité métier avec logique de validation/correction
- **DataQualityValidator.js** : Logique métier de validation des recettes
- **DataQualityCorrector.js** : Logique métier de correction des données

### **📁 Application Layer (Couche Application)**
```
src/application/
├── services/                    🆕 Application Services  
│   ├── ProcessingAnalyzer.js    ↗️ (depuis src/)
│   └── MetadataManager.js       ↗️ (depuis src/)
```

**Responsabilités :**
- **ProcessingAnalyzer.js** : Orchestration analyse incrémentale
- **MetadataManager.js** : Orchestration métadonnées/validation

### **📁 Infrastructure Layer (Couche Infrastructure)**
```
src/infrastructure/
├── RecipeRepository.js          ✅ Déjà en place
├── persistence/                 🆕 Organisation infrastructure
│   ├── ConfigManager.js         ↗️ (depuis src/)
│   ├── FileManager.js           ↗️ (depuis src/)
│   └── ErrorManager.js          ↗️ (depuis src/)
└── external/                    🆕 Services externes
    └── ImageProcessor.js        ↗️ (depuis src/)
```

**Responsabilités :**
- **ConfigManager.js** : Configuration/environnement (Infrastructure)
- **FileManager.js** : Système de fichiers (Infrastructure)
- **ErrorManager.js** : Gestion erreurs/retry (Infrastructure)
- **ImageProcessor.js** : Traitement images (Infrastructure externe)

### **📁 Services Layer (Couche Services) - reste inchangée**
```
src/services/
├── RecipeService.js             ✅ Service applicatif principal
└── OpenAIExtractionService.js   ✅ Service extraction
```

## 🔄 Plan de migration

### **Étape 1 : Restructuration des dossiers**
```bash
# Créer la nouvelle structure DDD
mkdir -p src/domain/services
mkdir -p src/application/services  
mkdir -p src/infrastructure/persistence
mkdir -p src/infrastructure/external

# Déplacer vers Domain Services (logique métier)
mv src/DataQualityValidator.js src/domain/services/
mv src/DataQualityCorrector.js src/domain/services/

# Déplacer vers Application Services (orchestration)
mv src/ProcessingAnalyzer.js src/application/services/
mv src/MetadataManager.js src/application/services/

# Déplacer vers Infrastructure (technique)
mv src/ConfigManager.js src/infrastructure/persistence/
mv src/FileManager.js src/infrastructure/persistence/
mv src/ErrorManager.js src/infrastructure/persistence/
mv src/ImageProcessor.js src/infrastructure/external/
```

### **Étape 2 : Mise à jour des imports**
- Corriger tous les `require()` dans les fichiers utilisateurs
- Adapter les chemins relatifs

### **Étape 3 : Validation**
- Tester que l'architecture fonctionne
- Vérifier les dépendances

## 🎯 Résultat : Architecture DDD Pure

```
src/
├── domain/                      🏛️ DOMAINE (logique métier)
│   ├── Recipe.js
│   └── services/
│       ├── DataQualityValidator.js
│       └── DataQualityCorrector.js
├── application/                 🎯 APPLICATION (orchestration)
│   └── services/
│       ├── ProcessingAnalyzer.js
│       └── MetadataManager.js
├── infrastructure/              🔧 INFRASTRUCTURE (technique)
│   ├── RecipeRepository.js
│   ├── persistence/
│   │   ├── ConfigManager.js
│   │   ├── FileManager.js
│   │   └── ErrorManager.js
│   └── external/
│       └── ImageProcessor.js
└── services/                    🚀 SERVICES (façade)
    ├── RecipeService.js
    └── OpenAIExtractionService.js
```

## ✅ Avantages de cette réorganisation

1. **Pureté DDD** : Respect des vraies couches DDD
2. **Responsabilités claires** : Chaque composant dans sa bonne couche
3. **Dépendances correctes** : Domain → Application → Infrastructure  
4. **Maintenabilité** : Structure claire et standard
5. **Évolutivité** : Architecture prête pour croissance

## 🚨 Impact sur les imports

**Avant :**
```javascript
const DataQualityValidator = require('./DataQualityValidator');
const ConfigManager = require('./ConfigManager');
```

**Après :**
```javascript
const DataQualityValidator = require('./domain/services/DataQualityValidator');
const ConfigManager = require('./infrastructure/persistence/ConfigManager');
```

---

Cette réorganisation transforme une architecture "artisanale" en **vraie architecture DDD** respectant les principes canoniques.
