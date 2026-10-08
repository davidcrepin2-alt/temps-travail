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
Dossier sur le PC  --(commit + push)-->  Dépôt GitHub  --(GitHub Pages, ~1 min)-->  Site web  --(ouverture de l'app)-->  iPhone
```

Le dossier de travail sur le PC est `C:\Users\david\OneDrive\Bureau\Code\temps-travail-app`.

**Méthode simple : demander à Claude.** Dans Claude Code ouvert sur le dossier `Code`, décrire la modification voulue (ex. « ajoute le code N12 de nuit 21h-7h ») et demander de la pousser sur GitHub. Claude modifie, teste, fait le commit et le push.

**Méthode manuelle, pour une petite correction de texte :**
1. Sur la page du dépôt, cliquer sur le fichier (ex. `README.md`), puis sur l'icône **crayon** ✏️.
2. Modifier, puis cliquer sur **Commit changes…** → **Commit changes**.
3. ⚠️ Le PC n'a pas encore cette modification. Avant toute autre modification sur le PC, la récupérer en tapant dans Claude Code :
   `! cd "C:\Users\david\OneDrive\Bureau\Code\temps-travail-app" && git pull`

### Vérifier que la mise en ligne a fonctionné

1. Sur la page du dépôt, onglet **Actions**.
2. La dernière ligne « pages build and deployment » doit avoir une coche verte ✅ (un rond jaune 🟡 = en cours, une croix rouge ❌ = échec).
3. Ouvrir l'app sur l'iPhone **avec du réseau** : la nouvelle version est chargée. Si rien ne change, fermer complètement l'app (balayer vers le haut) et la rouvrir.

### Retrouver l'historique ou annuler une modification

- **Voir les modifications passées** : sur la page du dépôt, cliquer sur **« X commits »** (en haut à droite de la liste des fichiers). Chaque commit montre ce qui a changé, en vert (ajouté) et en rouge (supprimé).
- **Revenir en arrière** : demander à Claude « annule le dernier commit de l'app et pousse sur GitHub ». Il utilise `git revert`, qui crée un nouveau commit inverse sans rien effacer de l'historique.

### Réglages importants (onglet Settings du dépôt)

| Réglage | Valeur attendue |
|---|---|
| **General → Danger Zone → Change visibility** | **Public** (obligatoire pour GitHub Pages gratuit) |
| **Pages → Build and deployment → Source** | Deploy from a branch |
| **Pages → Branch** | `main` et `/ (root)` |

Ne pas renommer le dépôt : l'adresse de l'app changerait et l'icône installée sur l'iPhone ne fonctionnerait plus.

### Problèmes fréquents

| Symptôme | Cause et solution |
|---|---|
| `Invalid username or token. Password authentication is not supported` lors d'un push | GitHub refuse le mot de passe du compte. Il faut un **jeton** : https://github.com/settings/tokens → *Generate new token (classic)* → cocher **repo** → copier le jeton, puis le coller à la place du mot de passe quand Git le demande. Un jeton expire : en générer un nouveau à expiration. |
| `rejected … fetch first` lors d'un push | Le dépôt GitHub contient une modification que le PC n'a pas (faite sur le site). Faire `git pull`, puis refaire le push. |
| Le site affiche **404** | Juste après une activation : attendre quelques minutes. Sinon, vérifier les réglages ci-dessus (dépôt public, Pages sur `main` / root) et l'onglet Actions. |
| L'iPhone garde l'ancienne version | Ouvrir l'app avec du réseau, la fermer complètement et la rouvrir. Côté code : vérifier que le numéro `CACHE` de `sw.js` a bien été changé. |

### À ne jamais faire

- ❌ Mettre sur GitHub un fichier contenant des **noms d'agents** ou des données personnelles (le dépôt est public et visible par tous). C'est pour cela que `sauvegarde-initiale.json` reste uniquement sur le PC.
- ❌ Partager son **jeton** GitHub : il donne le droit de modifier le dépôt.
- ❌ Supprimer le dépôt : l'app disparaîtrait de l'iPhone (les données restent dans le téléphone, mais l'app ne se mettrait plus à jour et ne pourrait plus être réinstallée).

---

## Notes techniques (référence pour la maintenance, y compris par Claude)

### Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des 3 écrans + CSS (thème clair/sombre automatique, zones sûres iPhone). |
| `app.js` | Toute la logique : calculs, stockage, rendu, PDF, export/import. JavaScript vanilla, aucun build. |
| `sw.js` | Service worker : cache hors ligne, stratégie *réseau d'abord, cache si hors ligne*. |
| `manifest.webmanifest`, `icon-*.png` | Installation sur l'écran d'accueil. |
| `vendor/` | jsPDF 2.5.1 + jspdf-autotable 3.8.2, copiés localement (pas de CDN, pour le hors ligne). |
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

1. Modifier les fichiers.
2. **Incrémenter `CACHE` dans `sw.js`** (ex. `temps-travail-v2`) et `VERSION` dans `app.js`, pour que les iPhone récupèrent bien la nouvelle version.
3. `git add -A && git commit -m "…" && git push`. GitHub Pages redéploie en environ 1 minute. L'app se met à jour à l'ouverture suivante avec du réseau.
4. Si un fichier est ajouté, l'ajouter aussi à la liste `FILES` de `sw.js`.

### Tester

Aucun Node ni Python sur le PC de développement. Méthode utilisée :

- servir le dossier en local (petit serveur PowerShell `HttpListener`, port 8765) ;
- page de test temporaire qui charge `index.html` dans une iframe et appelle `window.TT` (fonctions exposées : `buildPdf`, `dayTime`, `dayHS`, `weekTotals`, `mondayOf`, `isoWeek`, `weeksInYear`, `parseDur`, `fmtDur`, `state`) ;
- exécution avec Edge headless : `msedge --headless=new --virtual-time-budget=8000 --dump-dom http://localhost:8765/_test.html`.

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
