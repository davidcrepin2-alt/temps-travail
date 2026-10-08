# Temps de travail

Application iPhone (web app installable) de calcul du temps de travail hebdomadaire et des heures supplémentaires (HS), avec historique par agent et fiche PDF de demande de validation des HS.

Elle remplace le classeur Excel `Calcul temps travail4.xlsm` et en reprend exactement les calculs.

**Adresse :** https://davidcrepin2-alt.github.io/temps-travail/

---

## Installation sur iPhone

1. Ouvrir l'adresse ci-dessus dans **Safari** (pas Chrome).
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Lancer l'app depuis l'icône une première fois avec du réseau. Elle fonctionne ensuite **hors connexion**.

## Utilisation

| Onglet | Rôle |
|---|---|
| **Semaine** | Choix de l'agent, de la quotité et de la semaine. Pour chaque jour : code horaire, début, fin, coupure, retard en fin de poste. Temps et HS calculés en direct. Boutons *Enregistrer*, *Fiche PDF*, *Remise à zéro*. |
| **Historique** | Semaines enregistrées par agent avec HS de la semaine et cumul. Toucher une semaine pour la rouvrir. |
| **Réglages** | Agents (nom, quotité), codes horaires, temps journalier, ville et motif de la fiche, **export / import de sauvegarde**. |

### Codes horaires par défaut

