# Mizan Digital — Pitch investisseur (pré-amorçage)

> **Mizan.page** — la plateforme bilingue (arabe / français) qui aide les étudiants en droit marocains à réviser, réussir leurs examens et lancer leur carrière juridique.

Site : https://www.mizan.page · Catégorie : **LegalTech / EdTech** · Stade : **Pré-seed** · Modèle : **Freemium + abonnement Pro**

---

## 1. Le problème

- **~120 000 étudiants** sont inscrits dans les filières de droit au Maroc (FSJES et facultés de droit, 21 établissements publics), avec un **taux d'échec/abandon très élevé en S1–S2** (souvent > 50 %).
- Le contenu de révision est **éparpillé** : PDF partagés sur WhatsApp/Facebook, polycopiés non datés, résumés de qualité inégale, textes de loi non consolidés.
- Le droit marocain est **bilingue** (cours en arabe, textes et jurisprudence souvent en français) — un vrai obstacle pour les étudiants.
- Aucun outil ne couvre le parcours complet : **cours → examens → concours (magistrature, DGSN, fonction publique, notariat, avocat) → premier emploi**.
- Les textes évoluent (Moudawana 2026, Code de procédure pénale, etc.) ; les étudiants révisent souvent sur des **versions obsolètes**.

## 2. La solution — Mizan

Une seule plateforme, pensée mobile, en arabe d'abord :

| Pilier | Ce que l'étudiant obtient |
| --- | --- |
| **Réviser** | Résumés par semestre (S1→S6), archive de lois et Bulletin officiel, articles pédagogiques |
| **Comprendre** | Lexique juridique AR/FR de **250 termes** (définition, explication simple, exemples, sources) |
| **S'entraîner** | Moteur de **QCM à 4 parcours** : université, culture générale, concours chronométrés, entretiens — avec XP, rangs (D → SSS), badges et profil public partageable |
| **S'orienter** | Annuaire des **21 facultés**, **14 parcours de carrière** juridiques détaillés (concours, salaires, étapes) |
| **Pratiquer (Pro)** | Comparateur de versions de textes, carte des renvois juridiques (Constitution 2011), cas pratiques corrigés, calculateur de délais, alertes d'amendements, espace de recherche privé |

**Différenciation** : contenu vérifié contre les sources officielles (SGG, Adala), bilingue natif, gamification pour la rétention, et une **couche IA/SEO** (données structurées, endpoint MCP, fichiers llms.txt) qui positionne Mizan comme la référence citée par les moteurs et les assistants IA pour le droit marocain.

## 3. Le produit aujourd'hui (ce qui est déjà construit)

- Site en production, **~35 pages publiques**, rendu statique pré-généré, PWA, dark/light mode.
- **224 questions de QCM** éditorialisées, 250 termes de lexique, 21 fiches facultés, 14 fiches carrières, archive de lois synchronisée.
- Comptes utilisateurs (Supabase), profils publics `mizan.page/u/username`, back-office complet (CMS articles, actualités, lexique, quiz, Pro tools, modération, analytics).
- **Paiement Stripe intégré**, page tarifs, 6 outils Pro développés avec gating abonnement.
- Infrastructure quasi gratuite (Cloudflare Pages + Supabase) → **coût marginal par utilisateur ≈ 0**.

## 4. Traction (honnête, stade très précoce)

- **~443 visites / mois** en organique, sans aucune dépense marketing, avant la première saison d'examens.
- Investissement SEO/AEO lourd déjà réalisé (sitemaps, schema.org, hreflang, contenu long-tail arabe) ; la croissance organique devrait s'accélérer à l'approche des examens (déc.–janv., mai–juin).
- Objectif 6 mois : **5 000 visites/mois, 1 000 comptes, 100 abonnés Pro.**
- Objectif 12 mois : **25 000 visites/mois, 6 000 comptes, 600 abonnés Pro.**

## 5. Marché

| | Taille | Hypothèse |
| --- | --- | --- |
| **TAM** | ~120 000 étudiants en droit + ~40 000 candidats annuels aux concours juridiques + praticiens | Maroc |
| **SAM** | ~60 000 étudiants connectés et actifs en révision numérique | Maroc, arabophones/francophones |
| **SOM (3 ans)** | 6 000 abonnés payants × 200 MAD/an ≈ **1,2 M MAD ARR** | 10 % du SAM |

Extension naturelle : Algérie, Tunisie, Mauritanie (droit civiliste bilingue, mêmes besoins), puis segments B2B (facultés, centres de préparation aux concours, cabinets).

## 6. Modèle économique

