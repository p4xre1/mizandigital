/**
 * Browser side of Algorithm 1 (account-creation risk).
 *
 * The decision is made on the server (POST /api/account/signup-risk). This
 * helper only sends the form signals and interprets the answer.
 *
 * Failure policy: if the check cannot be completed (network error, non-2xx
 * response, malformed JSON), we return "allow". A client-side check cannot be
 * the only protection anyway, so an outage must not stop real users from
 * signing up.
 */

export type SignupRiskAction = "allow" | "challenge" | "block"

export interface SignupRiskInput {
  email: string
  username?: string
  fullName?: string
  /** Epoch ms when the form was first shown. Used to detect instant submits. */
  formStartedAt?: number
  /** Hidden honeypot field value. Must be empty for a human. */
  website?: string
  turnstileToken?: string
}

export interface SignupRiskResult {
  action: SignupRiskAction
  /** Neutral Arabic message for the user, or null when there is nothing to show. */
  message: string | null
}

const ALLOW: SignupRiskResult = { action: "allow", message: null }
const ENDPOINT = "/api/account/signup-risk"

export async function checkSignupRisk(input: SignupRiskInput): Promise<SignupRiskResult> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) return ALLOW

    const data = (await res.json()) as Partial<SignupRiskResult>
    if (data.action !== "allow" && data.action !== "challenge" && data.action !== "block") return ALLOW
    return {
      action: data.action,
      message: typeof data.message === "string" && data.message.trim() ? data.message : null,
    }
  } catch {
    return ALLOW
  }
}
