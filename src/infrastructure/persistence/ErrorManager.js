/**
 * Gestionnaire d'erreurs et de retry
 * Responsabilité unique : Gestion des tentatives et erreurs
 */
class ErrorManager {
    constructor(config) {
        this.retryAttempts = config.processing.retryAttempts;
        this.retryDelay = config.processing.retryDelay;
        this.delayBetweenRequests = config.processing.delayBetweenRequests;
    }

    /**
     * Exécute une fonction avec retry automatique
     */
    async executeWithRetry(fn, context = '') {
        let lastError;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`   🔄 Tentative ${attempt}/${this.retryAttempts}...`);
                    await this.sleep(this.retryDelay);
                }

                const result = await fn();
                return result;

            } catch (error) {
                lastError = error;
                console.log(`   ⚠️ Tentative ${attempt} échouée: ${error.message}`);

                if (attempt === this.retryAttempts) {
                    console.log(`   ❌ Échec après ${this.retryAttempts} tentatives`);
                }
            }
        }

        throw lastError;
    }

    /**
     * Pause entre les requêtes
     */
    async delayBetweenOperations() {
        console.log(`   ⏱️ Pause de ${this.delayBetweenRequests}ms...`);
        await this.sleep(this.delayBetweenRequests);
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

    /**
     * Supprime une erreur de la liste (quand le problème est résolu)
     */
    removeError(errors, pair) {
        const errorIndex = errors.findIndex(e => e.pair === pair);
        if (errorIndex !== -1) {
            errors.splice(errorIndex, 1);
        }
    }

    /**
     * Utilitaire de pause
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ErrorManager;
