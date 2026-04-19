import { run } from "./pipeline.ts";

run().catch((err) => {
  console.error("\n[ERROR]", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
