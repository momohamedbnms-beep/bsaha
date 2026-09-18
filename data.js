// ===== Données du programme de Firdaous =====
const PRENOM = 'Firdaous';

// Fiches d'exercices. img = [départ, arrivée] (clés des images intégrées)
const EXOS = {
  pont: {
    nom: 'Pont fessier', zone: 'Fessiers', img: ['01','02'], mat: 'Tapis',
    but: 'Apprendre à contracter les fessiers et renforcer toute la chaîne arrière (fessiers, arrière des cuisses, bas du dos).',
    install: 'Allongée sur le dos sur le tapis, genoux pliés, pieds à plat écartés largeur de hanches, bras le long du corps, paumes au sol.',
    etapes: ['Pousse dans tes talons et serre les fessiers pour décoller le bassin.', 'Monte jusqu\'à ce que les épaules, le bassin et les genoux soient alignés (pas plus haut).', 'Tiens 1 seconde en haut en serrant fort les fessiers.', 'Redescends lentement (2 secondes) sans poser complètement le bassin entre les répétitions.'],
    respiration: 'Souffle en montant, inspire en descendant.',
    rythme: '1 s pour monter, 1 s de pause en haut, 2 s pour descendre.',
    sensations: 'Les fessiers travaillent en premier, l\'arrière des cuisses ensuite. Pas de sensation dans le bas du dos.',
    erreurs: ['Monter trop haut en cambrant le dos (les côtes remontent).', 'Pousser avec la pointe des pieds au lieu des talons.', 'Genoux qui partent vers l\'extérieur ou l\'intérieur.'],
    facile: 'Amplitude réduite : monte à mi-hauteur seulement, ou fais moins de répétitions.',
    progression: 'Pause de 3 s en haut → pont avec haltère posé sur le bassin (voir fiche) → pont sur une jambe.',
    arret: 'Arrête si tu sens une douleur vive dans le bas du dos ou le ventre ; si ça pince seulement, réduis la hauteur.'
  },
  chaise: {
    nom: 'Assis-debout sur chaise', zone: 'Fessiers · Cuisses', img: ['03','04'], mat: 'Chaise stable',
    but: 'Apprendre le mouvement du squat en sécurité : la chaise donne le repère de profondeur.',
    install: 'Debout devant une chaise stable (dossier contre un mur si elle glisse), dos à la chaise, pieds écartés largeur d\'épaules, pointes légèrement vers l\'extérieur, bras tendus devant toi.',
    etapes: ['Pousse les fesses vers l\'arrière comme pour t\'asseoir, le poids sur les talons.', 'Descends en contrôlant jusqu\'à toucher légèrement l\'assise (ou t\'asseoir doucement au début).', 'Sans t\'élancer, pousse dans les talons et serre les fessiers pour te relever.', 'Termine bien droite, fessiers serrés.'],
    respiration: 'Inspire en descendant, souffle en remontant.',
    rythme: '2 s pour descendre, 1 s de contact, 1 s pour remonter.',
    sensations: 'Cuisses et fessiers. Les genoux ne doivent pas faire mal.',
    erreurs: ['Genoux qui rentrent vers l\'intérieur en remontant.', 'Se laisser tomber sur la chaise.', 'Décoller les talons.'],
    facile: 'Chaise plus haute (coussin sur l\'assise) et assieds-toi complètement entre chaque répétition.',
    progression: 'Touche seulement l\'assise sans t\'asseoir → chaise plus basse → squat goblet avec haltère (voir fiche).',
    arret: 'Arrête en cas de douleur au genou ou au ventre.'
  },
  lateral: {
    nom: 'Élévation latérale de jambe (couchée)', zone: 'Côté des hanches', img: ['05','06'], mat: 'Tapis',
    but: 'Renforcer le moyen fessier, le muscle sur le côté de la hanche qui stabilise le bassin et participe au galbe latéral.',
    install: 'Allongée sur le côté, le corps bien aligné (épaule, hanche, cheville), tête posée sur la main, l\'autre main au sol devant la poitrine, jambes tendues l\'une sur l\'autre.',
    etapes: ['Fléchis le pied du dessus (orteils vers toi) et garde les orteils pointés vers l\'avant, pas vers le plafond.', 'Monte la jambe du dessus lentement, à 30–45° maximum : plus bas que sur la photo « Arrivée » suffit.', 'Tiens 1 s en haut sans laisser le bassin basculer en arrière.', 'Redescends lentement sans poser la jambe complètement.'],
    respiration: 'Souffle en montant, inspire en descendant.',
    rythme: '1 s pour monter, 1 s de pause, 2 s pour descendre.',
    sensations: 'Brûlure sur le côté de la hanche, au-dessus de l\'os. Si tu sens surtout le devant de la cuisse, tes orteils pointent trop vers le haut.',
    erreurs: ['Basculer le bassin vers l\'arrière pour monter plus haut.', 'Monter trop vite ou trop haut.', 'Plier le genou.'],
    facile: 'Amplitude réduite (20°), ou genou du dessous plié pour plus de stabilité.',
    progression: 'Pause de 3 s en haut → mini-élastique autour des chevilles → abduction debout (voir fiche).',
    arret: 'Arrête si douleur dans la hanche ou le bas du dos.'
  },
  extension: {
    nom: 'Extension de hanche à quatre pattes', zone: 'Fessiers', img: ['07','08'], mat: 'Tapis',
    but: 'Cibler le grand fessier de façon isolée, une jambe à la fois.',
    install: 'À quatre pattes sur le tapis : mains sous les épaules, genoux sous les hanches, dos plat, regard vers le tapis.',
    etapes: ['Garde le genou plié à 90° et le pied fléchi.', 'Pousse le talon vers le plafond en serrant le fessier, jusqu\'à ce que la cuisse soit dans l\'alignement du dos (pas plus haut).', 'Tiens 1 s en haut : le bassin reste horizontal, le dos ne se creuse pas.', 'Redescends lentement sans reposer le genou.'],
    respiration: 'Souffle en montant, inspire en descendant.',
    rythme: '1 s pour monter, 1 s de pause, 2 s pour descendre.',
    sensations: 'Le fessier de la jambe qui travaille. Rien dans le bas du dos.',
    erreurs: ['Creuser le dos pour monter plus haut.', 'Ouvrir la hanche sur le côté.', 'Faire le mouvement trop vite avec de l\'élan.'],
    facile: 'Amplitude réduite ou avant-bras au sol pour reposer les poignets.',
    progression: 'Pause de 3 s → 2 séries de plus → mini-élastique au-dessus des genoux.',
    arret: 'Arrête si douleur au poignet (passe sur les avant-bras) ou dans le bas du dos.'
  },
  mur: {
    nom: 'Pompes au mur', zone: 'Poitrine · Bras · Tronc', img: ['09','10'], mat: 'Mur libre',
    but: 'Renforcer le haut du corps et la posture en douceur, pour un corps équilibré.',
    install: 'Face au mur, à une longueur de bras, paumes à plat sur le mur à hauteur d\'épaules, un peu plus larges que les épaules, pieds écartés largeur de hanches, corps droit.',
    etapes: ['Plie les coudes pour amener le visage vers le mur, coudes orientés vers l\'arrière et légèrement vers l\'extérieur.', 'Garde le corps en une seule ligne, ventre légèrement gainé.', 'Repousse le mur jusqu\'à tendre les bras.', 'Pour rendre plus dur, éloigne un peu les pieds du mur.'],
    respiration: 'Inspire en approchant, souffle en repoussant.',
    rythme: '2 s pour descendre, 1 s pour pousser.',
    sensations: 'Poitrine, arrière des bras, un peu les épaules.',
    erreurs: ['Casser les hanches (fesses en arrière).', 'Coudes écartés à l\'horizontale.', 'Regard vers le sol (garde la nuque droite).'],
    facile: 'Rapproche les pieds du mur.',
    progression: 'Pieds plus loin → mains sur un meuble bas stable (table, plan de travail) → genoux au sol.',
    arret: 'Arrête si douleur aux poignets ou aux épaules.'
  },
  sumo: {
    nom: 'Squat sumo', zone: 'Fessiers · Intérieur des cuisses', img: ['11','12'], mat: 'Aucun',
    but: 'Squat pieds écartés qui sollicite davantage les fessiers et l\'intérieur des cuisses.',
    install: 'Debout, pieds bien plus larges que les épaules, pointes tournées vers l\'extérieur à 45°, mains jointes devant la poitrine.',
    etapes: ['Descends en pliant les genoux dans l\'axe des pointes de pieds, le buste droit.', 'Descends jusqu\'aux cuisses parallèles au sol (ou plus haut si nécessaire).', 'Pousse dans les talons, serre les fessiers pour remonter.', 'Termine debout, fessiers serrés.'],
    respiration: 'Inspire en descendant, souffle en remontant.',
    rythme: '2 s pour descendre, 1 s pour remonter.',
    sensations: 'Fessiers, intérieur des cuisses, cuisses.',
    erreurs: ['Genoux qui rentrent.', 'Buste qui se penche en avant.', 'Talons qui décollent.'],
    facile: 'Descends moins bas ; tiens-toi à une chaise d\'une main.',
    progression: 'Pause de 2 s en bas → tempo lent (3 s de descente) → haltère tenu à deux mains devant le bassin.',
    arret: 'Arrête si douleur au genou ou à l\'aine.'
  },
  coquille: {
    nom: 'Coquille (clamshell)', zone: 'Côté des hanches', img: ['13','14'], mat: 'Tapis',
    but: 'Activer le moyen fessier, essentiel pour la stabilité des hanches et le galbe latéral.',
    install: 'Allongée sur le côté, tête sur la main, hanches et genoux pliés à 45°, pieds l\'un sur l\'autre, main libre posée sur la hanche du dessus pour sentir qu\'elle ne bouge pas.',
    etapes: ['Garde les pieds collés l\'un à l\'autre.', 'Ouvre le genou du dessus vers le plafond, comme une coquille qui s\'ouvre.', 'Le bassin reste fixe : il ne bascule pas en arrière.', 'Referme lentement sans laisser tomber le genou.'],
    respiration: 'Souffle en ouvrant, inspire en refermant.',
    rythme: '1 s pour ouvrir, 1 s de pause, 2 s pour refermer.',
    sensations: 'Brûlure sur le côté et l\'arrière de la hanche, juste au-dessus de la fesse.',
    erreurs: ['Bassin qui roule en arrière (la main sur la hanche le sent).', 'Ouvrir trop vite.', 'Décoller les pieds.'],
    facile: 'Ouvre moins grand.',
    progression: 'Pause de 3 s ouvert → mini-élastique au-dessus des genoux → coquille avec pieds décollés.',
    arret: 'Arrête si douleur dans la hanche.'
  },
  chien: {
    nom: 'Chien-oiseau (bird-dog)', zone: 'Bas du dos · Tronc · Fessiers', img: ['15','16'], mat: 'Tapis',
    but: 'Renforcer en douceur le bas du dos et les muscles profonds du tronc, en gardant le bassin stable.',
    install: 'À quatre pattes, mains sous les épaules, genoux sous les hanches, dos plat.',
    etapes: ['Tends le bras droit devant toi à hauteur d\'épaule, pouce vers le haut.', 'En même temps, tends la jambe gauche en arrière à hauteur de hanche (bras et jambe opposés).', 'Tiens 2 s sans bouger : le bassin ne bascule pas, le dos ne se creuse pas.', 'Reviens lentement, puis change de côté.'],
    respiration: 'Souffle en tendant, inspire en revenant.',
    rythme: 'Lent et contrôlé : 2 s pour tendre, 2 s de maintien, 2 s pour revenir.',
    sensations: 'Fessier de la jambe tendue, muscles le long de la colonne, ventre légèrement gainé.',
    erreurs: ['Lever la jambe trop haut en creusant le dos.', 'Tourner le bassin sur le côté.', 'Aller vite.'],
    facile: 'Tends seulement la jambe, puis seulement le bras, sans les combiner.',
    progression: 'Maintien de 5 s → 3 séries → toucher coude-genou sous le ventre entre deux extensions.',
    arret: 'Arrête si douleur dans le bas du dos.'
  },
  mollets: {
    nom: 'Mollets debout', zone: 'Mollets', img: ['17','18'], mat: 'Mur (appui)',
    but: 'Renforcer les mollets pour l\'équilibre, la marche et des jambes harmonieuses.',
    install: 'Debout à côté d\'un mur, bout des doigts posé sur le mur pour l\'équilibre, pieds écartés largeur de hanches.',
    etapes: ['Monte sur la pointe des pieds le plus haut possible.', 'Tiens 1 s en haut.', 'Redescends lentement jusqu\'à poser les talons.', 'Garde le corps droit, sans te pencher.'],
    respiration: 'Souffle en montant, inspire en descendant.',
    rythme: '1 s pour monter, 1 s de pause, 2 s pour descendre.',
    sensations: 'Mollets.',
    erreurs: ['S\'appuyer trop sur le mur.', 'Rebondir.'],
    facile: 'Moins de répétitions, plus d\'appui.',
    progression: 'Sur une jambe → sur une marche pour plus d\'amplitude → haltère dans la main libre.',
    arret: 'Arrête si crampe ou douleur au tendon d\'Achille.'
  },
  fente: {
    nom: 'Fente arrière avec appui', zone: 'Fessiers · Cuisses', img: ['19','20'], mat: 'Chaise stable',
    but: 'Travailler chaque jambe séparément : très efficace pour les fessiers et l\'équilibre du bassin.',
    install: 'Debout, une main posée sur le dossier d\'une chaise stable placée à côté de toi, pieds largeur de hanches.',
    etapes: ['Recule un pied et pose la pointe au sol.', 'Descends le genou arrière vers le sol, le genou avant reste au-dessus de la cheville.', 'Buste droit, poids sur le talon du pied avant.', 'Pousse dans le talon avant pour revenir debout, puis alterne ou termine le côté.'],
    respiration: 'Inspire en descendant, souffle en remontant.',
    rythme: '2 s pour descendre, 1 s pour remonter.',
    sensations: 'Fessier et cuisse de la jambe avant.',
    erreurs: ['Genou avant qui dépasse trop la pointe du pied.', 'Buste penché en avant.', 'Pas trop court (descente qui coince).'],
    facile: 'Descends à mi-hauteur seulement ; garde l\'appui à deux mains.',
    progression: 'Sans appui → haltère dans la main libre → pied arrière surélevé (coussin ferme).',
    arret: 'Arrête si douleur au genou.'
  },
  charniere: {
    nom: 'Charnière de hanche', zone: 'Fessiers · Arrière des cuisses · Bas du dos', img: ['21','22'], mat: 'Aucun',
    but: 'Apprendre à plier par les hanches en gardant le dos droit : le mouvement de base pour renforcer fessiers et bas du dos sans se blesser.',
    install: 'Debout, pieds largeur de hanches, genoux légèrement pliés, mains posées sur le devant des cuisses.',
    etapes: ['Pousse les fesses vers l\'arrière comme pour fermer une porte avec les fesses.', 'Le buste s\'incline en avant en restant parfaitement droit (imagine un bâton collé le long du dos), les mains glissent vers les genoux.', 'Arrête-toi quand tu sens l\'arrière des cuisses tirer (souvent avant l\'horizontale).', 'Serre les fessiers pour revenir debout, sans cambrer en haut.'],
    respiration: 'Inspire en descendant, souffle en remontant.',
    rythme: '3 s pour descendre, 1 s pour remonter.',
    sensations: 'Étirement de l\'arrière des cuisses en bas, fessiers en remontant.',
    erreurs: ['Arrondir le dos (regarder ses pieds).', 'Plier les genoux comme un squat.', 'Descendre trop bas.'],
    facile: 'Amplitude réduite ; mains sur une chaise devant toi.',
    progression: 'Tempo plus lent → haltère tenu à deux mains le long des cuisses (soulevé de terre roumain).',
    arret: 'Arrête si douleur dans le bas du dos.'
  },
  abduction: {
    nom: 'Abduction debout au mur', zone: 'Côté des hanches', img: ['23','24'], mat: 'Mur (appui)',
    but: 'Renforcer le moyen fessier en position debout, comme dans la vie de tous les jours.',
    install: 'Debout, une main à plat sur le mur pour l\'équilibre, pieds joints, main libre sur la hanche.',
    etapes: ['Lève la jambe extérieure sur le côté, jambe tendue, pied fléchi et orteils vers l\'avant.', 'Monte à 30° environ : pas besoin d\'aller plus haut.', 'Le buste reste droit, sans se pencher du côté opposé.', 'Redescends lentement sans reposer le pied.'],
    respiration: 'Souffle en montant, inspire en descendant.',
    rythme: '1 s pour monter, 1 s de pause, 2 s pour descendre.',
    sensations: 'Côté de la hanche de la jambe qui bouge, et aussi de la jambe d\'appui.',
    erreurs: ['Se pencher pour lever plus haut.', 'Orteils vers le plafond.', 'Utiliser l\'élan.'],
    facile: 'Amplitude réduite, deux mains sur le mur.',
    progression: 'Pause de 3 s → mini-élastique aux chevilles → sans appui.',
    arret: 'Arrête si douleur dans la hanche.'
  },
  goblet: {
    nom: 'Squat goblet (haltère)', zone: 'Fessiers · Cuisses', img: ['25','26'], mat: 'Haltère',
    but: 'La suite de l\'assis-debout : ajouter du poids pour continuer à progresser.',
    install: 'Debout, pieds un peu plus larges que les épaules, un haltère tenu verticalement à deux mains contre la poitrine, coudes vers le bas.',
    etapes: ['Descends en poussant les genoux vers l\'extérieur, buste droit.', 'Les coudes passent entre les genoux en bas.', 'Cuisses parallèles au sol (ou plus haut si besoin).', 'Pousse dans les talons pour remonter, fessiers serrés en haut.'],
    respiration: 'Inspire en descendant, souffle en remontant.',
    rythme: '2 s pour descendre, 1 s pour remonter.',
    sensations: 'Cuisses et fessiers ; le haut du dos travaille pour tenir l\'haltère.',
    erreurs: ['Genoux qui rentrent.', 'Haltère qui s\'éloigne de la poitrine.', 'Talons qui décollent.'],
    facile: 'Haltère plus léger, ou assis-debout sur chaise avec haltère.',
    progression: 'Haltère plus lourd → pause de 2 s en bas → deuxième haltère.',
    arret: 'Arrête si douleur au genou ou au dos.'
  },
  pontHaltere: {
    nom: 'Pont fessier avec haltère', zone: 'Fessiers', img: ['27','28'], mat: 'Tapis + haltère',
    but: 'La suite du pont fessier : le poids posé sur le bassin rend l\'exercice plus efficace pour les fessiers.',
    install: 'Comme le pont fessier, avec l\'haltère posé en travers du bassin (sur les os des hanches), tenu à deux mains. Mets un pull plié entre l\'haltère et le bassin si ça appuie.',
    etapes: ['Pousse dans les talons et serre les fessiers pour monter.', 'Alignement épaules-bassin-genoux en haut, sans cambrer.', 'Tiens 1–2 s en haut.', 'Redescends lentement.'],
    respiration: 'Souffle en montant, inspire en descendant.',
    rythme: '1 s pour monter, 2 s de pause, 2 s pour descendre.',
    sensations: 'Fessiers avant tout.',
    erreurs: ['Cambrer le dos.', 'Haltère qui roule (tiens-le bien).', 'Pieds trop loin du bassin.'],
    facile: 'Pont sans haltère avec pause plus longue.',
    progression: 'Haltère plus lourd → épaules surélevées sur un canapé bas et stable (hip thrust) → une jambe.',
    arret: 'Arrête si douleur dans le bas du dos.'
  }
};

