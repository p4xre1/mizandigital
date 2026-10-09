/**
 * مُحلِّل robots.txt ومطابقة القواعد وفق RFC 9309:
 * - الأقسام تبدأ بـ User-agent، وتُختار المجموعة الأطول مطابقةً لاسم الزاحف، وإلا «*».
 * - بين القواعد المطابقة يفوز الأطول (بعدد المحارف)، وعند التساوي يفوز Allow.
 * - الأنماط تدعم «*» (أي تسلسل) و«$» (نهاية المسار). بلا قاعدة مطابقة يُسمح.
 */

export interface RobotsRule {
  type: "allow" | "disallow"
  pattern: string
}

export interface RobotsGroup {
  userAgents: string[]
  rules: RobotsRule[]
}

export interface RobotsDecision {
  allowed: boolean
  group: string
  rule?: RobotsRule
}

export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = []
  let current: RobotsGroup | null = null
  let collectingAgents = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim()
    if (!line) continue
    const colon = line.indexOf(":")
    if (colon < 0) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()

    if (key === "user-agent") {
      if (!current || !collectingAgents) {
        current = { userAgents: [], rules: [] }
        groups.push(current)
      }
      current.userAgents.push(value.toLowerCase())
      collectingAgents = true
      continue
    }

    collectingAgents = false
    if (!current) continue
    if (key === "allow" || key === "disallow") {
      // قاعدة فارغة في Disallow تعني «اسمح بكل شيء» فلا تُضاف.
      if (value === "") continue
      current.rules.push({ type: key, pattern: value })
    }
  }
  return groups
}

function selectGroup(groups: RobotsGroup[], userAgent: string): RobotsGroup | undefined {
  const agent = userAgent.toLowerCase()
  let best: { group: RobotsGroup; length: number } | undefined
  for (const group of groups) {
    for (const token of group.userAgents) {
      if (token === "*") continue
      if (agent.includes(token) && (!best || token.length > best.length)) {
        best = { group, length: token.length }
      }
    }
  }
  if (best) return best.group
  return groups.find((group) => group.userAgents.includes("*"))
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$")
  const body = anchored ? pattern.slice(0, -1) : pattern
  const source = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*")
  return new RegExp(`^${source}${anchored ? "$" : ""}`)
}

/** مسار الطلب كما يقارنه الزاحف: المسار مع الاستعلام، بلا الجزء المرجعي. */
export function pathOf(url: string): string {
  const parsed = new URL(url)
  return `${parsed.pathname}${parsed.search}`
}

export function decide(groups: RobotsGroup[], userAgent: string, url: string): RobotsDecision {
  const group = selectGroup(groups, userAgent)
  if (!group) return { allowed: true, group: "" }

  const path = pathOf(url)
  let winner: RobotsRule | undefined
  for (const rule of group.rules) {
    if (!patternToRegExp(rule.pattern).test(path)) continue
    if (
      !winner ||
      rule.pattern.length > winner.pattern.length ||
      (rule.pattern.length === winner.pattern.length && rule.type === "allow")
    ) {
      winner = rule
    }
  }
  const groupName = group.userAgents.join(", ")
  if (!winner) return { allowed: true, group: groupName }
  return { allowed: winner.type === "allow", group: groupName, rule: winner }
}
