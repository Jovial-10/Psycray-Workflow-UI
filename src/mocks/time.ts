const HOUR = 60 * 60 * 1000

/** ISO timestamp `days` (fractional allowed) before now, so mock dates stay recent. */
export function ago(days: number) {
  return new Date(Date.now() - days * 24 * HOUR).toISOString()
}