// Échauffement commun (≈5 min)
const ECHAUFFEMENT = [
  { nom: 'Marche sur place en montant les genoux', duree: '1 min' },
  { nom: 'Cercles de hanches (mains sur les hanches)', duree: '30 s dans chaque sens' },
  { nom: 'Balancement de jambe avant-arrière, main au mur', duree: '10 par jambe' },
  { nom: 'Squat sumo léger, amplitude réduite', duree: '10 répétitions' },
  { nom: 'Pont fessier léger', duree: '10 répétitions' }
];

// Séances. Chaque exo : clé, séries, reps (ou secondes), repos (s), parCote
const SEANCES = {
  A: { nom: 'Séance A', sous: 'Fessiers · base', couleur: 'sauge', duree: 30,
    but: 'Poser les bases : sentir tes fessiers travailler sur les mouvements fondamentaux.',
    exos: [
      { k: 'pont', series: 3, reps: '12', repos: 60 },
      { k: 'chaise', series: 3, reps: '10', repos: 60 },
      { k: 'extension', series: 3, reps: '12', repos: 45, parCote: true },
      { k: 'lateral', series: 2, reps: '15', repos: 45, parCote: true }
    ],
    court: ['pont', 'chaise', 'extension'] },
  B: { nom: 'Séance B', sous: 'Corps entier', couleur: 'rose', duree: 30,
    but: 'Équilibrer le corps : jambes, haut du corps, tronc, sans oublier les hanches.',
    exos: [
      { k: 'sumo', series: 3, reps: '12', repos: 60 },
      { k: 'mur', series: 3, reps: '10', repos: 45 },
      { k: 'coquille', series: 3, reps: '15', repos: 30, parCote: true },
      { k: 'chien', series: 2, reps: '8', repos: 45, parCote: true },
      { k: 'mollets', series: 2, reps: '15', repos: 30 }
    ],
    court: ['sumo', 'mur', 'coquille'] },
  C: { nom: 'Séance C', sous: 'Fessiers · hanches', couleur: 'terracotta', duree: 32,
    but: 'Travailler chaque jambe séparément et renforcer la stabilité des hanches.',
    exos: [
      { k: 'fente', series: 3, reps: '8', repos: 60, parCote: true },
      { k: 'charniere', series: 3, reps: '12', repos: 60 },
      { k: 'abduction', series: 3, reps: '12', repos: 30, parCote: true },
      { k: 'pont', series: 2, reps: '12 (pause 3 s en haut)', repos: 45 }
    ],
    court: ['fente', 'charniere', 'abduction'] },
  D: { nom: 'Séance D', sous: 'Légère · facultative', couleur: 'sable', duree: 22,
    but: 'Journée douce (4ᵉ jour) : mobilité et activation, sans fatigue supplémentaire.',
    exos: [
      { k: 'coquille', series: 2, reps: '15', repos: 30, parCote: true },
      { k: 'pont', series: 2, reps: '12', repos: 45 },
      { k: 'chien', series: 2, reps: '6', repos: 30, parCote: true },
      { k: 'mollets', series: 2, reps: '12', repos: 30 }
    ],
    court: ['coquille', 'pont'] }
};

