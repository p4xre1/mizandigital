# CNDP follow-up pack: owner checklist and F214/F211 clarification draft

**Related audit:** [`cndp-law-09-08-audit-2026-09-26.md`](cndp-law-09-08-audit-2026-09-26.md)<br>
**Prepared:** 2026-09-27<br>
**Purpose:** Turn the audit’s owner-information requests into a fill-in checklist and prepare—not send—a short request for CNDP clarification.

> **Not a CNDP filing and not legal advice. Nothing has been sent.** Complete the owner-confirmation items and have Moroccan counsel review the final message before sending it through CNDP’s current official contact channel. Do not include credentials, tokens, payment-card details, or real user records.

## 1. Owner readiness checklist

For each item, enter the responsible person, status, evidence location/reference and date. “Repository evidence” means a code clue only; it does not establish production configuration.

Suggested statuses: `Not started` · `In progress` · `Confirmed` · `Not applicable (explain)`.

## 0. Immediate technical triage (separate from CNDP form selection)

These checks address potential live privacy/security problems, not filing completeness. Use staging or synthetic accounts and inspect metadata/policies only—do not export real user records.

- [ ] **T1 — Public profile boundary:** verify unauthenticated REST/API access to `mizan_profiles` and confirm that hidden columns cannot be fetched directly. If broad data are returned, restrict the server-side projection/access before relying on client-side masking. **Priority: urgent.**<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **T2 — Deletion lifecycle:** use a synthetic test account to follow request → pending period → purge. Check whether the profile is hidden immediately, whether `audit_logs.user_id` FK blocks Auth deletion, and whether rows/files/provider copies are removed or retained as documented. **Priority: urgent.**<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **T3 — Effective credit-ledger schema/policy:** inspect deployed schema, migration order and RLS for `credit_transactions` using metadata only. Resolve the conflicting definitions and confirm whether any public `SELECT` policy is active. **Priority: urgent.**<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **T4 — Payment endpoint identity:** in staging with synthetic inputs, test whether unauthenticated requests can create a pending payment or Stripe session and whether `userRef` is trusted from the browser. Bind records to server-verified identity and restrict production routes if needed. **Priority: high.**<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____

### A. Controller and CNDP history

- [ ] **A1 — Identify the controller.** Legal name, legal form, Moroccan address, registered activity and registration number/jurisdiction; identify the person authorized to sign. Do not use only the product/brand name.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **A2 — Identify the rights contact.** Name or service, role, email/address and who monitors/handles requests. Confirm the published contact is active.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **A3 — Check prior CNDP formalities.** Locate any receipt, declaration, authorization, transfer approval, amendment or CNDP correspondence. Record exact number/date/purpose and current status; if none, record who checked and where.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **A4 — Obtain CNDP/counsel answer on F214 vs F211.** Save the written answer and current form version/link. Do not select a form solely from the conflicting page/PDF labels.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **A5 — Confirm whether filings are purpose-by-purpose or grouped.** Obtain CNDP/counsel direction for the actual purposes and any authorization route; document the decision and rationale.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____

### B. Production facts and processing inventory

- [ ] **B1 — Establish the production baseline.** Deployed commit SHA/date; migration ledger; active API/Edge/Pages Functions; feature flags; production vs test integrations. Keep the evidence to configuration names/status and safe aggregate counts—no secrets or user rows.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **B2 — Verify the live Supabase project.** Region; Auth providers/scopes; effective schema, grants and RLS; storage buckets/policies; backup/PITR/log settings; active scheduled jobs. Use redacted screenshots or configuration exports.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **B3 — Verify active feature flows.** For accounts/OAuth, public profiles, onboarding, quizzes, reactions, comments/reports, billing, analytics, translation, Search Console, uploads and Gmail, record `active / inactive / conditional`, user-facing trigger, data sent, and recipient. Test only with synthetic accounts/data.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **B4 — Complete required/optional and origin fields.** For each active form/event, identify required vs optional fields and mark whether the data comes directly from a person, an identity provider, the browser/device, an administrator, or another provider. Include automatic page-view/technical collection.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **B5 — Determine affected-person scope.** Estimate categories and approximate counts from safe aggregate data; record the measurement date and method. Do not export or attach individual user records.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **B6 — Screen free text and uploads.** Determine whether comments, reports, bios, support mail or uploaded documents may contain CIN numbers, sensitive data, allegations/offence data, minors’ data, or third-party personal data. Document safeguards; do not assume a category is absent merely because there is no dedicated column.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____

### C. Vendors, transfers and contracts

- [ ] **C1 — Identify each active provider and legal entity.** Supabase, Cloudflare Pages/Workers/KV/R2/Turnstile, Google services, Stripe or other payment provider, every translation host, mail provider, and any support/analytics tool. Include role, shared fields, purpose and subprocessors.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **C2 — Verify destinations.** For each service, record storage region, support/access countries, backup region, transfer route and any country restrictions from the actual account settings/contract. Public provider documentation alone is not evidence of the project’s configuration.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **C3 — Gather contracts.** Executed DPA/processor clauses, service terms applying to the account, subprocessor list, confidentiality/security terms and own-use/retention provisions. Record acceptance date and contracting entity.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **C4 — Resolve F118 sequence and transfer route.** After the underlying treatment/form is confirmed, ask counsel/CNDP which transfer procedure and transfer conditions apply to the verified countries and services. Record underlying CNDP reference(s); do not declare “no transfer” while region evidence is missing.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____

