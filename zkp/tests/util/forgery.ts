import fs from "fs";
import path from "path";
import type { WitnessTester } from "./witnessTester.js";

type Rewrite = { pattern: string; replacement: string };

const ANONYMOUS_SEGMENT = /^(.+)_(\d+)_(\d+)((?:\[\d+\])*)$/;

/**
 * Apply each rewrite exactly once, so a drifted source fails loudly instead of
 * silently producing an honest "evil" circuit.
 */
function applyRewrites(source: string, rewrites: readonly Rewrite[]): string {
  return rewrites.reduce((content, { pattern, replacement }) => {
    const occurrences = content.split(pattern).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `Expected exactly one occurrence of "${pattern}", found ${occurrences}`,
      );
    }
    return content.replace(pattern, () => replacement);
  }, source);
}

/** Point relative includes at the original directory from the new location. */
function relocateIncludes(
  source: string,
  fromDir: string,
  toDir: string,
): string {
  return source.replace(/include\s+"([^"]+)";/g, (match, includePath) => {
    const resolved = path.resolve(fromDir, includePath);
    if (!fs.existsSync(resolved)) return match;
    return `include "${path.relative(toDir, resolved)}";`;
  });
}

/**
 * Write a modified copy of a circuit next to the test build output.
 * Only witness-generation code should be rewritten; the copy is used to produce
 * a malicious witness that is then checked against the original R1CS.
 */
async function writeEvilCircuit(
  circuitPath: string,
  outPath: string,
  rewrites: readonly Rewrite[],
): Promise<string> {
  const source = await fs.promises.readFile(circuitPath, "utf8");
  const outDir = path.dirname(outPath);
  const relocated = relocateIncludes(source, path.dirname(circuitPath), outDir);

  await fs.promises.mkdir(outDir, { recursive: true });
  await fs.promises.writeFile(outPath, applyRewrites(relocated, rewrites));
  return outPath;
}

/**
 * Anonymous components are named `Template_<line>_<offset>`, which shifts when
 * the source is edited. Replace the position with the component's rank among
 * siblings of the same template so both circuits share symbol names.
 */
function normalizeSymbolNames(names: readonly string[]): Map<string, string> {
  const positions = new Map<string, Set<string>>();
  for (const name of names) {
    const segments = name.split(".");
    segments.forEach((segment, i) => {
      const match = ANONYMOUS_SEGMENT.exec(segment);
      if (!match) return;
      const key = `${segments.slice(0, i).join(".")}|${match[1]}`;
      const seen = positions.get(key) ?? new Set<string>();
      positions.set(key, seen.add(`${match[2]}_${match[3]}`));
    });
  }

  const ranks = new Map<string, Map<string, number>>(
    [...positions].map(([key, seen]) => {
      const sorted = [...seen].sort((a, b) => {
        const [la, ca] = a.split("_").map(Number);
        const [lb, cb] = b.split("_").map(Number);
        return la - lb || ca - cb;
      });
      return [key, new Map(sorted.map((pos, rank) => [pos, rank]))];
    }),
  );

  return new Map(
    names.map((name) => {
      const segments = name.split(".");
      const normalized = segments.map((segment, i) => {
        const match = ANONYMOUS_SEGMENT.exec(segment);
        if (!match) return segment;
        const key = `${segments.slice(0, i).join(".")}|${match[1]}`;
        const rank = ranks.get(key)?.get(`${match[2]}_${match[3]}`);
        return `${match[1]}#${rank}${match[4]}`;
      });
      return [name, normalized.join(".")];
    }),
  );
}

/**
 * Build a witness for `target` from a witness computed by `source` (an evil copy
 * of the same circuit), matching signals by normalized symbol name.
 *
 * @param renameSource - maps a normalized source symbol name to the target's naming
 * @throws if any signal kept in the target witness has no value in the source
 */
async function transplantWitness(
  target: WitnessTester<any, any>,
  targetWitness: readonly bigint[],
  source: WitnessTester<any, any>,
  sourceWitness: readonly bigint[],
  renameSource: (name: string) => string = (name) => name,
): Promise<bigint[]> {
  const targetValues = await target.readSymbols(targetWitness);
  const sourceValues = await source.readSymbols(sourceWitness);

  const targetNames = normalizeSymbolNames(Object.keys(targetValues));
  const sourceNames = normalizeSymbolNames(Object.keys(sourceValues));
  const sourceByName = new Map(
    [...sourceNames].map(([raw, normalized]) => [
      renameSource(normalized),
      sourceValues[raw],
    ]),
  );

  const kept = Object.keys(targetValues).filter(
    (name) => targetValues[name] !== undefined,
  );
  const missing = kept.filter(
    (name) => sourceByName.get(targetNames.get(name)!) === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} target signals have no source value, e.g. ${missing.slice(0, 3).join(", ")}`,
    );
  }

  const overrides = Object.fromEntries(
    kept.map((name) => [name, sourceByName.get(targetNames.get(name)!)!]),
  );
  return target.editWitness(targetWitness, overrides);
}

export { writeEvilCircuit, transplantWitness, normalizeSymbolNames };
export type { Rewrite };