// Remplacements quand l'haltère est disponible ET la semaine ≥ 7 (voir progression)
const HALTERE_SWAP = { chaise: 'goblet', pont: 'pontHaltere' };

// Consignes semaine par semaine (12 premières semaines)
const SEMAINES = [
  { s: 1, titre: 'Apprendre', consigne: '2 séries par exercice seulement. Concentre-toi sur la technique et sur ce que tu sens. Reste loin de la fatigue.' },
  { s: 2, titre: 'Apprendre', consigne: 'Toujours 2 séries. Filme-toi de côté une fois pour vérifier le dos plat sur la charnière et le pont.' },
  { s: 3, titre: 'Installer', consigne: 'Passe à 3 séries (là où la fiche l\'indique). Répétitions en bas de la fourchette.' },
  { s: 4, titre: 'Installer', consigne: '3 séries. Ajoute 1 s de pause en haut sur le pont fessier et la coquille.' },
  { s: 5, titre: 'Renforcer', consigne: 'Si les 3 séries passent avec 2–3 répétitions en réserve : +2 répétitions par série.' },
  { s: 6, titre: 'Renforcer', consigne: 'Ralentis la descente à 3 s sur squat sumo, assis-debout et charnière.' },
  { s: 7, titre: 'Ajouter du poids', consigne: 'Si tu as l\'haltère : le pont fessier devient pont avec haltère, l\'assis-debout devient squat goblet (léger). Reviens à 2 séries la première fois.' },
  { s: 8, titre: 'Ajouter du poids', consigne: '3 séries avec l\'haltère. Fente arrière : essaie une série sans appui.' },
  { s: 9, titre: 'Varier', consigne: 'Pont avec haltère : pause de 3 s en haut. Élévation latérale : mini-élastique si tu en as un.' },
  { s: 10, titre: 'Varier', consigne: 'Charnière de hanche avec l\'haltère (soulevé de terre roumain léger), 2 séries.' },
  { s: 11, titre: 'Consolider', consigne: 'Garde ce qui marche. Pas de nouveauté : vise la régularité et la qualité.' },
  { s: 12, titre: 'Bilan 3 mois', consigne: 'Semaine normale + bilan : force, régularité, ressenti. On ajuste la suite ensemble.' }
];

const FEUILLE_ROUTE = [
  { periode: 'Mois 4–6', points: ['Deuxième haltère ou haltères réglables : squats et fentes deviennent plus lourds.', 'Hip thrust épaules sur un canapé bas et stable, si confortable.', 'Option 4 jours : séance D devient une vraie séance (A′ = fessiers avec haltère).', 'Bilan 6 mois : mesures facultatives, photos facultatives, force réelle.'] },
  { periode: 'Mois 7–9', points: ['Séries de 6–10 répétitions plus lourdes sur 2 exercices clés (pont/hip thrust, squat goblet).', 'Exercices unilatéraux sans appui.', 'Une semaine plus légère toutes les 6–8 semaines.'] },
  { periode: 'Mois 10–12', points: ['Programme stable, 3–4 séances, progression lente et sûre.', 'Bilan 12 mois : ce qui a changé (force, aisance, silhouette selon ton ressenti), ce qui reste incertain, et la suite.'] }
];

const ACHATS = [
  { item: 'Tapis de sol (épaisseur 8–10 mm)', utilite: 'Confort pour tous les exercices au sol.', alt: 'Serviette épaisse pliée sur un tapis de salon.', prix: '15–25 €' },
  { item: '1 haltère de 6 à 8 kg (ou un haltère réglable 2–10 kg)', utilite: 'Dès la semaine 7 : pont fessier avec haltère, squat goblet, charnière.', alt: 'Bouteille de 5 L remplie d\'eau ou sac à dos lesté.', prix: '20–35 € (réglable : 40–80 €)' },
  { item: 'Mini-élastiques (lot de 3 résistances)', utilite: 'Rendent coquille, élévations latérales et abductions bien plus efficaces.', alt: 'Pause plus longue en haut du mouvement.', prix: '10–15 €' },
  { item: 'Plus tard : deuxième haltère ou paire réglable', utilite: 'À partir du mois 4, quand un seul haltère devient trop léger.', alt: 'Ralentir le tempo et ajouter des pauses.', prix: '40–90 €' }
];
// Prix indicatifs, Belgique, septembre 2026.