### D. Retention, rights and controls

- [ ] **D1 — Approve a retention schedule.** Set purpose-specific periods and deletion/anonymization method for profile, page-view, reactions, comments, reports, quiz, consent, billing/raw events, audit/security logs, files, support, backups and provider copies. Record the owner and business/legal justification for each period.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **D2 — Prove deletion end-to-end.** In a synthetic test account, verify request, pending period, public-profile visibility, scheduled purge, foreign keys, audit retention, storage-object deletion, billing handling and provider-side copies. Keep only test evidence and aggregate logs.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **D3 — Test public data boundaries.** With an unauthenticated test session, verify the actual Supabase REST/API responses for profile columns and other public tables. Confirm server-side field projection and grants; do not use or save real user records.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **D4 — Test consent and network behavior.** In a clean browser profile, test analytics accepted and denied; inspect tag loading, requests, local/session storage and Supabase page-view writes. Test translation opt-in/fallback separately with synthetic text.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **D5 — Test rights handling.** Document how a person can request access, correction, objection or deletion, how identity is verified, who responds, how deadlines are tracked and how completion is evidenced. Include local-only data limits and backup/provider copies.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____
- [ ] **D6 — Reconcile notices and forms.** Update privacy/cookie/terms text and in-context notices only after facts, form route, purposes, fields, recipients, locations, retention, consent and contact are confirmed. Ensure no unsupported claim about anonymity, optionality, deletion, provider, or CNDP approval remains.<br>
  **Owner:** ____ · **Status:** ____ · **Evidence/reference:** ____ · **Date:** ____

## 2. Draft request to CNDP (French)

**Do not send until the bracketed controller details are completed and the service description is checked against the actual intended/deployed processing.** Use the current official CNDP contact channel. Keep a copy of the response with the filing dossier.

**Objet : Demande de clarification — formulaire de déclaration préalable applicable (F214 ou F211)**

Madame, Monsieur,

Nous vous contactons au nom de **[dénomination juridique complète du responsable du traitement]**, **[forme juridique]**, sise à **[adresse au Maroc]**, immatriculée sous le numéro **[RC / identifiant pertinent]**. La personne habilitée à signer est **[nom et qualité]**. Le traitement concerne le site/application **[nom et URL]**, exploité pour **[description vérifiée de l’activité]**.

Avant de constituer un dossier, nous souhaiterions confirmer le formulaire actuellement applicable. Sur la page CNDP « Notifier un traitement » (**https://www.cndp.ma/notifier-un-traitement/**), le formulaire F214 est présenté comme une « déclaration simplifiée », tandis que le PDF associé est intitulé « Déclaration normale conformément à une décision » et comporte un champ relatif au numéro de décision.

Pourriez-vous nous confirmer, s’il vous plaît :

1. si le formulaire F214 actuellement lié sur la page est bien le formulaire à utiliser pour une déclaration préalable simplifiée, et dans quelles conditions précises il s’applique ;
2. si, lorsqu’aucune décision CNDP spécifique applicable n’a été identifiée par le responsable du traitement, le formulaire F211 est celui à utiliser pour une déclaration préalable normale, ou si une autre version/procédure doit être suivie ;
3. si les traitements liés à une même plateforme doivent être décrits dans une seule déclaration ou faire l’objet de formalités distinctes selon leurs finalités ; et
4. le cas échéant, vers quelle procédure ou quel service nous orienter pour confirmer le formulaire à utiliser avant tout dépôt.

À titre de contexte, la plateforme est **[description factuelle et vérifiée en une ou deux phrases — par exemple : service web éducatif avec comptes, profils, activités d’apprentissage et fonctions de communication]**. Les fonctionnalités effectivement mises en œuvre, les catégories de données, les destinataires et les pays d’hébergement sont en cours de vérification afin que le dossier reflète la configuration réelle. **[Indiquer ici uniquement les faits confirmés : existence ou absence de formalités CNDP antérieures, traitements réellement actifs, catégories particulières éventuelles.]**

Nous avons également relevé sur la page CNDP que la demande de transfert à l’étranger F118 intervient après l’approbation du traitement sous-jacent. Nous ne sollicitons pas, par ce message, une autorisation de traitement ou de transfert ; nous cherchons uniquement à confirmer la procédure et la version de formulaire avant de préparer le dossier factuel complet.

Nous vous remercions de bien vouloir nous indiquer le formulaire, la version et les formalités à suivre, ou le service compétent à contacter.

Veuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.

**[Nom et qualité du signataire]**<br>
**[Dénomination juridique]**<br>
**[Adresse]**<br>
**[Téléphone professionnel]**<br>
**[Adresse électronique professionnelle]**

### Before sending

- [ ] Complete legal controller/signatory details; verify them against registry/mandate documents.
- [ ] Check whether any earlier CNDP receipt, authorization or correspondence changes the question; state exact facts, not assumptions.
- [ ] Replace the platform-description example with a short, accurate description of confirmed processing; remove unverified feature claims.
- [ ] Confirm the current official contact channel and attach no sensitive records, credentials, user exports or unnecessary technical detail.
- [ ] Have Moroccan privacy counsel review the wording; retain the sent message and CNDP response in the filing dossier.
