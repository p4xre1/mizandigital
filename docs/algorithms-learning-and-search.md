# Five algorithms: learning, placement, citations, anti-farming, search

Each algorithm is a pure, dependency-free module under `shared/` (or a small wrapper),
with tests in `tests/`. The two earlier algorithms (sign-up risk and law-PDF drop) are in
`docs/algorithms-signup-risk-and-law-drop.md`.

| # | Algorithm | Pure module | Wired into |
| --- | --- | --- | --- |
| 1 | Spaced repetition (SM-2) | `shared/learning/spaced-repetition.js` | `src/lib/learning/reviewStore.ts`, `QuizRunner`, `/quiz/review`, hub banner |
| 2 | Adaptive placement (Rasch IRT, EAP) | `shared/quiz/adaptive.js` (+ `.d.ts`) | `QuizRunner` (`adaptive` prop), `PlacementQuizPage` |
| 3 | Law citation and staleness auditor | `shared/laws/citations.js` | `scripts/check-law-citations.mjs`, `npm run check:citations` |
| 4 | XP anti-farming | `shared/quiz/anti-farming.js` | `functions/api/quiz/submit.js` (see the gap below) |
| 5 | BM25 search ranking | `shared/search/bm25.js` (+ `.d.ts`) | `src/pages/public/SearchPage.tsx` |

---

## 1. Spaced repetition (`shared/learning/spaced-repetition.js`)

**Question it answers:** when should a question the student has already answered come back?

- Grades: wrong = 1; right and slow (≥ 20 s) = 3; right = 4; right and fast (≤ 6 s) = 5.
- SM-2 scheduling: a failed recall resets reps and sets the interval to 1 day. A passing
  recall gives intervals of 1, then 3, then `round(interval × ease)`.
- Ease starts at 2.5, moves with the SM-2 formula, and never drops below 1.3.
- Due questions are sorted most overdue first, then by lapses (weakest first).

**Storage:** per-device, `localStorage` key `mizan:review:v1`. Each answered question gets
one entry. "Today" is the calendar day in Africa/Casablanca, so an answer at 23:50 does not
shift to the next day. Nothing is sent to the server; the schedule works offline.

**Where:** `QuizRunner.handleAnswer` records every answer, in every mode. `/quiz/review`
shows today's due questions (up to 20 per session, `noindex`). `QuizHubPage` shows a banner
with the due count.

---

## 2. Adaptive placement (`shared/quiz/adaptive.js`)

**Question it answers:** what rank does this student deserve, and how few questions can we
ask to know it?

**Model:** Rasch (1PL). `P(correct) = 1 / (1 + e^-(θ − b))`. Item difficulty `b` comes from the
difficulty tag: easy −1, medium 0, hard +1. The tags are coarse, so the estimate is coarse.
It is good enough for a rank, not for a score.

**Estimation:** expected a posteriori on a grid from −4 to 4 (81 points), with a standard
normal prior. This stays finite when every answer is right or wrong, unlike maximum likelihood.

**Selection:** the unused item with the most Fisher information `P(1 − P)` at the current θ.
One of the top 3 is picked at random, so students do not all see the same sequence.

**Stopping:** at least 8 answers, and posterior SD ≤ 0.6. At most 15 answers.

**Rank:** from the posterior mean θ. D < −0.5 ≤ C < 0.25 ≤ B < 1.0 ≤ A.

**Calibration (a change from the first plan):** the first design used SD ≤ 0.35. With only three
difficulty levels, the posterior SD never fell below 0.35 within 15 items, so every session ran
to 15. Simulating 200 students at each ability level from θ = −2 to +2 showed that a threshold of
0.6 gives about 9 items on average (range 8–12), and the rank still matches the true ability in
most runs. This is recorded in the module comments and in `tests/adaptive-placement.test.ts`.

**Where:** `QuizRunner` with `adaptive`. The next question is computed right after each answer,
so the UI knows whether the current question is the last one. In adaptive placement, the rank
comes from θ, not from the percentage score. `PlacementQuizPage` uses the full bank minus
interview-training questions (210 questions: 66 easy, 124 medium, 20 hard).

**Known limit:** only 20 hard items exist, so strong students may run short of hard questions
before they stop. The test then ends early, which is safe.

---

## 3. Law citation and staleness auditor (`shared/laws/citations.js`)

**Question it answers:** which laws do we cite, and can we still trust those citations?

**Finding citations:** a keyword (`القانون`, `قانون`, `loi`), an optional number marker, then a
number of the form `NN.YY` or `NN-YY`. Arabic-Indic digits are converted first. A number followed
by `.ddd` or `-ddd` is a dahir (for example `1.02.297`) and is rejected. Keyword matching avoids
hits on prices. A law mentioned without a keyword (for example `مدونة السير 52.05`) is not found.

**Classification:**

| Severity | Code | Meaning |
| --- | --- | --- |
| error | `repealed_cited` | the archive row or the status record says repealed |
| warning | `not_in_archive` | the archive is non-empty and the law is not in it |
| warning | `status_stale` | the status record is older than 180 days |
| warning | `source_not_verified_recently` | a lexicon legal source has `last_verified` older than 180 days |
| info | `unverifiable_no_archive` | the archive is empty, so the citation cannot be checked |

**Empty archive:** the snapshot's `src/data/laws.client.json` has 0 laws, so every citation
currently comes out as `info`. That is the honest answer, not a failure. The auditor never
treats "not in an empty archive" as "missing".

**Run it:**