// ===== Nutrition =====
const NUTRI = {
  reperes: [
    'Estimation de départ (à ajuster, pas une vérité) : environ 1 750 kcal pour maintenir ton poids ; environ 2 000–2 100 kcal pour prendre du poids doucement.',
    'Protéines : 80–100 g par jour (≈ 1,6–2 g par kilo). Le shaker compte dedans.',
    'Le reste : glucides (riz, pâtes, pain, pommes de terre, fruits) et bonnes graisses (huile d\'olive, avocat, oléagineux, œufs).',
    'Rythme visé : +0,25 à +0,5 kg par semaine en moyenne. Plus vite n\'est pas mieux.',
    'On regarde la moyenne de 2–3 pesées par semaine sur 3–4 semaines, jamais une seule pesée.'
  ],
  ajustement: [
    'Moyenne qui monte de 0,25–0,5 kg/semaine : on ne change rien.',
    'Moins de 0,2 kg/semaine sur 3–4 semaines : +150 à +200 kcal (une collation en plus).',
    'Plus de 0,7 kg/semaine : −150 kcal (collation plus légère), sans supprimer de repas.',
    'Appétit, digestion, énergie et sommeil comptent autant que la balance.'
  ],
  autour: 'Avant la séance (1–2 h) : un repas ou une collation avec des glucides. Après : un repas normal dans les 2 heures, ou le shaker si le repas est loin. Pas d\'horaire rigide.',
  shaker: [
    'Classique : 250 ml de lait (ou boisson végétale enrichie), 1 dose de whey ou 150 g de skyr, 1 banane, 30 g de flocons d\'avoine, 1 c. à s. de beurre de cacahuète ≈ 550 kcal · 35 g de protéines.',
    'Petit appétit : 200 ml de lait, 1 dose de whey, 1 c. à s. de miel, 1 c. à s. de beurre de cacahuète ≈ 380 kcal · 30 g de protéines.',
    'Sans lactose : boisson d\'avoine enrichie, protéine végétale (pois), 1 banane, 20 g d\'amandes en poudre ≈ 480 kcal · 28 g de protéines.',
    'Le shaker est une aide, pas une obligation : si tu manges assez, tu peux le sauter.'
  ],
  menu: [
    { jour: 'Lundi', pdj: 'Porridge banane-cacahuète', dej: 'Bowl poulet, riz, avocat', diner: 'Pâtes au thon et petits pois', coll: 'Shaker + 1 poignée d\'amandes' },
    { jour: 'Mardi', pdj: 'Tartines œufs brouillés', dej: 'Restes de pâtes au thon', diner: 'Poulet rôti, pommes de terre, haricots verts', coll: 'Skyr + miel + fruit' },
    { jour: 'Mercredi', pdj: 'Porridge banane-cacahuète', dej: 'Wrap poulet-crudités', diner: 'Dhal de lentilles corail + riz', coll: 'Shaker + 2 dattes' },
    { jour: 'Jeudi', pdj: 'Tartines œufs brouillés', dej: 'Restes de dhal + riz', diner: 'Saumon, riz, brocoli', coll: 'Pain + beurre de cacahuète + banane' },
    { jour: 'Vendredi', pdj: 'Yaourt grec, granola, fruits', dej: 'Bowl poulet, riz, avocat', diner: 'Omelette 3 œufs, pommes de terre sautées, salade', coll: 'Shaker + 1 poignée d\'amandes' },
    { jour: 'Samedi', pdj: 'Pancakes à l\'avoine', dej: 'Wrap poulet-crudités', diner: 'Boulettes de bœuf, semoule, légumes', coll: 'Skyr + miel + fruit' },
    { jour: 'Dimanche', pdj: 'Tartines œufs brouillés', dej: 'Restes de boulettes', diner: 'Soupe de légumes + pain + fromage + œuf dur', coll: 'Shaker + 2 dattes' }
  ],
  recettes: [
    { nom: 'Porridge banane-cacahuète', portions: 1, temps: '7 min', ing: ['60 g de flocons d\'avoine', '250 ml de lait (ou boisson végétale)', '1 banane', '1 c. à s. de beurre de cacahuète', '1 c. à c. de miel', 'Cannelle'], etapes: ['Chauffe les flocons et le lait 4–5 min en remuant.', 'Ajoute la banane écrasée et le beurre de cacahuète.', 'Miel et cannelle par-dessus.'], subst: 'Beurre d\'amande à la place du beurre de cacahuète ; poire à la place de la banane.', nutri: '≈ 560 kcal · 20 g P · 80 g G · 18 g L' },
    { nom: 'Tartines œufs brouillés', portions: 1, temps: '8 min', ing: ['2 tranches de pain complet', '3 œufs', '10 g de beurre', '30 g de fromage râpé', 'Sel, poivre', '1 fruit à côté'], etapes: ['Bats les œufs avec sel et poivre.', 'Cuis à feu doux avec le beurre en remuant jusqu\'à ce que ce soit crémeux.', 'Sur le pain grillé, fromage par-dessus.'], subst: 'Pain sans gluten ; feta à la place du râpé.', nutri: '≈ 620 kcal · 33 g P · 45 g G · 33 g L' },
    { nom: 'Yaourt grec, granola, fruits', portions: 1, temps: '3 min', ing: ['200 g de yaourt grec entier', '50 g de granola', '1 banane ou 100 g de fruits rouges', '1 c. à s. de miel', '15 g de noix'], etapes: ['Tout dans un bol.'], subst: 'Skyr (plus de protéines, moins de gras) ; yaourt de coco si sans lactose.', nutri: '≈ 600 kcal · 22 g P · 70 g G · 25 g L' },
    { nom: 'Pancakes à l\'avoine', portions: 1, temps: '15 min', ing: ['60 g de flocons d\'avoine mixés', '1 banane', '2 œufs', '50 ml de lait', '½ c. à c. de levure', 'Beurre de cacahuète et fruits pour servir'], etapes: ['Mixe tous les ingrédients.', 'Cuis de petits pancakes 2 min de chaque côté à feu moyen.', 'Sers avec beurre de cacahuète et fruits.'], subst: 'Farine de blé à la place de l\'avoine mixée.', nutri: '≈ 650 kcal · 27 g P · 75 g G · 26 g L' },
    { nom: 'Bowl poulet, riz, avocat', portions: 2, temps: '25 min', ing: ['300 g de blanc de poulet', '160 g de riz cru', '1 avocat', '1 concombre', '200 g de tomates cerises', '2 c. à s. d\'huile d\'olive', 'Jus de citron, paprika, sel'], etapes: ['Cuis le riz.', 'Coupe le poulet en morceaux, paprika, sel, poêle 8–10 min avec 1 c. à s. d\'huile.', 'Assemble avec l\'avocat, le concombre, les tomates, l\'huile restante et le citron.'], subst: 'Pois chiches rôtis à la place du poulet ; quinoa à la place du riz.', nutri: 'Par portion ≈ 640 kcal · 42 g P · 68 g G · 22 g L' },
    { nom: 'Pâtes au thon et petits pois', portions: 2, temps: '15 min', ing: ['180 g de pâtes crues', '2 boîtes de thon (2 × 110 g égoutté)', '150 g de petits pois surgelés', '100 ml de crème (ou crème végétale)', '1 gousse d\'ail', '30 g de parmesan', 'Huile d\'olive, poivre'], etapes: ['Cuis les pâtes, ajoute les petits pois 3 min avant la fin.', 'Chauffe ail + thon + crème 3 min.', 'Mélange tout, parmesan, poivre.'], subst: 'Saumon en boîte ; crème de soja.', nutri: 'Par portion ≈ 650 kcal · 45 g P · 72 g G · 20 g L' },
    { nom: 'Poulet rôti, pommes de terre, haricots verts', portions: 2, temps: '40 min', ing: ['2 hauts de cuisse de poulet (400 g)', '500 g de pommes de terre', '250 g de haricots verts', '2 c. à s. d\'huile d\'olive', 'Ail, thym, sel, poivre'], etapes: ['Four 200 °C : poulet + pommes de terre en quartiers avec huile, ail, thym, 35 min.', 'Haricots à la vapeur ou à l\'eau 8 min.'], subst: 'Cuisses de dinde ; patate douce.', nutri: 'Par portion ≈ 600 kcal · 40 g P · 50 g G · 26 g L' },
    { nom: 'Wrap poulet-crudités', portions: 1, temps: '8 min', ing: ['1 grande tortilla', '120 g de poulet cuit (restes)', '¼ d\'avocat', 'Salade, tomate, carotte râpée', '1 c. à s. de sauce yaourt (yaourt + citron + sel)'], etapes: ['Étale la sauce, dispose le reste, roule serré.', 'Passe 1 min à la poêle pour dorer si tu veux.'], subst: 'Houmous à la place de la sauce ; œufs durs à la place du poulet.', nutri: '≈ 520 kcal · 36 g P · 45 g G · 20 g L' },
    { nom: 'Dhal de lentilles corail + riz', portions: 3, temps: '25 min', ing: ['250 g de lentilles corail', '1 oignon', '2 gousses d\'ail', '1 c. à s. de curry', '400 ml de lait de coco', '400 g de tomates concassées', '240 g de riz cru', 'Huile, sel'], etapes: ['Fais revenir oignon + ail + curry 3 min.', 'Ajoute lentilles, tomates, lait de coco, 300 ml d\'eau ; 18 min à feu doux.', 'Sers avec le riz.'], subst: 'Pois chiches ; crème végétale à la place du lait de coco.', nutri: 'Par portion ≈ 650 kcal · 24 g P · 95 g G · 20 g L' },
    { nom: 'Saumon, riz, brocoli', portions: 1, temps: '20 min', ing: ['150 g de saumon', '80 g de riz cru', '200 g de brocoli', '1 c. à s. d\'huile d\'olive', 'Citron, sel, poivre'], etapes: ['Riz à cuire.', 'Saumon à la poêle 4 min par côté (ou four 12 min à 200 °C).', 'Brocoli vapeur 6 min, huile et citron.'], subst: 'Truite ; cabillaud + 1 c. à s. d\'huile en plus.', nutri: '≈ 700 kcal · 42 g P · 68 g G · 28 g L' },
    { nom: 'Omelette 3 œufs, pommes de terre sautées', portions: 1, temps: '20 min', ing: ['3 œufs', '250 g de pommes de terre', '30 g de fromage', '1 c. à s. d\'huile + 10 g de beurre', 'Salade verte'], etapes: ['Pommes de terre en dés, poêle 15 min avec l\'huile.', 'Omelette au beurre, fromage dedans.'], subst: 'Patate douce ; tofu brouillé.', nutri: '≈ 680 kcal · 30 g P · 55 g G · 36 g L' },
    { nom: 'Boulettes de bœuf, semoule, légumes', portions: 3, temps: '30 min', ing: ['450 g de bœuf haché (ou agneau)', '1 oignon, persil, cumin, sel', '1 œuf', '240 g de semoule', '1 courgette, 2 carottes', '400 g de tomates concassées', 'Huile d\'olive'], etapes: ['Mélange viande, oignon, persil, cumin, œuf ; forme des boulettes.', 'Dore-les 5 min, ajoute légumes + tomates, 15 min à couvert.', 'Semoule : même volume d\'eau bouillante, 5 min, 1 c. à s. d\'huile.'], subst: 'Poulet haché ; boulgour.', nutri: 'Par portion ≈ 680 kcal · 40 g P · 65 g G · 28 g L' },
    { nom: 'Soupe de légumes, pain, fromage, œuf dur', portions: 2, temps: '25 min', ing: ['600 g de légumes (carotte, poireau, courgette, pomme de terre)', '1 cube de bouillon', '2 œufs', '2 tranches de pain complet', '60 g de fromage', '1 c. à s. d\'huile d\'olive'], etapes: ['Légumes en morceaux, bouillon à couvert 20 min, mixe.', 'Œufs durs 9 min.', 'Sers avec pain, fromage et un filet d\'huile.'], subst: 'Lentilles dans la soupe pour plus de protéines.', nutri: 'Par portion ≈ 520 kcal · 26 g P · 50 g G · 24 g L' }
  ],
  courses: {
    'Protéines': ['Blanc de poulet 300 g', 'Hauts de cuisse 400 g', 'Bœuf haché 450 g', 'Saumon 150 g', 'Thon 2 boîtes', '18 œufs', 'Skyr / yaourt grec 1 kg', 'Fromage râpé + fromage 200 g', 'Whey ou protéine végétale'],
    'Féculents': ['Riz 1 kg', 'Pâtes 500 g', 'Semoule 500 g', 'Flocons d\'avoine 1 kg', 'Pain complet', 'Tortillas', 'Granola', 'Pommes de terre 1,5 kg'],
    'Légumes & fruits': ['Avocats ×3', 'Bananes ×7', 'Fruits rouges / fruits de saison', 'Concombre, tomates cerises', 'Brocoli, haricots verts, petits pois surgelés', 'Carottes, courgette, poireau, oignons, ail', 'Salade', 'Citrons', 'Dattes'],
    'Épicerie': ['Lentilles corail 250 g', 'Tomates concassées ×2', 'Lait de coco', 'Beurre de cacahuète', 'Amandes, noix', 'Miel', 'Huile d\'olive, beurre', 'Lait / boisson végétale 2 L', 'Épices : curry, cumin, paprika, cannelle, thym']
  },
  prep: ['Dimanche : cuis 500 g de riz et 300 g de poulet pour les bowls et wraps de la semaine.', 'Fais le dhal en triple portion : 3 repas prêts.', 'Œufs durs ×4 au frigo pour les collations et la soupe.', 'Portionne les flocons d\'avoine + cannelle dans des bocaux pour le porridge du matin.'],
  collations: ['Pain + beurre de cacahuète + banane', 'Skyr + miel + fruit', 'Poignée d\'amandes + 2 dattes', 'Fromage + pain + fruit', 'Le shaker (voir variantes)']
};

