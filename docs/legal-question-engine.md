# Legal question engine (`shared/qa/`)

Status: implemented on branch `arena/682d28e7-mizandigital`. Deterministic and extractive. No model, no external API, no paid service.

This document covers what the assistant did before the engine, what the engine does now, how to tune it, what it cannot do, and the measured results. Claims here are limited to what the test suite and the benchmark show.

## 1. Inspection of the previous path

Before the change, `shared/help/pipeline.js` called `answerQuestion` (`shared/help/answer.js`) for every question. That function:

- Ranks custom admin Q&A first, then the static site content (`rankEntries`, `shared/help/retrieve.js`).
- Scores by token overlap across title, keywords, and body. There is no legal parsing, no article or law recognition, no phrase matching, and no source authority.
- Returns the body of the top entry, or `not_found`.

Measured limits (probe, 15 legal questions, before the change): 13 of 15 returned an unrelated site page. It also cannot tell a repealed article from a current one, cannot say "this article does not exist", and cannot ask for clarification.

Baseline on the 42-item benchmark (`tests/fixtures/qa-benchmark.json`, approximate, see §6): the old path answered 27 of the 33 answerable items, and only 21 of those 33 answerable items cited a relevant source. It also answered 7 of the 9 items that should have been left unanswered. Legacy answers carry no passage IDs, so this relevance check is based on source URL and text.

Retrieval data already in the repo is used as is: `src/data/lexicon.client.json` (definitions and legal-source quotations), `src/data/reference-map.json` (constitutional excerpts), `src/data/laws.client.json` (law records, currently empty). FAQ and curated site pages are deliberately excluded from the legal corpus. They still serve navigation through the old path.

## 2. Pipeline

Each stage is a separate module with its own tests.

| Stage | Module | What it does |
|---|---|---|
| 1 | `input.js` | Size limit, type check, removes invisible and bidi controls and lone surrogates. Keeps `original` unchanged. |
| 2 | `normalize.js` | Arabic normalization for matching only: alef and ya forms, ta marbuta, diacritics, tatweel, Arabic-Indic digits. Keeps `70.03`-style numbers. |
| 3 | `normalize.js` | Tokenization and multiword phrase extraction (2 to 4 words, no words removed). |
| 4 | `morph.js` | Conservative variants: strips one conjunction, one preposition, one "ال", one plural "ات". Negation and exception words are protected. |
| 5 | `entities.js` | Article numbers, law numbers, code names (CODE_ALIASES), institutions. Never invents a number. |
| 6 | `intent.js` | Rule-based intent: comparison, conditions, procedure, legislation_lookup, definition, explanation, lookup, unsupported. |
| 7 | `translit.js` | Small curated bridge: Darija and Latin legal words to Arabic, used for matching only. |
| 8 | `retrieve.js` | Candidate scoring (see §3). |
| 9–10 | `rank.js` | Hard constraints: applicability, repeal, unverified status, conflicts, clarification. |
| 11 | `answer.js` | Answer strategy by intent. Text comes from sources or fixed templates only. |
| 12 | `validate.js` | Output checks. Any violation replaces the answer with a fixed safe message. |
| — | `engine.js` | Orchestration. Public API: `answerLegalQuestion(raw, {retrievalText})` and `createEngine({data, config})`. |

Hook in `shared/help/pipeline.js`: after the existing injection, language, social, and emotion screens, and after `answerQuestion`. The engine takes over only when it finds legal evidence (a term mention, an article or law number, or two or more covered content words in a legal passage). It is skipped for admin custom answers (`reason: custom_qa`), refusals, blocks, disabled state, and unsupported languages. Emotion text is still a lead line only, and the body is unchanged.

## 3. Retrieval and ranking

Candidate score:

```
score = 3·exactPhrase + 6·termMention + 1·BM25(stems) + 0.5·fuzzyHits
      + 10·articleRef + 10·lawRef + 1·authority
```

A candidate needs `score ≥ minScore (3)` and at least one of: term mention, article or law reference, or content coverage `≥ 0.5`.

- **Term mention** is token-level and uses stem variants, so "والمخالفة" matches "المخالفة" and "للتقادم" matches "التقادم". Typo-corrected tokens also count.
- **Typo correction** is single-edit and only accepted when the candidates are one word's variants or one candidate clearly dominates (frequency at least 3×, `DOMINANCE_RATIO` in `retrieve.js`). Ambiguous typos are left alone.
- **Authority** (`config.js`) is both a weight and a constraint. Site and FAQ pages are weight 0.5 and are not legal evidence.

Semantic similarity is not implemented. The repo has no local embedding model or vector index, and the brief forbids adding a paid API. The engine does not claim semantic understanding.

## 4. Hard constraints (`rank.js`)

- **Applicability.** If the question names a code or law number, passages from other codes are excluded (`applicability_mismatch`).
- **Repeal.** A passage whose status is `repealed` is excluded and never presented as current. The current data has no repeal field, so every provision is `unknown`. The mechanism is tested with synthetic input.
- **Unverified status.** Provisions with `unknown` status or `currency: unverified` are shown with the exact uncertainty phrase and a last-verified date from the repo data.
- **Conflicts.** Two different quotations for the same article are shown together with a conflict notice, and neither is preferred. A shorter quotation that is contained in a longer one is the same provision and is not a conflict.
- **Clarification.** For ambiguous term questions (two close definitions, no article number), the engine asks one focused question with up to three Arabic options.

