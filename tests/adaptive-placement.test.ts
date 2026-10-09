import { describe, expect, test } from "vitest"
import {
  ADAPTIVE_MAX_ITEMS,
  ADAPTIVE_MIN_ITEMS,
  estimateAbility,
  itemDifficulty,
  itemInformation,
  nextAdaptiveQuestion,
  probabilityCorrect,
  rankForAbility,
  shouldStop,
} from "../shared/quiz/adaptive.js"

type Q = { id: string; difficulty: "easy" | "medium" | "hard" }

const LEVELS = ["easy", "medium", "hard"] as const
const POOL: Q[] = Array.from({ length: 120 }, (_, i) => ({ id: `q${i}`, difficulty: LEVELS[i % 3] }))

/** Deterministic random source (mulberry-style LCG) so simulations are reproducible. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0
    return a / 4294967296
  }
}

/** Runs one simulated student with true ability `theta` through the adaptive test. */
function simulate(theta: number, seed: number) {
  const rng = seeded(seed)
  const answered: Array<{ question: Q; correct: boolean }> = []
  let step = nextAdaptiveQuestion({ pool: POOL, answered, rng })
  while (!step.done) {
    const correct = rng() < probabilityCorrect(theta, itemDifficulty(step.question))
    answered.push({ question: step.question as Q, correct })
    step = nextAdaptiveQuestion({ pool: POOL, answered, rng })
  }
  return { answered, theta: step.theta, sd: step.sd }
}

describe("adaptive placement — model", () => {
  test("difficulty tags map to b = −1 / 0 / +1; unknown tags are medium", () => {
    expect(itemDifficulty({ difficulty: "easy" })).toBe(-1)
    expect(itemDifficulty({ difficulty: "medium" })).toBe(0)
    expect(itemDifficulty({ difficulty: "hard" })).toBe(1)
    expect(itemDifficulty({ difficulty: "??" })).toBe(0)
    expect(itemDifficulty(null)).toBe(0)
  })

  test("Rasch probability is 1/2 when θ = b, and information peaks there", () => {
    expect(probabilityCorrect(0.7, 0.7)).toBeCloseTo(0.5, 10)
    expect(itemInformation(0.7, 0.7)).toBeCloseTo(0.25, 10)
    expect(itemInformation(0, 2)).toBeLessThan(itemInformation(0, 0))
  })
})

describe("adaptive placement — estimation", () => {
  test("with no answers the estimate is the prior: θ = 0, sd = 1", () => {
    const { theta, sd } = estimateAbility([])
    expect(theta).toBeCloseTo(0, 6)
    expect(sd).toBeCloseTo(1, 2)
  })

  test("all correct raises θ, all wrong lowers it, and both stay finite", () => {
    const allRight = estimateAbility(Array.from({ length: 10 }, () => ({ b: 0, correct: true })))
    const allWrong = estimateAbility(Array.from({ length: 10 }, () => ({ b: 0, correct: false })))
    expect(Number.isFinite(allRight.theta)).toBe(true)
    expect(allRight.theta).toBeGreaterThan(1)
    expect(allWrong.theta).toBeLessThan(-1)
  })

  test("a correct answer on a hard item moves θ more than on an easy item", () => {
    const easy = estimateAbility([{ b: -1, correct: true }])
    const hard = estimateAbility([{ b: 1, correct: true }])
    expect(hard.theta).toBeGreaterThan(easy.theta)
  })

  test("more evidence shrinks the uncertainty", () => {
    const few = estimateAbility([{ b: 0, correct: true }])
    const many = estimateAbility(Array.from({ length: 9 }, (_, i) => ({ b: 0, correct: i % 2 === 0 })))
    expect(many.sd).toBeLessThan(few.sd)
  })
})

describe("adaptive placement — stopping and ranks", () => {
  test("never stops before the minimum number of items", () => {
    expect(shouldStop({ count: ADAPTIVE_MIN_ITEMS - 1, sd: 0.01 })).toBe(false)
  })

  test("stops once the minimum is reached and the estimate is precise enough", () => {
    expect(shouldStop({ count: ADAPTIVE_MIN_ITEMS, sd: 0.5 })).toBe(true)
    expect(shouldStop({ count: ADAPTIVE_MIN_ITEMS, sd: 0.9 })).toBe(false)
  })

  test("always stops at the maximum number of items", () => {
    expect(shouldStop({ count: ADAPTIVE_MAX_ITEMS, sd: 1 })).toBe(true)
  })

  test("rank cut-offs: D < −0.5 ≤ C < 0.25 ≤ B < 1.0 ≤ A", () => {
    expect(rankForAbility(-0.6)).toBe("D")
    expect(rankForAbility(-0.5)).toBe("C")
    expect(rankForAbility(0.24)).toBe("C")
    expect(rankForAbility(0.25)).toBe("B")
    expect(rankForAbility(0.99)).toBe("B")
    expect(rankForAbility(1.0)).toBe("A")
  })
})

describe("adaptive placement — selection", () => {
  test("the first question is a medium item (θ = 0 is most informative there)", () => {
    const { question, done } = nextAdaptiveQuestion({ pool: POOL, answered: [], rng: () => 0 })
    expect(done).toBe(false)
    expect(question?.difficulty).toBe("medium")
  })

  test("never repeats a question", () => {
    const { answered } = simulate(0.4, 99)
    const ids = answered.map((a) => a.question.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("returns done when the pool is exhausted", () => {
    const tiny: Q[] = [{ id: "only", difficulty: "easy" }]
    const first = nextAdaptiveQuestion({ pool: tiny, answered: [] })
    expect(first.question?.id).toBe("only")
    const after = nextAdaptiveQuestion({
      pool: tiny,
      answered: [{ question: tiny[0], correct: true }],
    })
    expect(after.done).toBe(true)
  })
})

describe("adaptive placement — simulated students", () => {
  test("test length stays within the bounds across ability levels", () => {
    for (const theta of [-2, -1, 0, 1, 2]) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const { answered } = simulate(theta, seed * 7919 + theta * 1000 + 17)
        expect(answered.length).toBeGreaterThanOrEqual(ADAPTIVE_MIN_ITEMS)
        expect(answered.length).toBeLessThanOrEqual(ADAPTIVE_MAX_ITEMS)
      }
    }
  })

  test("a weak student lands in D and a strong student lands in A (majority of runs)", () => {
    let weakD = 0
    let strongA = 0
    for (let seed = 1; seed <= 50; seed += 1) {
      if (rankForAbility(simulate(-2, seed * 31).theta) === "D") weakD += 1
      if (rankForAbility(simulate(2, seed * 37).theta) === "A") strongA += 1
    }
    expect(weakD).toBeGreaterThan(35)
    expect(strongA).toBeGreaterThan(35)
  })
})
