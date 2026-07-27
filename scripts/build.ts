#!/usr/bin/env bun
import { mkdirSync, renameSync, rmSync, watch } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const outdir = join(root, "dist");
const watchMode = process.argv.includes("--watch");

mkdirSync(outdir, { recursive: true });

async function buildOnce(): Promise<void> {
  // Clean stale outputs from older builds
  for (const stale of ["extension.js", "extension.js.map"]) {
    try {
      rmSync(join(outdir, stale));
    } catch {
      // ignore
    }
  }

  const result = await Bun.build({
    entrypoints: [join(root, "src/extension.ts")],
    outdir,
    target: "node",
    format: "cjs",
    minify: true,
    sourcemap: "none",
    external: ["vscode"],
    naming: "extension.js",
  });

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exitCode = 1;
    return;
  }

  // .cjs so Node/VS Code always load as CommonJS (even if package has "type":"module")
  const from = join(outdir, "extension.js");
  const to = join(outdir, "extension.cjs");
  renameSync(from, to);

  const size = Bun.file(to).size;
  console.log(`Built dist/extension.cjs (${size} bytes)`);
}

await buildOnce();

if (watchMode) {
  console.log("Watching src/ ...");
  watch(join(root, "src"), { recursive: true }, () => {
    void buildOnce();
  });
}