**Freemium** : contenu de révision gratuit (moteur d'acquisition SEO) ; **Pro** pour les outils à forte valeur.

| Plan | Prix cible | Cible |
| --- | --- | --- |
| Mensuel | 39 MAD | Essai / période d'examens |
| Semestriel | 129 MAD | Plan principal, aligné sur S1/S2 |
| Annuel | 229 MAD | Étudiants réguliers, candidats concours |

Revenus complémentaires : packs de préparation aux concours (DGSN, magistrature), licences B2B pour facultés/centres de formation, partenariats éditeurs juridiques, contenu sponsorisé par les cabinets qui recrutent.

Paiement : Stripe + ajout prévu de CMI / paiement local et activation manuelle (virement, Wafacash) pour lever le frein « pas de carte internationale ».

## 7. Go-to-market

1. **SEO arabe long-tail** (déjà le canal n°1) : un article/QCM par module avant chaque session d'examens.
2. **Communautés étudiantes** : groupes WhatsApp/Facebook/Telegram par faculté, ambassadeurs étudiants rémunérés en Pro gratuit.
3. **Viralité produit** : partage des scores de QCM et du profil public sur WhatsApp/Instagram/TikTok.
4. **Partenariats** : bureaux des étudiants, professeurs, centres de préparation aux concours, cliniques juridiques.
5. **Calendrier** : campagnes concentrées sur déc.–janv. et mai–juin (pic de recherche).

## 8. Concurrence

| Acteur | Limite |
| --- | --- |
| Groupes WhatsApp / Facebook, PDF partagés | Non structurés, non vérifiés, non datés |
| Sites de cours généralistes (cours-de-droit, 9rayti, etc.) | Pas d'outils, pas de QCM, peu de contenu marocain à jour |
| Portails officiels (SGG, Adala) | Référence mais pas pédagogiques, pas d'entraînement |
| Doctrine / Lexis / Dalloz | Prix prohibitif, droit français, pour praticiens |

**Avantage Mizan** : seul acteur combinant contenu marocain bilingue vérifié + entraînement gamifié + outils pratiques Pro, avec une base technique déjà prête à l'échelle.

## 9. Pourquoi maintenant

- Réformes législatives majeures en cours (Moudawana, procédure pénale, code du travail) → besoin de versions à jour et de comparateurs.
- Digitalisation accélérée de l'enseignement supérieur marocain et pénétration mobile > 90 % chez les étudiants.
- Les moteurs de recherche et les assistants IA cherchent des **sources arabes structurées** : être la référence citée est une position défendable à construire **maintenant**.

## 10. Équipe

- **Fondateur** : conception, développement complet de la plateforme (frontend, back-office, paiement, SEO/AEO), production éditoriale.
- **Besoins** : un(e) responsable contenu juridique (doctorant/avocat), un(e) community manager étudiant, un comité de relecture d'enseignants.

## 11. La levée

**Montant demandé : 600 000 MAD** (≈ 55–60 k€) en pré-amorçage (BSA-AIR / SAFE ou equity ~10–15 %), pour **18 mois** de runway.

| Poste | Part | Détail |
| --- | --- | --- |
| Contenu & pédagogie | 40 % | Rédacteurs juridiques, relecture par enseignants, 2 000 QCM, résumés S1–S6 complets, packs concours |
| Croissance | 30 % | Ambassadeurs campus, création vidéo courte, campagnes d'examens, partenariats facultés |
| Produit & tech | 20 % | Paiement local, app mobile (PWA → stores), assistant IA de révision, outils Pro v2 |
| Juridique & opérations | 10 % | Structure SARL, CGV, comptabilité, frais Stripe/infra |

**Jalons visés à 18 mois** : 25 000 visites/mois · 6 000 comptes · 600 Pro payants · ≈ 120 000 MAD ARR · 2 partenariats B2B signés → conditions pour une levée **seed (3–5 M MAD)**.

**Programmes ciblés en parallèle** : 212Founders (CDG Invest), UM6P Ventures, Technopark, Plug and Play Morocco, Orange Fab / Maroc Numeric Fund (pré-seed), Innov Invest.

## 12. Ce que nous proposons à l'investisseur

- Un ticket d'entrée faible sur un marché **mal servi, récurrent (nouvelle cohorte chaque année)** et extensible au Maghreb.
- Un produit **déjà construit et en production**, donc un capital consacré à la croissance, pas au développement initial.
- Des coûts d'exploitation quasi nuls et une marge brute logicielle (> 85 %).
- Un fondateur technique autonome et une vision claire : **devenir la référence numérique du droit marocain pour les étudiants, puis pour les praticiens.**

---

### Annexe — Pitch oral (60 secondes)

> « Chaque année, plus de 100 000 étudiants marocains préparent leurs examens de droit avec des PDF périmés partagés sur WhatsApp, dans deux langues, sans aucun outil d'entraînement. Plus de la moitié échouent en première année.
> Mizan est la plateforme bilingue qui regroupe résumés vérifiés, lexique arabe-français, archive de lois à jour, QCM gamifiés et outils pratiques Pro — de la première année jusqu'au concours de la magistrature.
> La plateforme est déjà en production avec paiement intégré et elle attire ses premiers visiteurs uniquement par le référencement naturel. Nous levons 600 000 dirhams pour produire le contenu de référence, activer les campus et atteindre 600 abonnés payants en 18 mois — puis étendre le modèle au Maghreb. »

### Annexe — Points de vigilance et réponses

| Objection | Réponse |
| --- | --- |
| « 443 visites, c'est peu » | Zéro marketing, hors saison d'examens ; le produit est fini, la levée sert justement à la croissance. |
| « Les étudiants ne paient pas » | Prix de 39–129 MAD, aligné sur les dépenses actuelles en photocopies/polycopiés ; plans semestriels ; paiement local. |
| « Fondateur seul » | Produit complet livré seul = exécution prouvée ; première embauche = contenu juridique. |
| « Barrière à l'entrée ? » | Corpus vérifié + données structurées + marque SEO/IA ; le coût d'imitation augmente avec le temps. |
| « Risque juridique du contenu » | Avertissements éducatifs, renvoi systématique aux sources officielles, relecture enseignante. |
