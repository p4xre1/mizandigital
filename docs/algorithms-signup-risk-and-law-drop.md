# Two algorithms: sign-up risk and law-PDF drop

Both are pure, dependency-free modules under `shared/` with tests in `tests/`.

## 1. Account-creation risk (`shared/security/signup-risk.js`)

**Question it answers:** how likely is this sign-up to be abuse (throwaway, bulk, bot)?

**Where it runs**

- `functions/api/account/signup-risk.js`: `POST /api/account/signup-risk`. It gathers
  the IP velocity, User-Agent, Cloudflare `CF-IPCountry`, and Turnstile result, then
  scores the attempt.
- `src/pages/auth/LoginPage.tsx`: calls the endpoint right before `supabase.auth.signUp`.
  It also contains a hidden honeypot field named `website`.

**Decision**

| score | action | effect |
| --- | --- | --- |
| 0–39 | `allow` | sign-up proceeds |
| 40–69 | `challenge` | sign-up proceeds; the attempt is marked suspicious in server logs |
| 70–100, or a hard stop | `block` | sign-up refused with a neutral message |

Hard stops (score 100): invalid email, honeypot filled.

**Signals and weights** are listed at the top of `shared/security/signup-risk.js`.
The most important: disposable domain (+70), IP velocity (+25 / +50 / +80 per hour,
+25 per day), instant submit (+30), headless/curl user agent (+40), Tor (+30),
Turnstile missing when configured (+50).

**Design rules**

- A single weak signal never blocks a legitimate user.
- Geography is not scored (many legitimate users sign up from abroad). Only Tor is.
- Reasons are logged server-side only. The client gets the action and a neutral message.
- Failure policy: the browser treats any failed check as `allow`, and the endpoint
  fails open on internal errors. An outage must not stop real sign-ups.

**Tuning:** campus Wi-Fi puts many students behind one IP. Check the velocity bands
(`SIGNUP_VELOCITY`) against real sign-up peaks before lowering them.

**Enforcement gap:** the browser check can be bypassed by calling Supabase Auth
directly. The stronger layer is a Supabase Auth "before user created" hook that calls
the same scorer. Not implemented yet; it needs Supabase dashboard configuration.

**Optional config:** `RATE_LIMIT_KV` (global counters), `TURNSTILE_SECRET_KEY`
(human check), `IP_HASH_SALT` (IP fingerprint salt). All are the same bindings the
comment endpoint uses.

## 2. Law PDF drop → landing page (`shared/laws/drop-publish.js`)

**Trigger:** an admin drops a PDF into the archive form (`/admin/laws` → upload).

**What happens**

1. `LawsPage` reads the first two pages of the PDF with pdf.js
   (`src/lib/pdf/firstPageText.ts`). If reading fails, the file name alone is used.
2. `planLawDrop()` extracts the title, law number (`46.21`), gazette number, and
   publication date. It checks for duplicates against the archive.
3. Empty form fields are pre-filled. Typed values are never overwritten.
4. A status panel shows `ready`, `needs_review`, or `duplicate`.
5. Saving publishes the law. The landing page's law section (`HomeLawArchive`) fetches
   the newest archive rows on load, so a saved law with a date and PDF appears on the
   home page without a rebuild. The static snapshot catches up on the next scheduled
   rebuild (`refresh-content`, every 6 hours).

**Rules**

- **Never invent a date.** The archive and landing page sort by publication date. A
  missing date means `needs_review`.
- **Duplicates are not saved as new rows.** Matching is by law number, then normalized
  title, then PDF file name.
- **Landing placement:** a ready law is shown on the home page only if it ranks within
  `LANDING_CARD_LIMIT` (6) among existing laws, using the same order as
  `compareNewestFirst` in `src/lib/laws/showcase.ts`.
- **Non-PDF files** (for example `.docx`) are never shown on the landing page.

**Known limits**

- Scanned PDFs with no text layer yield no text, so only the file name is used. The
  admin then types the number and date by hand.
- Hijri-only dates are not read as publication dates. Only Gregorian dates are.
- Dahir numbers such as `1.24.01` are not law numbers and are not extracted.

## Tests

```bash
npx vitest run --configLoader runner tests/signup-risk.test.ts tests/signup-risk-endpoint.test.ts tests/signup-risk-client.test.ts tests/law-drop-publish.test.ts
```
