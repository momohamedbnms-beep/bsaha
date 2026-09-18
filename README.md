# Bsaha — sport, repas et coach pour Mohamed & Firdaous

Application web (PWA) : un seul `index.html` + `app.js` + `data.js`, hébergée sur GitHub Pages.
Données partagées via Supabase (même compte sur les deux téléphones), coach IA via l'API Anthropic (clé saisie dans les réglages, jamais dans le code).

## Mise en route
1. Ouvrir l'app, ⚙ Réglages → coller l'URL du projet Supabase et la clé anon → Enregistrer.
2. « Créer le compte » avec un e-mail + mot de passe (une seule fois), puis « Se connecter » sur les deux téléphones.
3. Coller la clé API Anthropic (sk-ant-…) pour activer le coach.
4. Ajouter à l'écran d'accueil (Safari → Partager → Sur l'écran d'accueil).

## Supabase
Exécuter `supabase.sql` une fois (SQL Editor). Il crée la table `bsaha_docs` (RLS : chacun ses lignes), active le temps réel et le bucket privé `bsaha-photos`.

## Structure
- `index.html` : coquille + CSS
- `data.js` : exercices (Firdaous maison, Mohamed salle), séances, rotation des repas, recettes
- `app.js` : stockage (Supabase / local), semaine pilotée, mode séance, repas/courses, progrès, coach IA
- `assets/ex/` : images d'exercices (générées avec Higgsfield / GPT Image 2, vérifiées à la main)
- `sw.js`, `manifest.webmanifest` : PWA
