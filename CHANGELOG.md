# Bsaha v2

Refonte : moins de texte, tout cochable, thème clair.

## Supprimé
- **Module Repas** entier : recettes, kcal, grammes, rotation 14 jours, liste de courses, écran Repas. Remplacé par des pastilles à cocher. `data.js` passe de 64 à 33 Ko.
- Cardio de Mohamed sur l'accueil, accordéons « Comment progresser » et « Modifications de la semaine », bilans, check-ins, mode séance chronométré.
- Toutes les phrases d'aide et d'accroche.

## Ajouté
- **Jour** : séance (une grosse case), repas (pastilles + compteur), pesée (seulement à échéance), photo, barre de progression. Rien d'autre.
- **Semaine** : grille 7 × 2, tap pour cocher, appui long pour déplacer ou alléger, balayage horizontal, un score par personne.
- **Exos** : case par exercice, charge modifiable en ligne, une règle de progression par exercice. Cocher tous les exos coche la séance, et l'inverse.
- **Réglages** : prénoms, repas/jour, shaker, semaine type (tap sur un jour pour faire défiler les séances), cycle de pesée, Supabase, clé Anthropic, export/import JSON.
- Migration v1 → v2 automatique et idempotente.

## Choix tranchés
- **Photo du jour conservée** malgré « rien d'autre » dans le brief : elle avait été demandée explicitement. Réduite à deux vignettes carrées, zéro texte.
- **Coach masqué** de la barre tant qu'aucune clé Anthropic n'est saisie (Réglages).
- **Cibles 44 px dans la grille** : impossible avec une colonne de libellés à gauche sur un écran de 390 px. Les libellés Mo/Fifi sont passés au-dessus de chaque ligne — cellules de 45 × 48 px.
- **Cardio conservé en donnée** mais plus affiché : le réintroduire ne coûtera qu'un bloc.
- **Semaine type dans les Réglages** plutôt qu'un formulaire de préparation : « Préparer la semaine » ne fait que dupliquer ce modèle.
- Un seul re-render ciblé par coche (pastilles + compteur + barre), jamais l'app entière.

## Données
Schéma conservé, nouvelles clés :
- `checks[date][personne][idSéance] = true`
- `meals[date][personne] = { n, sh }`
- `exos[date][personne][idExercice] = true`
- `charges[personne][idExercice] = kg`
- `couple.settings = { v:2, tpl, repas, shaker, cyclePesee, debut }`

Migré depuis la v1 : `logs` (statuts complete/adaptee/partielle) → `checks` ; `shaker` → `meals` ; `mesures`, `profils` et `debut` inchangés. Le cardio n'est pas migré. `repas` et `courses` sont abandonnés.

## Vérifié
20 combinaisons (2 thèmes × 2 profils × 4 onglets) : aucun écran vide, aucune erreur console, toutes les cibles ≥ 44 px, aucun texte de plus de 42 caractères. Migration testée sur un jeu de données v1.