const SOURCES = [
  { t: 'NHS — Appendicitis (reprise d\'activité après opération)', u: 'https://www.nhs.uk/conditions/appendicitis/' },
  { t: 'ACSM — Resistance Training Guidelines (2026)', u: 'https://acsm.org/resistance-training-guidelines-update-2026/' },
  { t: 'NIDDK — Factors Affecting Weight & Health', u: 'https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/factors-affecting-weight-health' },
  { t: 'OMS — Recommandations d\'activité physique pour les adultes', u: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' }
];
// ===== Nos routines — données (Mohamed + Firdaous) =====
// Les données de Firdaous (EXOS, SEANCES, ECHAUFFEMENT, ACHATS…) viennent de data.js (programme existant).

const PROFILS_DEFAUT = {
  mohamed: {
    id: 'mohamed', prenom: 'Mohamed', sexe: 'H', age: 23, taille: 185, poidsDepart: 101, objectifPoids: 85, objectifMois: 6,
    jalon: { poids: 91, mois: 3, texte: 'Perdre environ 10 kg en 3 mois (ambition, pas garantie : ≈ 0,8 kg/semaine, haut de la fourchette raisonnable).' },
    activite: 1.5, kcalCible: 2400, protCible: 175, repasParJour: 2, difficulteDefaut: 'difficile', dureeDefaut: 60,
    ton: 'direct', lieu: 'salle', cardio: 'jours-off',
    priorites: ['bras', 'jambes', 'fessiers', 'ventre (tour de taille)'],
    notes: 'Haut du corps au poids du corps de préférence, jambes aux machines. Café avant l\'entraînement. Aime le sucre. Deux repas par jour : le matin (riche en protéines) et un second terminé vers 18 h (souple jusqu\'à 19 h).',
    niveau: { tractions: 2, pompes: 15 }
  },
  firdaous: {
    id: 'firdaous', prenom: 'Firdaous', sexe: 'F', age: 23, taille: 160, poidsDepart: 50, objectifPoids: 60, objectifMois: 6,
    jalon: { poids: 55, mois: 3, texte: 'Atteindre ≈ 60 kg en 6 mois ou plus (≈ 0,35 kg/semaine), prise graduelle et harmonieuse.' },
    activite: 1.45, kcalCible: 2100, protCible: 90, repasParJour: 3, difficulteDefaut: 'moyen', dureeDefaut: 35,
    ton: 'bienveillant', lieu: 'maison', cardio: 'aucun',
    priorites: ['fessiers', 'stabilité des hanches', 'force'],
    notes: 'Entraînement à la maison (tapis, haltère, chaise). Shaker quotidien inclus dans le total. Trois repas + shaker.',
    niveau: {}
  }
};

const SERIES_PAR_NIVEAU = { facile: 2, moyen: 3, difficile: 4 };
const NIVEAU_LABEL = { facile: 'Facile · 2 séries', moyen: 'Moyen · 3 séries', difficile: 'Difficile · 4 séries' };

// ===== Exercices de Mohamed (salle) =====
const EXOS_M = {
  pompes: { nom: 'Pompes au sol', mat: 'Poids du corps', zone: 'Pectoraux · Triceps · Épaules', reps: '8–12', repos: 90,
    tech: ['Mains un peu plus larges que les épaules, corps gainé en une ligne.', 'Descends poitrine à 5 cm du sol, coudes à 45°.', 'Pousse fort, sans casser les hanches.'],
    effort: '2 reps en réserve (jamais à l\'échec sur la première série).', facile: 'Pompes mains surélevées sur un banc.', dur: 'Pompes pieds surélevés, puis lestées (disque sur le dos).', alt: 'Développé couché haltères si l\'espace manque.' },
  pompesSerre: { nom: 'Pompes prise serrée', mat: 'Poids du corps', zone: 'Triceps · Pectoraux', reps: '6–10', repos: 90,
    tech: ['Mains sous les épaules, coudes collés au corps.', 'Descente 2 s, poussée explosive.'], effort: '2 reps en réserve.', facile: 'Mains surélevées.', dur: 'Pieds surélevés.', alt: 'Extension triceps poulie.' },
  dips: { nom: 'Dips sur barres (assistés si besoin)', mat: 'Barres parallèles / machine assistée', zone: 'Pectoraux bas · Triceps', reps: '6–10', repos: 90,
    tech: ['Buste légèrement penché, épaules basses.', 'Descends jusqu\'à 90° de coude, pas plus si les épaules tirent.'], effort: '2 reps en réserve.', facile: 'Dips sur banc, pieds au sol.', dur: 'Dips lestés.', alt: 'Pompes déclinées.' },
  tractionsNeg: { nom: 'Tractions négatives', mat: 'Barre fixe (+ marche/box)', zone: 'Dos · Biceps', reps: '4–6 descentes de 5 s', repos: 120,
    tech: ['Monte avec les pieds (box), menton au-dessus de la barre.', 'Descends le plus lentement possible (compte 5 s).', 'Bras tendus en bas, épaules engagées.'], effort: 'Arrête la série quand la descente passe sous 3 s.', facile: 'Descentes de 3 s.', dur: 'Descentes de 8 s, puis traction complète + négative.', alt: 'Tirage vertical machine, prise pronation.' },
  tractionsAssist: { nom: 'Tractions assistées (élastique ou machine)', mat: 'Élastique / machine assistée', zone: 'Dos · Biceps', reps: '6–8', repos: 120,
    tech: ['Assistance juste suffisante pour 6 reps propres.', 'Poitrine vers la barre, coudes vers les hanches.', 'Réduis l\'assistance quand tu fais 8 reps sur toutes les séries.'], effort: '1–2 reps en réserve.', facile: 'Plus d\'assistance.', dur: 'Moins d\'assistance → tractions strictes.', alt: 'Tirage vertical.' },
  rowingInv: { nom: 'Rowing inversé (barre basse / Smith)', mat: 'Barre basse ou Smith', zone: 'Dos · Biceps · Arrière d\'épaule', reps: '8–12', repos: 90,
    tech: ['Corps rigide, talons au sol, tire la poitrine à la barre.', 'Serre les omoplates en haut 1 s.'], effort: '2 reps en réserve.', facile: 'Barre plus haute (corps plus vertical).', dur: 'Pieds surélevés, puis lesté.', alt: 'Rowing haltère un bras.' },
  pike: { nom: 'Pompes pike (épaules)', mat: 'Poids du corps', zone: 'Épaules · Triceps', reps: '6–10', repos: 90,
    tech: ['Hanches hautes en V inversé.', 'Tête vers le sol devant les mains, pousse.'], effort: '2 reps en réserve.', facile: 'Angle plus ouvert.', dur: 'Pieds sur un banc.', alt: 'Développé épaules haltères.' },
  curl: { nom: 'Curl biceps haltères', mat: 'Haltères', zone: 'Biceps', reps: '10–12', repos: 60,
    tech: ['Coudes fixes le long du corps.', 'Descente contrôlée 2 s.'], effort: '1–2 reps en réserve.', facile: 'Charge plus légère.', dur: '+1 kg quand 12 reps sur toutes les séries.', alt: 'Curl à la poulie basse.',
    pourquoi: 'Complément avec charge accepté : les tractions travaillent déjà les biceps, mais tes bras sont une priorité et le curl isole le muscle avec une progression facile à mesurer.' },
  triceps: { nom: 'Extension triceps poulie', mat: 'Poulie haute + corde', zone: 'Triceps', reps: '10–12', repos: 60,
    tech: ['Coudes fixes, écarte la corde en bas.', 'Remonte contrôlé.'], effort: '1–2 reps en réserve.', facile: 'Charge plus légère.', dur: '+2,5 kg quand 12 reps sur toutes les séries.', alt: 'Pompes prise serrée sur banc.', pourquoi: 'Complément bras : isole le triceps, muscle qui fait le volume du bras.' },
  lateral: { nom: 'Élévations latérales haltères', mat: 'Haltères légers', zone: 'Épaules', reps: '12–15', repos: 60,
    tech: ['Coudes légèrement pliés, monte jusqu\'à l\'horizontale.', 'Pas d\'élan du buste.'], effort: '2 reps en réserve.', facile: 'Charge plus légère.', dur: '+1 kg.', alt: 'Élévations latérales poulie.', pourquoi: 'Complément : les épaules larges équilibrent visuellement la taille ; le poids du corps les travaille peu de côté.' },
  planche: { nom: 'Planche (gainage)', mat: 'Poids du corps', zone: 'Tronc', reps: '30–60 s', repos: 60, type: 'gainage',
    tech: ['Coudes sous les épaules, fessiers serrés, bassin neutre.', 'Respire normalement.'], effort: 'Arrête avant que le bassin tombe.', facile: 'Sur les genoux.', dur: 'Planche + toucher d\'épaule.', alt: 'Dead bug.' },
  suspension: { nom: 'Relevés de genoux suspendu', mat: 'Barre fixe', zone: 'Abdominaux · Grip', reps: '8–12', repos: 60, type: 'gainage',
    tech: ['Pendu bras tendus, remonte les genoux vers la poitrine en enroulant le bassin.', 'Descente contrôlée, sans balancer.'], effort: '2 reps en réserve.', facile: 'Genoux moins hauts.', dur: 'Jambes tendues.', alt: 'Crunch au sol pieds surélevés.' },
  presse: { nom: 'Presse à cuisses', mat: 'Machine', zone: 'Quadriceps · Fessiers', reps: '8–12', repos: 120,
    tech: ['Pieds largeur d\'épaules, milieu du plateau.', 'Descends jusqu\'à 90° sans décoller le bas du dos.', 'Pousse avec les talons, ne verrouille pas les genoux.'], effort: '2 reps en réserve.', facile: 'Charge plus légère.', dur: '+5 kg quand 12 reps sur toutes les séries.', alt: 'Squat goblet.' },
  legCurl: { nom: 'Leg curl allongé', mat: 'Machine', zone: 'Ischio-jambiers', reps: '10–12', repos: 90,
    tech: ['Hanches collées au coussin.', 'Monte en 1 s, descends en 3 s.'], effort: '1–2 reps en réserve.', facile: 'Charge plus légère.', dur: '+2,5 kg.', alt: 'Soulevé de terre roumain haltères.' },
  hipThrust: { nom: 'Hip thrust (machine ou barre)', mat: 'Machine / barre + banc', zone: 'Fessiers', reps: '8–12', repos: 120,
    tech: ['Haut du dos sur le banc, pieds sous les genoux en haut.', 'Pousse les hanches vers le plafond, menton rentré, pause 1 s en haut.', 'Ne cambre pas : le mouvement finit avec les fessiers, pas le dos.'], effort: '2 reps en réserve.', facile: 'Pont fessier au sol lesté.', dur: '+5 kg quand 12 reps sur toutes les séries.', alt: 'Pont fessier une jambe.' },
  legExt: { nom: 'Leg extension', mat: 'Machine', zone: 'Quadriceps', reps: '12–15', repos: 60,
    tech: ['Dos collé, monte jusqu\'à jambes tendues, 1 s de pause.', 'Descente 3 s.'], effort: '1–2 reps en réserve.', facile: 'Charge plus légère.', dur: '+2,5 kg.', alt: 'Fentes statiques.' },
  molletsDebout: { nom: 'Mollets debout (machine)', mat: 'Machine', zone: 'Mollets', reps: '12–15', repos: 60,
    tech: ['Amplitude complète : talon bas 1 s, pointe haute 1 s.'], effort: '1–2 reps en réserve.', facile: 'Charge plus légère.', dur: '+5 kg.', alt: 'Mollets sur une marche, haltère en main.' },
  hack: { nom: 'Hack squat (ou squat Smith)', mat: 'Machine', zone: 'Quadriceps · Fessiers', reps: '8–10', repos: 120,
    tech: ['Pieds un peu en avant, descends à la parallèle.', 'Pousse dans tout le pied.'], effort: '2 reps en réserve.', facile: 'Amplitude réduite.', dur: '+5 kg.', alt: 'Presse à cuisses pieds bas.' },
  fentes: { nom: 'Fentes marchées haltères', mat: 'Haltères', zone: 'Fessiers · Quadriceps', reps: '8–10 par jambe', repos: 90, unilateral: true,
    tech: ['Grand pas, genou arrière vers le sol.', 'Buste droit, pousse dans le talon avant.'], effort: '2 reps en réserve.', facile: 'Fentes statiques sans haltère.', dur: 'Haltères plus lourds.', alt: 'Fentes bulgares.' },
  rdl: { nom: 'Soulevé de terre roumain haltères', mat: 'Haltères', zone: 'Ischio-jambiers · Fessiers · Bas du dos', reps: '8–12', repos: 120,
    tech: ['Hanches en arrière, dos plat, haltères qui glissent le long des cuisses.', 'Arrête quand l\'arrière des cuisses tire, remonte en serrant les fessiers.'], effort: '2 reps en réserve.', facile: 'Amplitude réduite.', dur: '+2,5 kg par haltère.', alt: 'Leg curl assis.' },
  abduction: { nom: 'Abduction machine', mat: 'Machine', zone: 'Moyen fessier', reps: '12–15', repos: 60,
    tech: ['Buste légèrement penché en avant pour cibler le fessier.', 'Pause 1 s en ouverture, retour lent.'], effort: '1–2 reps en réserve.', facile: 'Charge plus légère.', dur: '+5 kg.', alt: 'Coquille avec élastique.' },
  molletsAssis: { nom: 'Mollets assis', mat: 'Machine', zone: 'Mollets (soléaire)', reps: '12–15', repos: 60,
    tech: ['Amplitude complète, pause en haut.'], effort: '1–2 reps en réserve.', facile: 'Charge plus légère.', dur: '+5 kg.', alt: 'Mollets debout.' }
};

const SEANCES_M = {
  HA: { nom: 'Haut A', sous: 'Poussée + dos', couleur: 'sauge', but: 'Pompes et dips en priorité, tractions en apprentissage, bras en complément.', echauffement: ['5 min vélo ou rameur facile', '2 séries légères de pompes surélevées ×10', '10 rotations d\'épaules avec élastique par sens'],
    exos: [ { k: 'pompes' }, { k: 'tractionsNeg' }, { k: 'dips' }, { k: 'rowingInv' }, { k: 'curl' }, { k: 'planche' } ], prioritaires: ['pompes', 'tractionsNeg', 'rowingInv'] },
  BA: { nom: 'Bas A', sous: 'Quadriceps + fessiers', couleur: 'terracotta', but: 'Presse et hip thrust comme piliers, ischios et mollets pour l\'équilibre.', echauffement: ['5 min vélo facile', '2 séries presse très légère ×12', '10 ponts fessiers au sol'],
    exos: [ { k: 'presse' }, { k: 'hipThrust' }, { k: 'legCurl' }, { k: 'legExt' }, { k: 'molletsDebout' } ], prioritaires: ['presse', 'hipThrust', 'legCurl'] },
  HB: { nom: 'Haut B', sous: 'Tirage + épaules', couleur: 'rose', but: 'Tractions assistées et rowing en priorité, épaules et triceps pour les bras.', echauffement: ['5 min rameur facile', '2 séries rowing inversé corps vertical ×10', '10 rotations d\'épaules avec élastique par sens'],
    exos: [ { k: 'tractionsAssist' }, { k: 'rowingInv' }, { k: 'pompesSerre' }, { k: 'pike' }, { k: 'lateral' }, { k: 'triceps' }, { k: 'suspension' } ], prioritaires: ['tractionsAssist', 'rowingInv', 'pompesSerre'] },
  BB: { nom: 'Bas B', sous: 'Chaîne postérieure + unilatéral', couleur: 'sable', but: 'Hack squat, fentes et roumain : fessiers et ischios, une jambe à la fois.', echauffement: ['5 min vélo facile', '10 squats au poids du corps', '10 fentes statiques par jambe'],
    exos: [ { k: 'hack' }, { k: 'fentes' }, { k: 'rdl' }, { k: 'abduction' }, { k: 'molletsAssis' } ], prioritaires: ['hack', 'fentes', 'rdl'] }
};
// Répartition selon le nombre de séances : 4 = HA BA HB BB ; 3 = alternance sur 2 semaines (HA BA HB / BB HA BA …) pour ne jamais sacrifier toujours le même groupe
const ROTATION_M = { 4: ['HA', 'BA', 'HB', 'BB'], 3: ['HA', 'BA', 'HB', 'BB', 'HA', 'BA', 'HB', 'BB'] };
const ROTATION_F = { 4: ['A', 'B', 'C', 'D'], 3: ['A', 'B', 'C'] };

// Cardio de Mohamed : progression 12 semaines (jours sans musculation)
const CARDIO_M = [
  { sem: [1,2], titre: 'Point de départ', seance: 'Marche rapide 20 min, dont 2 × 3 min sur escalier ou pente à allure « je peux parler ». Note ton ressenti /10.' },
  { sem: [3,4], titre: 'Marche-course', seance: '25 min : alterne 1 min course lente / 2 min marche. Escalier : 3 × 4 min.' },
  { sem: [5,6], titre: 'Marche-course', seance: '25 min : 2 min course / 2 min marche. Escalier : 3 × 5 min.' },
  { sem: [7,8], titre: 'Allonger', seance: '28 min : 3 min course / 1 min marche. Escalier : 2 × 8 min.' },
  { sem: [9,10], titre: 'Continu', seance: '30 min : 5 min course / 1 min marche. Escalier : 20 min continu, allure modérée.' },
  { sem: [11,12], titre: 'Objectif', seance: '30 min de course continue lente (ou 25 min + marche). Escalier : 30 min avec pauses libres.' }
];
const CARDIO_REGLES = ['Intensité repère : tu peux dire une phrase courte, pas chanter (≈ 6/10).', 'Jamais de cardio dur la veille d\'une séance jambes ; le lendemain d\'une séance jambes → marche ou piscine seulement.', 'Semaine « difficile » en musculation = cardio facile. Le cardio ne devient pas dur parce que la muscu l\'est.', 'Douleur au tibia, genou ou hanche → marche 1 semaine, on reprend un palier en dessous.', 'Piscine (20–30 min) et vélo remplacent librement une séance de marche-course.'];

// ===== Recettes communes (quantités pour 1 portion standard ≈ 600–700 kcal). Mohamed = facteur 1.7, Firdaous = 1.0 (ajustable) =====
// ing: [nom, quantité par portion, unité, rayon]
const RECETTES = {
  'Œufs brouillés, pain, avocat': { temps: '10 min', kcal: 640, prot: 32, moment: 'matin', ing: [['Œufs', 3, 'pièce', 'Frais'], ['Pain complet', 80, 'g', 'Boulangerie'], ['Avocat', 0.5, 'pièce', 'Fruits & légumes'], ['Beurre', 10, 'g', 'Frais'], ['Tomate', 1, 'pièce', 'Fruits & légumes']], etapes: ['Œufs battus à feu doux avec le beurre, remue jusqu\'à crémeux.', 'Pain grillé, avocat écrasé dessus, tomate à côté.'], subst: 'Feta à la place du beurre ; galettes de riz si pas de pain.', conserv: 'À manger tout de suite.' },
  'Porridge protéiné banane-cacahuète': { temps: '7 min', kcal: 620, prot: 34, moment: 'matin', ing: [['Flocons d\'avoine', 70, 'g', 'Épicerie'], ['Lait demi-écrémé', 250, 'ml', 'Frais'], ['Banane', 1, 'pièce', 'Fruits & légumes'], ['Beurre de cacahuète', 15, 'g', 'Épicerie'], ['Poudre protéinée', 20, 'g', 'Épicerie'], ['Miel', 10, 'g', 'Épicerie']], etapes: ['Flocons + lait 4–5 min en remuant.', 'Hors du feu : poudre protéinée, banane écrasée, cacahuète, miel.'], subst: 'Boisson d\'avoine si sans lactose ; skyr à la place de la poudre.', conserv: 'Se prépare la veille (overnight) au frigo.' },
  'Skyr, granola, fruits, noix': { temps: '3 min', kcal: 600, prot: 40, moment: 'matin', ing: [['Skyr', 300, 'g', 'Frais'], ['Granola', 50, 'g', 'Épicerie'], ['Fruits rouges surgelés', 100, 'g', 'Surgelés'], ['Noix', 20, 'g', 'Épicerie'], ['Miel', 10, 'g', 'Épicerie']], etapes: ['Tout dans un bol.'], subst: 'Yaourt de soja ; banane à la place des fruits rouges.', conserv: 'Immédiat.' },
  'Pancakes avoine-œufs': { temps: '15 min', kcal: 650, prot: 30, moment: 'matin', ing: [['Flocons d\'avoine', 70, 'g', 'Épicerie'], ['Œufs', 2, 'pièce', 'Frais'], ['Banane', 1, 'pièce', 'Fruits & légumes'], ['Lait demi-écrémé', 50, 'ml', 'Frais'], ['Beurre de cacahuète', 15, 'g', 'Épicerie'], ['Fruits rouges surgelés', 80, 'g', 'Surgelés']], etapes: ['Mixe avoine, œufs, banane, lait.', 'Petits pancakes 2 min par face.', 'Cacahuète et fruits dessus.'], subst: 'Farine à la place de l\'avoine.', conserv: 'Pancakes cuits : 2 jours au frigo.' },
  'Bowl poulet, riz, avocat': { temps: '20 min', kcal: 660, prot: 45, moment: 'repas', ing: [['Blanc de poulet', 160, 'g', 'Frais'], ['Riz (cru)', 80, 'g', 'Épicerie'], ['Avocat', 0.5, 'pièce', 'Fruits & légumes'], ['Concombre', 0.5, 'pièce', 'Fruits & légumes'], ['Tomates cerises', 100, 'g', 'Fruits & légumes'], ['Huile d\'olive', 10, 'ml', 'Épicerie'], ['Citron', 0.25, 'pièce', 'Fruits & légumes']], etapes: ['Riz à cuire.', 'Poulet en dés, paprika, sel : poêle 8–10 min avec l\'huile.', 'Assemble avec avocat, concombre, tomates, citron.'], subst: 'Pois chiches rôtis ; quinoa.', conserv: 'Riz + poulet : 3 jours au frigo.' },
  'Pâtes au thon, petits pois': { temps: '15 min', kcal: 650, prot: 45, moment: 'repas', ing: [['Pâtes (crues)', 90, 'g', 'Épicerie'], ['Thon en boîte (égoutté)', 110, 'g', 'Épicerie'], ['Petits pois surgelés', 80, 'g', 'Surgelés'], ['Crème légère', 50, 'ml', 'Frais'], ['Parmesan', 15, 'g', 'Frais'], ['Ail', 0.5, 'gousse', 'Fruits & légumes']], etapes: ['Pâtes ; petits pois 3 min avant la fin.', 'Ail + thon + crème 3 min.', 'Mélange, parmesan.'], subst: 'Saumon en boîte ; crème de soja.', conserv: '2 jours au frigo.' },
  'Poulet rôti, pommes de terre, haricots': { temps: '15 min actives · 35 min four', kcal: 620, prot: 42, moment: 'repas', ing: [['Hauts de cuisse de poulet', 200, 'g', 'Frais'], ['Pommes de terre', 250, 'g', 'Fruits & légumes'], ['Haricots verts surgelés', 150, 'g', 'Surgelés'], ['Huile d\'olive', 10, 'ml', 'Épicerie'], ['Ail', 1, 'gousse', 'Fruits & légumes']], etapes: ['Four 200 °C : poulet + pommes de terre en quartiers, huile, ail, thym, 35 min.', 'Haricots 8 min à l\'eau.'], subst: 'Dinde ; patate douce.', conserv: '3 jours au frigo.' },
  'Wrap poulet-crudités': { temps: '8 min', kcal: 540, prot: 38, moment: 'repas', ing: [['Tortilla', 1, 'pièce', 'Épicerie'], ['Blanc de poulet', 120, 'g', 'Frais'], ['Avocat', 0.25, 'pièce', 'Fruits & légumes'], ['Salade', 30, 'g', 'Fruits & légumes'], ['Carotte', 0.5, 'pièce', 'Fruits & légumes'], ['Yaourt nature', 40, 'g', 'Frais']], etapes: ['Sauce : yaourt + citron + sel.', 'Étale, garnis, roule serré ; 1 min à la poêle.'], subst: 'Houmous ; œufs durs.', conserv: 'À manger le jour même.' },
  'Dhal de lentilles corail, riz': { temps: '25 min', kcal: 640, prot: 26, moment: 'repas', ing: [['Lentilles corail', 90, 'g', 'Épicerie'], ['Riz (cru)', 70, 'g', 'Épicerie'], ['Lait de coco', 100, 'ml', 'Épicerie'], ['Tomates concassées', 130, 'g', 'Épicerie'], ['Oignon', 0.5, 'pièce', 'Fruits & légumes'], ['Ail', 1, 'gousse', 'Fruits & légumes'], ['Huile d\'olive', 5, 'ml', 'Épicerie']], etapes: ['Oignon + ail + curry 3 min.', 'Lentilles, tomates, lait de coco, eau ; 18 min à feu doux.', 'Riz à côté.'], subst: 'Pois chiches.', conserv: '3 jours au frigo, se congèle.' },
  'Saumon, riz, brocoli': { temps: '20 min', kcal: 700, prot: 42, moment: 'repas', ing: [['Saumon', 150, 'g', 'Frais'], ['Riz (cru)', 80, 'g', 'Épicerie'], ['Brocoli surgelé', 200, 'g', 'Surgelés'], ['Huile d\'olive', 10, 'ml', 'Épicerie'], ['Citron', 0.25, 'pièce', 'Fruits & légumes']], etapes: ['Riz.', 'Saumon 4 min par face.', 'Brocoli vapeur 6 min, huile, citron.'], subst: 'Truite ; cabillaud + 10 ml d\'huile.', conserv: '2 jours au frigo.' },
  'Omelette, pommes de terre sautées, salade': { temps: '20 min', kcal: 680, prot: 30, moment: 'repas', ing: [['Œufs', 3, 'pièce', 'Frais'], ['Pommes de terre', 250, 'g', 'Fruits & légumes'], ['Fromage râpé', 30, 'g', 'Frais'], ['Huile d\'olive', 10, 'ml', 'Épicerie'], ['Salade', 40, 'g', 'Fruits & légumes']], etapes: ['Pommes de terre en dés 15 min à la poêle.', 'Omelette avec le fromage.'], subst: 'Patate douce ; tofu brouillé.', conserv: 'Immédiat.' },
  'Boulettes de bœuf, semoule, légumes': { temps: '30 min', kcal: 680, prot: 40, moment: 'repas', ing: [['Bœuf haché 5 %', 150, 'g', 'Frais'], ['Semoule', 80, 'g', 'Épicerie'], ['Courgette', 0.5, 'pièce', 'Fruits & légumes'], ['Carotte', 1, 'pièce', 'Fruits & légumes'], ['Tomates concassées', 130, 'g', 'Épicerie'], ['Oignon', 0.5, 'pièce', 'Fruits & légumes'], ['Œufs', 0.3, 'pièce', 'Frais'], ['Huile d\'olive', 5, 'ml', 'Épicerie']], etapes: ['Viande + oignon + persil + cumin + œuf → boulettes.', 'Dore 5 min, ajoute légumes + tomates, 15 min à couvert.', 'Semoule : même volume d\'eau bouillante, 5 min.'], subst: 'Poulet haché ; boulgour.', conserv: '3 jours, se congèle.' },
  'Chili de bœuf aux haricots, riz': { temps: '25 min', kcal: 690, prot: 42, moment: 'repas', ing: [['Bœuf haché 5 %', 140, 'g', 'Frais'], ['Haricots rouges (égouttés)', 120, 'g', 'Épicerie'], ['Riz (cru)', 70, 'g', 'Épicerie'], ['Tomates concassées', 150, 'g', 'Épicerie'], ['Oignon', 0.5, 'pièce', 'Fruits & légumes'], ['Poivron', 0.5, 'pièce', 'Fruits & légumes'], ['Huile d\'olive', 5, 'ml', 'Épicerie']], etapes: ['Oignon + poivron 3 min, viande 5 min, cumin-paprika.', 'Tomates + haricots, 15 min.', 'Riz à côté.'], subst: 'Lentilles à la place de la viande.', conserv: '3 jours, se congèle.' },
  'Poulet curry-coco, riz': { temps: '25 min', kcal: 690, prot: 44, moment: 'repas', ing: [['Blanc de poulet', 160, 'g', 'Frais'], ['Riz (cru)', 80, 'g', 'Épicerie'], ['Lait de coco', 100, 'ml', 'Épicerie'], ['Oignon', 0.5, 'pièce', 'Fruits & légumes'], ['Épinards surgelés', 100, 'g', 'Surgelés'], ['Huile d\'olive', 5, 'ml', 'Épicerie']], etapes: ['Oignon 3 min, poulet en dés 5 min, curry.', 'Lait de coco + épinards, 10 min.', 'Riz.'], subst: 'Crevettes ; pois chiches.', conserv: '3 jours.' },
  'Tajine de poulet aux légumes, semoule': { temps: '15 min actives · 30 min mijotage', kcal: 660, prot: 42, moment: 'repas', ing: [['Hauts de cuisse de poulet', 200, 'g', 'Frais'], ['Semoule', 80, 'g', 'Épicerie'], ['Carotte', 1, 'pièce', 'Fruits & légumes'], ['Courgette', 0.5, 'pièce', 'Fruits & légumes'], ['Oignon', 0.5, 'pièce', 'Fruits & légumes'], ['Olives vertes', 20, 'g', 'Épicerie'], ['Huile d\'olive', 8, 'ml', 'Épicerie'], ['Citron', 0.25, 'pièce', 'Fruits & légumes']], etapes: ['Oignon + épices (curcuma, gingembre, cumin) 3 min, poulet doré 5 min.', 'Légumes, olives, citron, 200 ml d\'eau ; 30 min à couvert.', 'Semoule.'], subst: 'Agneau ; pois chiches.', conserv: '3 jours, meilleur réchauffé.' },
  'Steak haché, purée, épinards': { temps: '20 min', kcal: 650, prot: 44, moment: 'repas', ing: [['Bœuf haché 5 %', 160, 'g', 'Frais'], ['Pommes de terre', 300, 'g', 'Fruits & légumes'], ['Épinards surgelés', 150, 'g', 'Surgelés'], ['Lait demi-écrémé', 50, 'ml', 'Frais'], ['Beurre', 10, 'g', 'Frais']], etapes: ['Purée : pommes de terre 15 min, écrase avec lait + beurre.', 'Steak 3 min par face, épinards à la poêle.'], subst: 'Steak de poulet ; purée de patate douce.', conserv: 'Purée 2 jours.' },
  'Soupe de légumes, pain, fromage, œufs durs': { temps: '25 min', kcal: 560, prot: 28, moment: 'repas', ing: [['Légumes à soupe (carotte, poireau, courgette, pomme de terre)', 300, 'g', 'Fruits & légumes'], ['Œufs', 2, 'pièce', 'Frais'], ['Pain complet', 60, 'g', 'Boulangerie'], ['Fromage', 40, 'g', 'Frais'], ['Huile d\'olive', 8, 'ml', 'Épicerie']], etapes: ['Légumes 20 min dans le bouillon, mixe.', 'Œufs durs 9 min.', 'Pain, fromage, filet d\'huile.'], subst: 'Lentilles dans la soupe.', conserv: 'Soupe 3 jours, se congèle.' },
  'Sardines, pain, salade de tomates': { temps: '8 min', kcal: 560, prot: 34, moment: 'repas', ing: [['Sardines en boîte (égouttées)', 100, 'g', 'Épicerie'], ['Pain complet', 90, 'g', 'Boulangerie'], ['Tomate', 2, 'pièce', 'Fruits & légumes'], ['Oignon', 0.25, 'pièce', 'Fruits & légumes'], ['Huile d\'olive', 8, 'ml', 'Épicerie'], ['Citron', 0.25, 'pièce', 'Fruits & légumes']], etapes: ['Tomates + oignon + huile + citron.', 'Sardines sur le pain.'], subst: 'Maquereau ; thon.', conserv: 'Immédiat.' },
  'Shaker de Firdaous (600–700 kcal)': { temps: '3 min', kcal: 650, prot: 38, moment: 'shaker', ing: [['Lait demi-écrémé', 250, 'ml', 'Frais'], ['Banane', 1, 'pièce', 'Fruits & légumes'], ['Dattes', 3, 'pièce', 'Épicerie'], ['Skyr', 100, 'g', 'Frais'], ['Poudre protéinée', 25, 'g', 'Épicerie'], ['Beurre de cacahuète', 20, 'g', 'Épicerie']], etapes: ['Tout au mixeur 30 s.'], subst: 'Variante petite faim (≈ 450 kcal) : sans dattes, 10 g de cacahuète, 200 ml de lait. Sans lactose : boisson d\'avoine + protéine végétale + yaourt de soja.', conserv: 'À boire dans l\'heure, ou 12 h au frigo.' }
};

// Rotation 14 jours. Chaque jour : matin (commun), soir (commun). Mohamed mange matin + soir (facteur 1.7). Firdaous mange matin + midi (restes de la veille ou wrap) + soir + shaker.
const ROTATION_REPAS = [
  { matin: 'Œufs brouillés, pain, avocat', midiF: 'Wrap poulet-crudités', soir: 'Poulet rôti, pommes de terre, haricots' },
  { matin: 'Porridge protéiné banane-cacahuète', midiF: 'Restes : Poulet rôti, pommes de terre, haricots', soir: 'Pâtes au thon, petits pois' },
  { matin: 'Skyr, granola, fruits, noix', midiF: 'Restes : Pâtes au thon, petits pois', soir: 'Dhal de lentilles corail, riz' },
  { matin: 'Œufs brouillés, pain, avocat', midiF: 'Restes : Dhal de lentilles corail, riz', soir: 'Saumon, riz, brocoli' },
  { matin: 'Porridge protéiné banane-cacahuète', midiF: 'Bowl poulet, riz, avocat', soir: 'Boulettes de bœuf, semoule, légumes' },
  { matin: 'Pancakes avoine-œufs', midiF: 'Restes : Boulettes de bœuf, semoule, légumes', soir: 'Omelette, pommes de terre sautées, salade' },
  { matin: 'Skyr, granola, fruits, noix', midiF: 'Sardines, pain, salade de tomates', soir: 'Soupe de légumes, pain, fromage, œufs durs' },
  { matin: 'Œufs brouillés, pain, avocat', midiF: 'Wrap poulet-crudités', soir: 'Chili de bœuf aux haricots, riz' },
  { matin: 'Porridge protéiné banane-cacahuète', midiF: 'Restes : Chili de bœuf aux haricots, riz', soir: 'Poulet curry-coco, riz' },
  { matin: 'Skyr, granola, fruits, noix', midiF: 'Restes : Poulet curry-coco, riz', soir: 'Tajine de poulet aux légumes, semoule' },
  { matin: 'Œufs brouillés, pain, avocat', midiF: 'Restes : Tajine de poulet aux légumes, semoule', soir: 'Steak haché, purée, épinards' },
  { matin: 'Porridge protéiné banane-cacahuète', midiF: 'Bowl poulet, riz, avocat', soir: 'Pâtes au thon, petits pois' },
  { matin: 'Pancakes avoine-œufs', midiF: 'Restes : Pâtes au thon, petits pois', soir: 'Boulettes de bœuf, semoule, légumes' },
  { matin: 'Skyr, granola, fruits, noix', midiF: 'Sardines, pain, salade de tomates', soir: 'Soupe de légumes, pain, fromage, œufs durs' }
];
const FACTEUR_PORTION = { mohamed: 1.8, firdaous: 0.75 };
const RAYONS = ['Fruits & légumes', 'Frais', 'Boulangerie', 'Épicerie', 'Surgelés'];

const ASTUCES = {
  mohamed: [
    { t: 'Le sucre', c: 'Le sucre a sa place DANS un repas, pas entre : dattes ou miel dans le porridge, un dessert avec le repas du soir. Un carré de chocolat noir après le repas coupe l\'envie mieux qu\'un « jamais ».' },
    { t: 'Deux repas, vraiment rassasiants', c: 'Chaque repas ≈ 1 100–1 200 kcal avec 80 g+ de protéines. Si la faim revient à 21 h, c\'est que le second repas était trop léger : augmente le féculent, pas le grignotage.' },
    { t: 'Les bras', c: 'Bras fins = tractions + dips + curl/triceps en fin de séance. Progression par petites marches : +1 rep par série, puis +1 kg. Le volume vient de la constance sur 12 semaines, pas d\'une séance héroïque.' },
    { t: 'Retour à la course', c: 'Lent, deux fois par semaine, jamais le lendemain des jambes. L\'objectif 30 min en continu se gagne en 10–12 semaines sans douleur aux tibias.' },
    { t: 'Le ventre', c: 'Il diminue avec le déficit global et le temps ; aucun exercice ne le cible. Le tour de taille tous les 14 jours dit la vérité mieux que la balance.' },
    { t: 'Récupération', c: 'Semaine difficile = 4 séries : elle exige 7 h de sommeil. Si deux séances de suite tombent en dessous des reps, passe la semaine suivante en moyen.' }
  ],
  firdaous: [
    { t: 'Faible appétit', c: 'Le shaker se boit à petites gorgées pendant 30 min si besoin. Version « petite faim » les jours où ça ne passe pas : mieux vaut 450 kcal bues que 650 sautées.' },
    { t: 'Les fessiers', c: 'Ce qui les fait progresser : la technique (sentir le muscle), puis les séries supplémentaires, puis la charge. Pas l\'inverse.' },
    { t: 'Repas simples', c: 'Les midis sont des restes de la veille : cuisine toujours une portion de plus le soir.' },
    { t: 'Le poids', c: 'La moyenne de deux semaines compte. Une semaine à 0 n\'est pas un échec, trois semaines à 0 = on ajoute une collation.' },
    { t: 'Récupération', c: 'Jamais deux séances fessiers le même jour ni deux jours de suite en difficile. Courbatures fortes → séance suivante en facile.' }
  ]
};

const SOURCES2 = [
  { t: 'CDC — Losing weight (repères de perte progressive)', u: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
  { t: 'NHS — Healthy ways to gain weight', u: 'https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/healthy-ways-to-gain-weight/' },
  { t: 'ACSM — Resistance Training Guidelines (2026)', u: 'https://acsm.org/resistance-training-guidelines-update-2026/' },
  { t: 'OMS — Éthique et gouvernance de l\'IA en santé', u: 'https://www.who.int/publications/i/item/9789240084759' },
  { t: 'NIDDK — Factors affecting weight & health', u: 'https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/factors-affecting-weight-health' }
];
