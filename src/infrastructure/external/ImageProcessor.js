const fs = require('fs-extra');
const path = require('path');

class ImageProcessor {
    constructor() {
        this.supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    }
    
    async getImagePairs(inputDir) {
        console.log(`🔍 Analyse du dossier: ${inputDir}`);
        
        // Lire tous les fichiers images
        const files = await fs.readdir(inputDir);
        const imageFiles = files
            .filter(file => this.isImageFile(file))
            .sort(); // Tri par nom de fichier (ordre chronologique)
        
        console.log(`📸 ${imageFiles.length} images trouvées`);
        
        // Vérifier que le nombre d'images est pair
        if (imageFiles.length % 2 !== 0) {
            throw new Error(`Nombre impair d'images trouvées (${imageFiles.length}). Il faut un nombre pair pour former des paires recto/verso.`);
        }
        
        // Créer les paires : la première moitié = recto, la seconde moitié = verso
        const halfCount = imageFiles.length / 2;
        const rectoImages = imageFiles.slice(0, halfCount);
        const versoImages = imageFiles.slice(halfCount);
        
        const pairs = [];
        for (let i = 0; i < halfCount; i++) {
            pairs.push({
                recto: path.join(inputDir, rectoImages[i]),
                verso: path.join(inputDir, versoImages[i]),
                index: i + 1
            });
        }
        
        console.log(`✅ ${pairs.length} paires formées`);
        return pairs;
    }
    
    isImageFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }
    
    async imageToBase64(imagePath) {
        try {
            const imageBuffer = await fs.readFile(imagePath);
            const ext = path.extname(imagePath).toLowerCase();
            
            // Déterminer le type MIME
            let mimeType;
            switch (ext) {
                case '.jpg':
                case '.jpeg':
                    mimeType = 'image/jpeg';
                    break;
                case '.png':
                    mimeType = 'image/png';
                    break;
                case '.webp':
                    mimeType = 'image/webp';
                    break;
                default:
                    mimeType = 'image/jpeg';
            }
            
            const base64 = imageBuffer.toString('base64');
            return `data:${mimeType};base64,${base64}`;
        } catch (error) {
            throw new Error(`Erreur lors de la lecture de l'image ${imagePath}: ${error.message}`);
        }
    }
}

module.exports = ImageProcessor;
