# Module Caisse – Salle Numérique UNILU

Ce projet est une application web de gestion de caisse conçue spécifiquement pour la Salle Numérique de l'Université de Lubumbashi (UNILU). Elle permet au personnel opérationnel (caissière) et au Super Administrateur de gérer de façon autonome les paiements reçus et les retraits d'argent.

##  Architecture Technique

L'application est entièrement développée en technologies Front-End classiques (HTML, CSS, JavaScript Vanilla).
Elle fonctionne localement dans un navigateur et ne nécessite **aucune installation de serveur ou de base de données** (PHP/MySQL, Node.js, etc.). 

La persistance des données repose sur le **`localStorage`** du navigateur local. Toutes les transactions et clôtures y sont enregistrées sous forme de chaînes JSON.

##  Structure du projet

* `dashboard.html` : L'interface principale. Offre une vue d'ensemble des statistiques actuelles, le solde, un graphique d'activité sur 7 jours et le système de clôture de journée.
* `entree.html` : Page dédiée à l'encaissement (paiement des services : Internet, Impression, Formation par les étudiants/utilisateurs).
* `sortie.html` : Page dédiée à l'enregistrement des retraits (dépenses du personnel, achat matériel, etc.).
* `historique.html` : Interface listant toutes les transactions. Permet la recherche multicritères, le filtrage par dates/catégories et l'exportation en format CSV.
* `style.css` : La feuille de style principale contenant l'esthétique globale de l'interface (thème Blanc/Gris clair et accents Rouges `#CC0000`).
* `app.js` : Le cœur de la logique de l'application. Fournit le "Backend Front-end" avec des fonctions CRUD basées sur le localStorage.
* `salle.png` : Le logo officiel du centre affiché sur les menus.

##  Fonctionnement de la Logique (app.js)

Le fichier `app.js` agit comme l'API interne de l'application et utilise le "Module Pattern" Javascript.

### 1. La base de données (LocalStorage)
L'application utilise deux clés principales dans le cache du navigateur :
- `caisse_unilu_transactions` : Un tableau d'objets (JSON) contenant toutes les opérations courantes (entrées et sorties).
- `caisse_unilu_closures` : Un objet stockant les métadonnées liées aux clôtures de journées afin de conserver un historique figé.

### 2. Le Moteur Principal (CaisseApp)
* `addTransaction(transaction)` : Injecte une nouvelle transaction dans le système, génère un identifiant unique complexe et un horodatage (timestamp) précis, puis met à jour le LocalStorage.
* `getStats()` : Parcourt toutes les transactions du LocalStorage, calcule et retourne le total des entrées, le total des retraits et le solde courant (le tout de manière dynamique).
* `getFilteredTransactions(filters)` : Méthode puissante de tri qui lit le LocalStorage puis applique un filtre dynamique (via `.filter()`) selon les critères fournis par la page de recherche (Dates exactes, recherche textuelle insensible à la casse sur les noms, prénoms ou motifs).

### 3. Le système de PDF et d'impression
* `generateReceipt(transaction)` : Lorsque la caissière enregistre une entrée ou sortie, cette fonction est déclenchée. Elle ouvre dynamiquement une nouvelle fenêtre du navigateur (`window.open`), y injecte une structure HTML/CSS propre et optimisée pour l'impression (via `@media print`) simulant le design d'un reçu, puis attend que l'utilisateur lance l'impression.
* `generateDailyReport(date)` : Même logique que pour le reçu mais conçue pour la clôture. Compile un tableau complet de l'historique du jour sélectionné dans une interface d'impression A4 standard.

### 4. Le mécanisme de Clôture ("Closure System")
Afin de prévenir des fraudes ou des erreurs involontaires :
* Lorsqu'une fin de journée est validée par le bouton de Clôture sur le tableau de bord, l'application fait appel à `closeDay(dateStr)`. 
* Cette méthode compile le solde final et marque ladite journée comme bloquée dans le système (dans la clé `caisse_unilu_closures`).
* Une fois une journée marquée comme fermée (`isDayClosed()` = vrai),  le clic sur une nouvelle entrée, une nouvelle sortie, ou le bouton `supprimer` de l'historique retournera une erreur stricte qui refuse l'action.

### 5. Génération CSV
La fonction `exportCSV` itère sur le JSON extrait du stockage, génère une longue chaîne de caractères modélisant le format standard CSV (valeurs séparées par des virgules et des retours à la ligne), puis l'encapsule dans un objet virtuel `Blob()` (Binary Large Object) forçant le navigateur à la faire télécharger physiquement par l'utilisateur.

##  Installation & Utilisation

1. Placez tous les fichiers `.html`, `.css`, `.js` et `.png` dans un seul et même dossier.
2. Double-cliquez sur `dashboard.html` pour l'ouvrir dans un navigateur web récent (Chrome, Edge ou Firefox).
3. **Important** : Comme les données utilisent le LocalStorage, si vous effacez les données de navigation/cookies de votre navigateur, l'historique de la caisse sera perdu. (D'où l'importance de faire des exports CSV réguliers en attendant un vrai système backend si cela s'avère nécessaire à l'avenir).