## 5. Answer strategies (`answer.js`)

- **definition**: `term: definition`, then linked verbatim quotations.
- **conditions**: linked verbatim quotations ordered by how many question words each covers. It never lists conditions that the sources do not state.
- **legislation_lookup**: the requested article verbatim, or "لم أجد … في مصادرنا المعتمدة" with the uncertainty phrase.
- **comparison**: both definitions side by side. If only one term is defined, it says the other is not in the sources. It never states a difference the sources do not state.
- **procedure**: always the uncertainty phrase, because the corpus has no procedural passages.
- **clarify**: one question, Arabic-only options.
- **insufficient**: a fixed statement with the uncertainty phrase.

Length budgets (`answerBudgetWords`) are enforced by `validate.js`. If an answer is over budget, the engine retries with fewer evidence items. It never cuts a quotation.

## 6. Benchmark

`tests/fixtures/qa-benchmark.json`: 42 items. Expected terms and article keys come from repo data only. They are not checked against official legal texts, so the benchmark measures pipeline correctness on the corpus, not legal truth.

Revisions to the fixture are logged in its `revisions` field:
- `q38` "ما هو الحكم؟": clarify → answer. The lexicon has one "الحكم" entry.
- `q20` "ما نص الفصل 11 من الدستور؟": insufficient → answer. Article 11 of the 2011 Constitution is in the data.

Run: `npx vitest run tests/qa-benchmark.test.ts` (prints `QA_METRICS`, `QA_MODE_MISMATCH`, `QA_INTENT_MISMATCH`, `QA_LEGACY_BASELINE`).

Results at the end of this change:

| Metric | Engine | Legacy path (approximate) |
|---|---|---|
| Intent accuracy | 41/42 | not measured |
| Mode accuracy (handled items; out-of-scope counted as correct) | 41/42 | not measured |
| Recall at answer (answerable items with a relevant passage used) | 32/33 | 21/33 (approximate) |
| Precision of cited passages (vs. expected set) | 80/83 | not measured |
| Unsupported answers (must-abstain items answered) | 0/9 | 7/9 |

Precision is judged against the fixture's expected set. The 3 cited passages outside that set were not manually reviewed. Some may be relevant passages linked to the same term that the fixture does not list.

Known miss: "ما هو الطلاك؟" (q37). The typo has two equally frequent one-edit neighbours ("طلاق" and "طلان"), so the engine declines to choose and the question goes to the old path. This item stays in the benchmark as an honest miss.

Modes "unsupported" and "refused" are counted as correct when the engine returns `handled: false`, because the pipeline's refusal and legacy paths handle them.

## 7. Safety and rendering

- Output is Arabic only. Validation rejects any Latin letter and any `<`, `>`, `javascript:`, or `on*=` pattern. Option labels are Arabic only.
- Every quotation between « » must appear verbatim in the evidence it cites. Article numbers in the answer must appear in the evidence or the question.
- Retrieved text is data. It is never executed or treated as instructions. A test checks that markup in a source definition does not reach the output.
- The engine does not log, and its result never includes the raw question. A test checks that no `console.` call exists in `shared/qa/`.
- Admin custom answers, refusals, and security blocks are never overridden.

## 8. Limitations

- No semantic retrieval. Paraphrases with no shared stems or terms are missed.
- Repeal and amendment status are not in the data. Every provision is `unknown` and carries the uncertainty phrase. This is the largest gap.
- The law archive (`laws.client.json`) is empty, so law-number questions get "not found" unless a record exists.
- No procedural content. Procedure questions are always insufficient.
- Darija support covers only the curated words in `translit.js`. It does not handle general Arabizi.
- Intent is regex rules. Unusual phrasing falls back to "lookup".
- Comparisons only restate the two definitions.
- The 2011 Constitution excerpts come from `reference-map.json`. The engine does not verify them against the official text.
- The engine does not claim legal correctness. Benchmark results measure the pipeline on repo data.

## 9. Tuning

- Weights, thresholds, authority classes, and budgets: `shared/qa/config.js`. Override in tests with `createEngine({ config: withConfig({...}) })`.
- Dominance ratio for typo correction: `DOMINANCE_RATIO` in `shared/qa/retrieve.js`.
- Latin legal words: `LATIN_LEGAL_TERMS` in `shared/qa/translit.js`.
- Code names and aliases: `CODE_ALIASES` in `shared/qa/entities.js`. Alias patterns must be written in normalized form (ة→ه, ى→ي, ئ→ي). A test enforces this.
- Add a benchmark item to `tests/fixtures/qa-benchmark.json`, and log any change to expectations in its `revisions` field.

## 10. Files

Added: `shared/qa/*.js` (config, input, normalize, morph, entities, intent, translit, corpus, analyze, retrieve, rank, answer, validate, engine), `tests/qa-engine.test.ts`, `tests/qa-benchmark.test.ts`, `tests/fixtures/qa-benchmark.json`, `docs/legal-question-engine.md`.

Changed: `shared/help/pipeline.js` (engine hook), `src/pages/admin/HelpAssistantPage.tsx` (two Arabic mode labels: `clarify`, `insufficient`).

Unchanged: routes, SEO metadata, the legacy answer path, the static content, and free access.
