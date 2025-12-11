# Patient Router (Domiciles PA)

Application d'optimisation de tournées pour infirmiers/médecins à la Réunion.

## Fonctionnalités
- Import de patients depuis Excel.
- Visualisation sur carte (Leaflet).
- Optimisation de l'ordre de passage (TSP).
- Correction d'adresses et géocodage manuel.
- **Support Mobile** : Vue liste / Vue carte séparées.
- **Navigation GPS** : Envoi des coordonnées précises à Google Maps.

## Installation

1. Cloner le repo :
   ```bash
   git clone https://github.com/Quentin699/Trajets-PA.git
   ```
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Lancer le serveur local :
   ```bash
   npm run dev
   ```

## Déploiement

Cette application est conçue pour être déployée sur **Vercel**.
1. Poussez vos modifications sur GitHub.
2. Connectez votre compte GitHub sur Vercel.
3. Importez le projet `Trajets-PA`.
4. Déployez ! (Aucune configuration spéciale requise).

