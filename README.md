# CORRUPTION — MVP

## Intentions
- Déduction sociale dans un village de fantasy sombre.
- Confiance fragile, trahison crédible, peu de texte explicatif.
- Chaque partie raconte une histoire émergente portée par les comportements, pas par la performance.

## Résumé du MVP
- Parties multijoueurs répétables, sans progression ni avantages cumulés.
- Certains joueurs sont secrètement corrompus dès le début ; les autres sont sains.
- Village : éliminer tous les corrompus. Corruption : corrompre tout le village. Fin immédiate dès qu’un camp atteint son objectif.

## Classes et personnages
Chaque joueur incarne un personnage avec :
- Une classe publique (fonction sociale claire).
- Une compétence simple utilisable en action majeure.
- Un camp (sain ou corrompu) caché.

Exemples de classes pour le MVP :
- **Veilleur** : note publiquement qui était absent ou silencieux pendant le cycle.
- **Archiviste** : annonce les votes passés et les incohérences repérées.
- **Pourvoyeur** : rapporte des ressources trouvées en exploration et les attribue publiquement.
- **Sentinelle** : peut obliger un joueur présent à expliquer son action avant le vote.

## Boucle de jeu (un cycle)
1. **Allocation** : chaque joueur reçoit 1 point d’action.
2. **Choix d’action majeure** (une seule) :
   - Utiliser sa compétence de classe.
   - Explorer une zone extérieure.
   - Ne rien faire.
   - (Corrompus uniquement) Tenter de corrompre un joueur sain.
3. **Résolution des actions** : effets appliqués, corruption éventuelle invisible.
4. **Phase sociale** :
   - Discussions libres, accusations, défense.
   - Vote collectif pour éliminer exactement un joueur.
5. **Élimination** : le joueur ciblé quitte la partie et ne peut plus agir.
6. **Vérification de fin** : fin immédiate si tous les corrompus sont éliminés ou si tout le village est corrompu. Sinon, nouveau cycle.

## Corruption — règles strictes
- Seuls les joueurs corrompus peuvent corrompre, en dépensant leur action majeure.
- La corruption est immédiate, définitive et invisible.
- Aucune guérison, aucune corruption progressive, aucune source externe.
- Un joueur ne peut être corrompu que par l’action d’un corrompu.

## Exploration
- Quitter le village pour obtenir ressources ou objets utiles.
- Empêche de participer pleinement aux échanges sociaux du cycle.
- Choix stratégique : information sociale perdue contre gains potentiels.

## Élimination
- Décision collective unique par cycle via vote.
- Un joueur éliminé ne peut plus agir ni influencer directement.
- Seul moyen de stopper la propagation de la corruption.

## Lisibilité attendue (interface)
- Afficher clairement : liste des joueurs, leur classe, leur présence/absence.
- Ne jamais afficher : état de corruption, intentions réelles.
- Le doute et l’observation sont la seule voie de déduction.

## Mode test interne (solo)
- Usage exclusif développement : non exposé publiquement.
- Un joueur humain contrôle un personnage ; les autres sont contrôlés par le jeu.
- Les personnages contrôlés par le jeu suivent exactement les mêmes règles.
- Comportements simulés imparfaits : erreurs de jugement, accusations sans preuve, protection d’innocents, propagation prudente de la corruption pour les corrompus.
- Objectif : vérifier la boucle de jeu, observer l’équilibrage et les dynamiques sociales.

## Évolutivité (au-delà du MVP)
- Ajout de nouvelles classes et variantes de corruption.
- Règles avancées, événements extérieurs, modes alternatifs.
- Le socle MVP fonctionne pleinement sans ces ajouts.
