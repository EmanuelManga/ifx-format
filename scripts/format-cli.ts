#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatInformixSpl } from "../src/formatter";

const input = process.argv[2];
const output = process.argv[3] || input;

if (!input) {
  console.error("Usage: bun run scripts/format-cli.ts <input.ifs|spl|sql> [output]");
  process.exit(1);
}

const src = readFileSync(resolve(input), "utf8");
const formatted = formatInformixSpl(src, {
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
