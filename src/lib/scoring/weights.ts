/**
 * Weight editing helpers for the ICP Studio. Not part of scoring: they only
 * propose new weights, which the engine then validates like any other.
 */
import { CRITERIA, type CriterionKey } from "./icpEngine.ts"

export type Weights = Record<CriterionKey, number>

export function totalWeight(w: Weights): number {
  return CRITERIA.reduce((sum, c) => sum + w[c.key], 0)
}

export interface Redistribution {
  weights: Weights
  /** One line per weight that moved, e.g. "Growth Signals 25% → 21%". */
  changes: string[]
}

/**
 * Sets `key` to `value` and scales the other unlocked weights in proportion
 * so the total is exactly 100. Uses largest-remainder rounding so every
 * weight stays a whole number. Returns an error message when it can't.
 */
export function redistribute(
  weights: Weights,
  key: CriterionKey,
  value: number,
  locked: ReadonlySet<CriterionKey>,
): Redistribution | { error: string } {
  const target = Math.round(value)
  const free = CRITERIA.map((c) => c.key).filter((k) => k !== key && !locked.has(k))
  const lockedSum = CRITERIA.filter((c) => c.key !== key && locked.has(c.key)).reduce((s, c) => s + weights[c.key], 0)
  const remaining = 100 - target - lockedSum

  if (target < 0 || target > 100) return { error: "Weights must be between 0 and 100%." }
  if (free.length === 0) return { error: "Unlock at least one other criterion to redistribute." }
  if (remaining < 0) return { error: `Locked criteria already use ${lockedSum}%, so this can be at most ${100 - lockedSum}%.` }

  const freeSum = free.reduce((s, k) => s + weights[k], 0)
  // Proportional shares; spread evenly when the free weights are all zero
  const exact = free.map((k) => ({ k, v: freeSum > 0 ? (weights[k] / freeSum) * remaining : remaining / free.length }))
  const floored = exact.map((e) => ({ ...e, n: Math.floor(e.v) }))
  let left = remaining - floored.reduce((s, e) => s + e.n, 0)
  // Largest remainder first; ties broken by criterion order, so the result is deterministic
  for (const e of [...floored].sort((a, b) => b.v - b.n - (a.v - a.n))) {
    if (left <= 0) break
    e.n++
    left--
  }

  const next: Weights = { ...weights, [key]: target }
  for (const e of floored) next[e.k] = e.n
  const changes = CRITERIA.filter((c) => next[c.key] !== weights[c.key]).map(
    (c) => `${c.label} ${weights[c.key]}% → ${next[c.key]}%`,
  )
  return { weights: next, changes }
}
