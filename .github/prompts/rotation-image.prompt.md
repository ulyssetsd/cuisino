---
mode: 'agent'
---

Rotation automatique des images (portrait → paysage)
J’ai remarqué que mes images sont toutes en orientation portrait, alors qu’elles devraient être en paysage pour faciliter le traitement OCR.
Je veux que tu m’aides à écrire une routine qui :

Parcourt toutes les images d’un dossier

Détecte leur orientation

Si une image est en mode portrait, elle doit être automatiquement pivotée de 90° vers la gauche (counter-clockwise) pour passer en mode paysage

Remplace les fichiers existants avec la version corrigée

Tu peux utiliser Sharp, Jimp, ou n’importe quelle librairie Node.js adaptée pour ce traitement.
