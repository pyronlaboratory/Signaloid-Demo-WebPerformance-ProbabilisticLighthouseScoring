import type { UxMatch } from "./types.ts";

const UX_PATTERN =
  /([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)(Ux[0-9a-fA-F]{40,})/g;

/**
 * Extracts all Ux distribution strings from a Signaloid task stdout blob.
 * Each Ux string immediately follows the printed float mean value.
 */
export function extractUxStrings(stdout: string): UxMatch[] {
  const results: UxMatch[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex before each use since the pattern has the `g` flag.
  UX_PATTERN.lastIndex = 0;

  while ((match = UX_PATTERN.exec(stdout)) !== null) {
    const [, value, uxString] = match;

    if (value && uxString) {
      results.push({ value, uxString });
    }
  }

  return results;
}

export function printUxSummary(matches: UxMatch[]): void {
  if (matches.length === 0) {
    console.log("No Ux distribution strings found in output.");
    return;
  }

  console.log(`Found ${matches.length} Ux distribution(s):\n`);
  matches.forEach(({ value, uxString }, i) => {
    const preview = uxString.slice(0, 24) + "…";
    console.log(`  [${i}] value=${value}  uxString=${preview}`);
  });

  const head = matches[0]!;
  console.log(
    "\nTo visualise locally with signaloid-cli:\n" +
      `  signaloid-cli plot ux-string --ux-string "${head.uxString}" --out distributions`,
  );
}