```bash
npm run check:citations                 # report, exit 0
node scripts/check-law-citations.mjs --strict   # exit 1 on any error or warning
node scripts/check-law-citations.mjs --today=2026-10-09
```

Scanned sources: articles, news, quiz questions, lexicon (all strings, plus `legal_sources`),
`laws.client.json`, and an optional `src/data/law-status.json`. No status file is committed,
because it would need facts that have not been checked.

**Not decided by this tool:** whether a law is in force. It reports what our own data says;
a person decides.

---

## 4. XP anti-farming (`shared/quiz/anti-farming.js`)

**Question it answers:** is this quiz session a script?

**Signals** (points add up; a session is dropped at 60):

| Code | Points | Rule |
| --- | --- | --- |
| `fast_answers_80` | 50 | ≥ 80% of answers under 1.5 s (needs ≥ 5 answers) |
| `fast_answers_50` | 25 | ≥ 50% under 1.5 s |
| `uniform_timing` | 40 | answer times almost identical (SD < 150 ms); timed-out answers are excluded |
| `constant_choice` | 20 | the same option every time (≥ 10 answers) |
| `duration_mismatch` | 40 | sum of answer times exceeds the session duration by more than 2 s |
| `duplicate_questions` | 30 | a question id appears twice in one session |

A single signal never drops a session. The client-sent `correct` flag is **not** used, because
the client can set it to anything. Only timings, ids, and choices are used.

**Endpoint behaviour (`POST /api/quiz/submit`):** a dropped session returns `202 {ok, recorded:false}`
with no RPC call and no reasons. The reasons go to the server log, as codes only.

**The rate limit was broken.** `submit.js` called `checkRateLimit(env, key, 20, 600)` with
positional arguments, but `checkRateLimit` takes one options object. The destructure gave
`limit: undefined`, so the check never blocked anyone, and the code read `retryAfter` where the
field is `retryAfterSeconds`. Both are fixed; `tests/quiz-submit-endpoint.test.ts` checks that the
21st attempt from one IP gets a 429.

**Gap, not yet closed:** the browser does not call `/api/quiz/submit`. `attemptService.ts` calls
the Supabase RPC `submit_quiz_attempt` directly, and that RPC awards the speed bonus with no bot
check. So the guard protects the endpoint, not the live path. To close it, either:

1. route `attemptService.ts` through `/api/quiz/submit` (needs a check of how the user reference
   and the response shape flow through the endpoint), or
2. port the same rules into the SQL function, where they cannot be bypassed.

Option 2 is the stronger choice. It is a database migration and needs review before it ships.

---

## 5. BM25 search ranking (`shared/search/bm25.js`)

**Question it answers:** which results are most relevant to the query?

**Retrieval (changed):** the old search matched the whole phrase with `ILIKE`, so `مدونة الشغل`
matched only rows containing that exact sequence. It also put raw user text into the PostgREST
`.or()` string, so a comma or parenthesis could break the filter. The new search:

- `sanitizeQueryTokens` keeps only letters and digits, drops stopwords, removes duplicates, and
  caps at **5 terms**. The result is safe in a filter.
- Each table matches **any** term in any listed field (`field.ilike.%term%`).

**Ranking:** BM25 with `k1 = 1.2`, `b = 0.75`. Titles count double (`TITLE_BOOST = 2`). A row with
the whole phrase in order gets `+2` (`PHRASE_BONUS`). The Arabic normalisation matches
`normalizeArabic` in `src/lib/utils/search.ts`, with alef, ya, and ta marbuta unified, plus harakat removed.

**Per-table ranking:** each table is ranked separately. IDF is computed within one table, so a
term that is rare in articles does not count as rare in laws.

**Zero-score rows are kept, at the end.** A row can match on a column the client did not fetch
(for example an article body), so dropping it would lose real results.

**Limit:** ranking applies to the rows fetched (up to 30 per table), not to the whole database.

---

## Tests

| File | Covers |
| --- | --- |
| `tests/spaced-repetition.test.ts` | dates, grades, SM-2 intervals, ease floor, due queue |
| `tests/review-store.test.ts` | Morocco day, due-after-wrong, corrupt storage, clearing |
| `tests/adaptive-placement.test.ts` | Rasch model, EAP, stopping, rank cut-offs, selection, simulated students |
| `tests/quiz-runner-adaptive.test.tsx` | the full adaptive loop in jsdom: bounded length, rank A and D, review recording |
| `tests/review-quiz-page.test.tsx` | `/quiz/review`: due count, start, empty state |
| `tests/law-citations.test.ts` | extraction (digits, dash form, dahir rejection), audit classes |
| `tests/anti-farming.test.ts` | human sessions pass; bot sessions drop; robustness |
| `tests/quiz-submit-endpoint.test.ts` | silent drop with no RPC call; working rate limit; validation |
| `tests/bm25-search.test.ts` | normalisation, query sanitising, ranking behaviour |
| `tests/search-page-query.test.tsx` | the filter sent to Supabase: OR terms, no unsafe characters |

## Defaults and choices

These are design choices, not facts from the user. Adjust them in the module constants.

- SM-2 quality bands: slow ≥ 20 s, fast ≤ 6 s.
- Adaptive: min 8 / max 15 items; stop at SD ≤ 0.6; rank cut-offs −0.5 / 0.25 / 1.0.
- Anti-farming: drop at 60; fast = under 1.5 s.
- BM25: k1 1.2, b 0.75, title ×2, phrase +2, 5 query terms, 30 rows per table.
- Citation staleness: 180 days.