| Code | Libellé | Type | Détail |
|---|---|---|---|
| JC17 | Journée 8h30-17h00 | Horaire | coupure 45 min |
| JC08 | Journée 8h00-16h30 | Horaire | coupure 45 min |
| A12 | Après-midi 13h30-17h00 | Horaire | sans coupure |
| RHS | Repos heures supplémentaires | Forfait | 0h (donc −7h d'HS) |
| CA | Congé annuel | Absence | non décompté |
| RF | Repos férié | Absence | non décompté |
| FP | Formation professionnelle | Forfait | 7h |
| spé | Horaires variables | Personnalisé | début/fin saisis |
| MA | Maladie | Absence | non décompté |
| RH | Repos hebdomadaire | Absence | non décompté (par défaut samedi et dimanche) |

### Sauvegarde des données

Les données sont stockées **uniquement dans le téléphone** (aucun serveur). Penser à faire régulièrement **Réglages → Exporter** et à ranger le fichier `.json` dans Fichiers / OneDrive. **Réglages → Importer** restaure une sauvegarde (fusion : agents et codes mis à jour, semaines identiques remplacées).

---

## GitHub pour débutant

### Les mots à connaître

| Mot | Ce que ça veut dire ici |
|---|---|
| **GitHub** | Site qui stocke le code de l'app et l'héberge gratuitement. |
| **Dépôt** (*repository*, *repo*) | Le « dossier » de l'app sur GitHub : `davidcrepin2-alt/temps-travail`. |
| **Commit** | Un enregistrement de modifications, avec un message qui les décrit. GitHub garde tous les commits : on peut toujours revenir en arrière. |
| **Push** | Envoyer les commits du PC vers GitHub. |
| **Branche `main`** | La version principale du code. C'est elle qui est publiée. |
| **GitHub Pages** | Le service qui transforme le dépôt en site web à l'adresse `davidcrepin2-alt.github.io/temps-travail`. |
| **Git** | Le logiciel installé sur le PC qui fait les commits et les push. |

### Comment l'app est mise à jour

```
Dossier sur le PC  --(commit + push)-->  Dépôt GitHub  --(GitHub Actions, ~1 min)-->  Site web  --(ouverture de l'app)-->  iPhone
```

À chaque push, GitHub Actions publie le site et y inscrit le **code du commit** (7 caractères, ex. `c2ecd04`). Ce code apparaît en bas de l'onglet **Réglages** de l'app : s'il correspond au dernier commit visible sur GitHub, l'iPhone a bien la dernière version. Toucher le code ouvre le commit sur GitHub.

Le dossier de travail sur le PC est `C:\Users\david\OneDrive\Bureau\Code\temps-travail-app`.

**Méthode simple : demander à Claude.** Dans Claude Code ouvert sur le dossier `Code`, décrire la modification voulue (ex. « ajoute le code N12 de nuit 21h-7h ») et demander de la pousser sur GitHub. Claude modifie, teste, fait le commit et le push.

**Méthode manuelle, pour une petite correction de texte :**
1. Sur la page du dépôt, cliquer sur le fichier (ex. `README.md`), puis sur l'icône **crayon** ✏️.
2. Modifier, puis cliquer sur **Commit changes…** → **Commit changes**.
3. ⚠️ Le PC n'a pas encore cette modification. Avant toute autre modification sur le PC, la récupérer en tapant dans Claude Code :
   `! cd "C:\Users\david\OneDrive\Bureau\Code\temps-travail-app" && git pull`

### Vérifier que la mise en ligne a fonctionné

1. Sur la page du dépôt, onglet **Actions**.
2. La dernière ligne « Déploiement GitHub Pages » doit avoir une coche verte ✅ (un rond jaune 🟡 = en cours, une croix rouge ❌ = échec : cliquer dessus pour voir l'erreur).
3. Ouvrir l'app sur l'iPhone **avec du réseau**, puis **Réglages** : le code de version en bas de page doit être celui du dernier commit. Sinon, fermer complètement l'app (balayer vers le haut) et la rouvrir.

### Retrouver l'historique ou annuler une modification

- **Voir les modifications passées** : sur la page du dépôt, cliquer sur **« X commits »** (en haut à droite de la liste des fichiers). Chaque commit montre ce qui a changé, en vert (ajouté) et en rouge (supprimé).
- **Revenir en arrière** : demander à Claude « annule le dernier commit de l'app et pousse sur GitHub ». Il utilise `git revert`, qui crée un nouveau commit inverse sans rien effacer de l'historique.

### Réglages importants (onglet Settings du dépôt)

| Réglage | Valeur attendue |
|---|---|
| **General → Danger Zone → Change visibility** | **Public** (obligatoire pour GitHub Pages gratuit) |
| **Pages → Build and deployment → Source** | **GitHub Actions** (et non « Deploy from a branch », sinon le code de version affiche « locale (non publiée) ») |

Ne pas renommer le dépôt : l'adresse de l'app changerait et l'icône installée sur l'iPhone ne fonctionnerait plus.

### Problèmes fréquents

| Symptôme | Cause et solution |
|---|---|
| `Invalid username or token. Password authentication is not supported` lors d'un push | GitHub refuse le mot de passe du compte. Il faut un **jeton** : https://github.com/settings/tokens → *Generate new token (classic)* → cocher **repo** → copier le jeton, puis le coller à la place du mot de passe quand Git le demande. Un jeton expire : en générer un nouveau à expiration. |
| `rejected … fetch first` lors d'un push | Le dépôt GitHub contient une modification que le PC n'a pas (faite sur le site). Faire `git pull`, puis refaire le push. |
| Le site affiche **404** | Juste après une activation : attendre quelques minutes. Sinon, vérifier les réglages ci-dessus (dépôt public, Pages sur `main` / root) et l'onglet Actions. |
| L'iPhone garde l'ancienne version (code de version différent du dernier commit) | Ouvrir l'app avec du réseau, la fermer complètement et la rouvrir. Vérifier aussi dans l'onglet Actions que le déploiement a réussi. |
| Croix rouge ❌ dans l'onglet Actions | Un test ou la compilation a échoué : **rien n'a été publié**, l'ancienne version reste en ligne. Cliquer sur la ligne rouge pour voir l'étape en erreur, puis demander à Claude de corriger. |
| Réglages affiche « Version : locale (non publiée) » | Le site n'est pas publié par GitHub Actions : régler **Settings → Pages → Source** sur **GitHub Actions**, puis relancer le déploiement (Actions → Déploiement GitHub Pages → *Run workflow*). |

### À ne jamais faire

- ❌ Mettre sur GitHub un fichier contenant des **noms d'agents** ou des données personnelles (le dépôt est public et visible par tous). C'est pour cela que `sauvegarde-initiale.json` reste uniquement sur le PC.
- ❌ Partager son **jeton** GitHub : il donne le droit de modifier le dépôt.
- ❌ Supprimer le dépôt : l'app disparaîtrait de l'iPhone (les données restent dans le téléphone, mais l'app ne se mettrait plus à jour et ne pourrait plus être réinstallée).

---

## Notes techniques (référence pour la maintenance, y compris par Claude)

### Fichiers

Pile : **Vite 8 + React 19 + TypeScript**, PWA via **vite-plugin-pwa** (Workbox), PDF via **jsPDF 4 + jspdf-autotable 5**, tests via **Vitest**.

```
temps-travail-app/
├── index.html                 Page d'entrée Vite (métadonnées iPhone, <div id="root">)
├── public/                    Icônes, copiées telles quelles
├── src/
│   ├── main.tsx               Démarrage React, enregistrement du service worker
│   ├── App.tsx                État global, navigation par onglets, toasts
│   ├── styles.css             Thème clair/sombre automatique, zones sûres iPhone
│   ├── vite-env.d.ts          Types globaux (__COMMIT_SHA__, __COMMIT_DATE__, window.TT)
│   ├── components/
│   │   ├── WeekView.tsx       Onglet Semaine
│   │   ├── DayCard.tsx        Carte d'un jour
│   │   ├── HistoryView.tsx    Onglet Historique
│   │   ├── SettingsView.tsx   Onglet Réglages (agents, codes, paramètres, sauvegarde)
│   │   ├── CodeEditor.tsx     Édition d'un code horaire
│   │   ├── VersionInfo.tsx    Commit publié (bas de Réglages)
│   │   ├── TabBar.tsx         Barre d'onglets
│   │   ├── inputs.tsx         Champs validés à la sortie (texte, année, HS précédente), listes de durées
│   │   └── ui.ts              Petits utilitaires d'affichage
│   └── lib/
│       ├── types.ts           Types du modèle de données
│       ├── logic.ts           Logique métier pure : calculs, semaines, stockage, import/export
│       ├── logic.test.ts      Tests unitaires (Vitest), dont les valeurs de l'Excel
│       ├── pdf.ts             Fiche PDF (chargée à la demande)
│       └── share.ts           Partage iOS / téléchargement
├── vite.config.ts             Base relative, injection du commit, configuration PWA
├── tsconfig.json              TypeScript de l'app (src/)
├── tsconfig.node.json         TypeScript de vite.config.ts
├── package.json / package-lock.json
└── .github/workflows/pages.yml  CI : npm ci → tests → build → GitHub Pages
```

| Fichier hors dépôt | Rôle |
|---|---|
| `node_modules/`, `dist/` | Dépendances installées et site compilé (régénérés, ignorés par git). |
| `sauvegarde-initiale.json` | **Hors dépôt** (`.gitignore`), présent seulement dans le dossier local OneDrive. Contient les agents réels et l'historique repris de l'Excel. Ne jamais le publier : les noms des agents ne doivent pas être publics. |

### Règles de calcul (reprises des formules de la feuille « Saisie »)

Toutes les durées sont stockées **en minutes** (entiers).

- **Semaine** : semaine ISO, lundi → dimanche. Lundi = `mondayOf(année, semaine)` (équivalent de `DATE(an,1,3)-WEEKDAY(DATE(an,1,3))-5+7*sem`).
- **Temps pour la journée** :
  - code vide ou de type `Absence` → vide (non décompté) ;
  - `Forfait` → durée du forfait ;
  - `Horaire` / `Personnalisé` → `(fin − début) mod 24h − coupure + retard` (gère le travail de nuit).
- **HS jour** = temps jour − temps journalier (420 min) × quotité. Vide si le temps est vide.
- **HS semaine** = somme des HS jour.
- **HS cumul** = HS semaine + HS semaine précédente.
- **HS semaine précédente** : reprise automatiquement du cumul de la dernière semaine enregistrée de l'agent (`previousCumul`). Si elle est saisie à la main, `prevManual = true` et elle n'est plus recalculée. Vider le champ revient au calcul automatique.
- Un forfait (ex. FP = 7h) **n'est pas** proratisé par la quotité, comme dans l'Excel.
- Choisir un code `Horaire` pré-remplit début, fin et coupure, qui restent modifiables (équivalent des lignes 1-2 cachées de l'Excel).
- À l'enregistrement, les totaux sont **figés** dans `history[...].totals`. Modifier un code plus tard ne change donc pas l'historique.

### Modèle de données (`localStorage`, clé `tempsTravail.v1`)

```js
{
  v: 1,
  settings: { daily: 420, city: 'Cambrai', motif: 'Vacation non terminée' },
  agents:  [{ name, quotite }],                       // quotite : 1, 0.9 … 0.5
  codes:   [{ code, label, type, start, end, pause, forfait }],  // type : Horaire|Forfait|Absence|Personnalisé
  history: { 'AGENT|ANNÉE|SS': { agent, year, week, quotite, days[7], prev, prevManual, savedAt, totals } },
  cur:     { agent, year, week, quotite, days[7], prev, prevManual }  // brouillon en cours
}
// day = { code, start: 'HH:MM', end: 'HH:MM', pause: min, retard: min }
```

Le fichier d'export a la forme `{ app: 'temps-travail', v: 1, exportedAt, settings, agents, codes, history }`.

### Publier une modification

1. Modifier les fichiers dans `src/`.
2. Vérifier : `npm test` puis `npm run build` (contrôle TypeScript + compilation).
3. `git add -A && git commit -m "…" && git push`. Le workflow refait `npm ci`, les tests et la compilation, puis publie `dist/` en environ 1 à 2 minutes. **Si un test échoue, rien n'est publié** et l'ancienne version reste en ligne.
4. Le commit affiché et le cache hors ligne sont mis à jour automatiquement : rien à incrémenter à la main. Les nouveaux fichiers sont pris en compte par Vite sans autre configuration.

Commandes : `npm run dev` (serveur de développement), `npm run build`, `npm run preview` (sert `dist/`), `npm test`, `npm run typecheck`.

### Node.js sur le PC

Node.js **n'est pas installé** sur le PC. Pour travailler en local, Claude utilise une version portable de Node (archive officielle `node-vXX-win-x64.zip` de nodejs.org, somme SHA-256 vérifiée), décompressée dans son dossier temporaire et ajoutée au `PATH` le temps des commandes. Sous Git Bash, écrire ce chemin sous la forme `/c/Users/...` et non `C:/Users/...` : les deux-points cassent le `PATH`. La compilation de référence reste celle de GitHub Actions (Node 24).

### Tester

- **Tests unitaires** (`src/lib/logic.test.ts`, Vitest) : semaines ISO, durées, calculs, valeurs de l'historique Excel, reprise de la HS précédente, import. Lancés par `npm test` en local **et** dans la CI avant chaque publication.
- **Tests de bout en bout** (hors dépôt, à refaire au besoin) :
  - compiler avec un faux commit : `GITHUB_SHA=abcdef… npx vite build` ;
  - un seul script PowerShell sert `dist/` (`HttpListener`, port 8765), lance Edge headless (`msedge --headless=new --virtual-time-budget=15000 --dump-dom http://localhost:8765/_test.html`), puis s'arrête avec lui. Ne pas laisser de serveur tourner en tâche de fond : le PC manque parfois de mémoire ;
  - la page de test charge `index.html` dans une iframe et utilise `window.TT` (exposé par `App` : toutes les fonctions de `logic.ts`, `buildPdf` asynchrone, `state`) ;
  - avec React, pour simuler une saisie : *setter* natif `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v)`, puis événements `input` et `change`. Les champs validés à la sortie (HS précédente, année, textes des réglages) attendent un `focusout`. Laisser environ 40 ms après chaque action.

Valeurs de référence issues de l'historique Excel (agent à 100 %) :

| Semaine 2026 | Saisie | HS semaine | HS précédente | Cumul |
|---|---|---|---|---|
| 40 | lun-mer MA ; jeu spé 08:00-17:00 coupure 20 min ; ven spé 08:00-18:15 coupure 20 min | +4h35 | +70h45 | +75h20 |
| 41 | mer A12 | −3h30 | +75h20 | +71h50 |

### Points d'attention

- Sur iPhone, l'app doit être **ajoutée à l'écran d'accueil** : dans un simple onglet Safari, les données peuvent être effacées au bout de 7 jours d'inutilisation.
- Le partage du PDF et de la sauvegarde utilise `navigator.share` (feuille de partage iOS), avec repli sur un téléchargement.
- L'Excel d'origine utilise le système de dates **1904** (numéro de série 44831 = 28/09/2026). C'est utile si on doit relire d'autres données issues du classeur.
- Le dépôt est **public** : n'y mettre aucune donnée nominative.

### Journal

- **2026-10-08** : v1.0.0. Première version : reprise complète du classeur (saisie, historique, paramètres, fiche PDF), mise en ligne sur GitHub Pages.
- **2026-10-08** : README. Ajout de la partie « GitHub pour débutant ».
- **2026-10-08** : passage de l'interface en **React** (React 18 + htm, sans build), logique isolée dans `logic.js`. Déploiement par GitHub Actions avec `version.json` : Réglages affiche le code du commit à la place de « version 1.0.0 ».
- **2026-10-08** : migration vers un projet standard **Vite + React 19 + TypeScript** (`src/`, composants `.tsx`). PWA via vite-plugin-pwa. Tests Vitest exécutés dans la CI avant publication. Commit injecté au build (`__COMMIT_SHA__`) à la place de `version.json`.
