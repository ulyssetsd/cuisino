/**
 * Gestionnaire centralisé de configuration
 * Responsabilité unique : Charger et fournir la configuration
 */
require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');

class ConfigManager {
    constructor() {
        this._config = null;
    }

    /**
     * Charge et retourne la configuration (singleton pattern)
     */
    getConfig() {
        if (!this._config) {
            this._config = this.loadConfig();
        }
        return this._config;
    }

    /**
     * Charge la configuration depuis config.json ou utilise les valeurs par défaut
     */
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
            },
            dataQuality: {
                enabled: true,
                validateIngredients: true,
                autoCorrection: true,
                skipCorrectionIfComplete: true
            }
        };
    }

    /**
     * Retourne les chemins de dossiers configurés
     */
    getPaths() {
        return {
            input: process.env.INPUT_DIR || './recipes/compressed',
            output: process.env.OUTPUT_DIR || './output',
            temp: process.env.TEMP_DIR || './temp'
        };
    }

    /**
     * Retourne la configuration OpenAI
     */
    getOpenAIConfig() {
        return {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4o',
            maxTokens: parseInt(process.env.MAX_TOKENS) || 4096
        };
    }
}

// Export d'une instance unique (singleton)
module.exports = new ConfigManager();
