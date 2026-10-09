// Types for shared/quiz/adaptive.js (Rasch IRT adaptive placement).

export const ADAPTIVE_MIN_ITEMS: number
export const ADAPTIVE_MAX_ITEMS: number
export const STOP_SD: number
export const SELECTION_TOP_K: number
export const DIFFICULTY_B: Readonly<{ easy: -1; medium: 0; hard: 1 }>
export const RANK_THRESHOLDS: Readonly<{ C: number; B: number; A: number }>

export type PlacementRank = "D" | "C" | "B" | "A"

export interface AdaptiveItem {
  id: string
  difficulty?: string
}

export interface AdaptiveResponse {
  b: number
  correct: boolean
}

export function itemDifficulty(question: { difficulty?: string } | null | undefined): number
export function probabilityCorrect(theta: number, b: number): number
export function itemInformation(theta: number, b: number): number
export function estimateAbility(responses: AdaptiveResponse[]): { theta: number; sd: number }
export function shouldStop(state: { count: number; sd: number }): boolean
export function rankForAbility(theta: number): PlacementRank

export function nextAdaptiveQuestion<T extends AdaptiveItem>(args: {
  pool: T[]
  answered?: Array<{ question: T; correct: boolean }>
  rng?: () => number
}): { question: T | null; theta: number; sd: number; done: boolean }
