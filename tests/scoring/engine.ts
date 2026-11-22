/** Re-exports the engine for tests, plus a static check on its source. */
import { readFileSync } from "node:fs"

export * from "../../src/lib/scoring/icpEngine.ts"

/** True when the engine source has no clock reads and no randomness. */
export function ENGINE_FREE_OF_CLOCK_CHECK(): boolean {
  const src = readFileSync(new URL("../../src/lib/scoring/icpEngine.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
  return !/Date\.now\(|new Date\(\s*\)|Math\.random\(|performance\.now\(/.test(src)
}
