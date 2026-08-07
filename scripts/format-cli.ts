#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatInformixSpl } from "../src/formatter";
import { formatInformix4gl } from "../src/formatter-4gl";

const input = process.argv[2];
const output = process.argv[3] || input;

if (!input) {
  console.error("Usage: bun run scripts/format-cli.ts <input.ifs|spl|4gl|sql> [output]");
  process.exit(1);
}

const path = resolve(input);
const src = readFileSync(path, "utf8");
const is4gl = path.toLowerCase().endsWith(".4gl");

const formatted = is4gl
  ? formatInformix4gl(src, {
      uppercase: true,
      indentSize: 2,
      blankAfterIf: true,
      blankBeforeElseEndIf: true,
      blankBeforeBlock: true,
      blankAfterBlock: true,
      keepEndClosersTogether: true,
    })
  : formatInformixSpl(src, {
      uppercase: true,
      indentSize: 2,
      blankAfterQuery: true,
      blankAfterIf: true,
      blankAfterReturning: true,
      blankBeforeElseEndIf: true,
      blankBeforeException: true,
      blankAfterException: true,
      keepEndClosersTogether: true,
      spaceBeforeCreateTableParen: true,
      blankAroundDropTable: true,
      blankAfterCreateTable: true,
    });

writeFileSync(resolve(output!), formatted);
console.log(`Formatted ${input} -> ${output}`);
