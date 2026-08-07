const TYPE_RE =
  /CHAR|VARCHAR|LVARCHAR|NCHAR|NVARCHAR|INTEGER|INT|SMALLINT|SERIAL|BIGINT|DECIMAL|NUMERIC|MONEY|FLOAT|SMALLFLOAT|DATE|DATETIME|INTERVAL|BYTE|TEXT|BOOLEAN|BLOB|CLOB/i;

const VAR_TYPE_RE = new RegExp(
  String.raw`\b([A-Za-z_][\w@$#]*)\s+(?:${TYPE_RE.source})\b`,
  "gi",
);

const FUNCTION_RE = /\bFUNCTION\s+[A-Za-z_][\w@$#]*\s*\(/gi;

const FUNCTION_NAME_RE = /\bFUNCTION[ \t]+([A-Za-z_][\w@$#]*)\b/gi;

const CALL_NAME_RE = /\b([A-Za-z_][\w@$#]*)\s*\(/g;

const DEFINE_START_RE = /\bDEFINE\b/gi;

const STMT_START_RE =
  /^(WHENEVER|LET|CALL|IF|FOR|FOREACH|WHILE|BEGIN|COMMIT|ROLLBACK|SET|EXECUTE|DISPLAY|RUN|EXIT|END|MAIN|FUNCTION|SELECT|INSERT|UPDATE|DELETE|DATABASE|RETURN)\b/i;

/** Common Informix/Genero 4GL builtins (lowercase). Easy to extend. */
export const FOURGL_BUILTINS = new Set([
  "num_args",
  "arg_val",
  "fgl_getenv",
  "fgl_putenv",
  "fgl_getversion",
  "fgl_getpid",
  "fgl_winmessage",
  "fgl_winquestion",
  "fgl_winwait",
  "fgl_dialog_setbuffer",
  "fgl_dialog_getbuffer",
  "fgl_dialog_setcurrline",
  "fgl_dialog_getkeylabel",
  "fgl_setkeylabel",
  "fgl_getkeylabel",
  "fgl_drawbox",
  "length",
  "upshift",
  "upsift",
  "downshift",
  "year",
  "month",
  "day",
  "weekday",
  "mdy",
  "date",
  "time",
  "trunc",
  "round",
  "abs",
  "sqrt",
  "mod",
  "err_get",
  "err_print",
  "err_quit",
  "startlog",
  "errorlog",
  "showhelp",
  "dbms_dialect",
  "sqlca_get",
]);

export function extractFunctionParams(text: string): Set<string> {
  const names = new Set<string>();
  FUNCTION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FUNCTION_RE.exec(text))) {
    const openAt = match.index + match[0].length;
    const closeAt = findMatchingParen(text, openAt - 1);
    if (closeAt < 0) continue;

    const body = text.slice(openAt, closeAt);
    const identRe = /[A-Za-z_][\w@$#]*/g;
    let pm: RegExpExecArray | null;
    while ((pm = identRe.exec(body))) {
      names.add(pm[0]!.toLowerCase());
    }
  }

  return names;
}

export function extractLocalFunctions(text: string): Set<string> {
  const names = new Set<string>();
  const spans = collectCodeSpans(text);

  for (const span of spans) {
    const chunk = text.slice(span.start, span.end);
    FUNCTION_NAME_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = FUNCTION_NAME_RE.exec(chunk))) {
      names.add(m[1]!.toLowerCase());
    }
  }

  return names;
}

export function findBuiltinCallOffsets(
  text: string,
  localFns: Set<string>,
): Span[] {
  const spans = collectCodeSpans(text);
  const out: Span[] = [];

  for (const span of spans) {
    const chunk = text.slice(span.start, span.end);
    CALL_NAME_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CALL_NAME_RE.exec(chunk))) {
      const name = m[1]!.toLowerCase();
      if (!FOURGL_BUILTINS.has(name)) continue;
      if (localFns.has(name)) continue;
      const from = span.start + m.index;
      out.push({ start: from, end: from + m[1]!.length });
    }
  }

  return out;
}

export function extractDefinedLocals(text: string): Set<string> {
  const names = new Set<string>();
  const spans = collectCodeSpans(text);

  for (const span of spans) {
    const chunk = text.slice(span.start, span.end);
    DEFINE_START_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DEFINE_START_RE.exec(chunk))) {
      const from = m.index + m[0].length;
      const block = takeDefineBlock(chunk, from);
      VAR_TYPE_RE.lastIndex = 0;
      let vm: RegExpExecArray | null;
      while ((vm = VAR_TYPE_RE.exec(block))) {
        names.add(vm[1]!.toLowerCase());
      }
    }
  }

  return names;
}

/** Text after DEFINE keyword until next statement at line start. */
function takeDefineBlock(chunk: string, from: number): string {
  let i = from;
  while (i < chunk.length) {
    const nl = chunk.indexOf("\n", i);
    if (nl < 0) return chunk.slice(from);
    const rest = chunk.slice(nl + 1);
    const lineMatch = rest.match(/^[ \t]*([^\n]*)/);
    const nextLine = (lineMatch?.[1] ?? "").trim();
    if (
      nextLine &&
      !nextLine.startsWith("--") &&
      STMT_START_RE.test(nextLine) &&
      !/^DEFINE\b/i.test(nextLine)
    ) {
      VAR_TYPE_RE.lastIndex = 0;
      if (!VAR_TYPE_RE.test(nextLine)) {
        return chunk.slice(from, nl);
      }
    }
    i = nl + 1;
  }
  return chunk.slice(from);
}

function findMatchingParen(text: string, openIndex: number): number {
  let depth = 0;
  let i = openIndex;

  while (i < text.length) {
    const ch = text[i]!;

    if (ch === "-" && text[i + 1] === "-") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (ch === "{") {
      i++;
      while (i < text.length && text[i] !== "}") i++;
      if (i < text.length) i++;
      continue;
    }
    if (ch === "'") {
      i++;
      while (i < text.length) {
        if (text[i] === "'" && text[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (text[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < text.length) {
        if (text[i] === '"' && text[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

export type Span = { start: number; end: number };

export type ControlFamily4gl =
  | "if"
  | "for"
  | "foreach"
  | "while"
  | "main"
  | "function";

const CONTROL_RE =
  /\b(?:END\s+FOREACH|END\s+WHILE|END\s+FOR|END\s+IF|END\s+MAIN|END\s+FUNCTION|ELSE\s+IF|FOREACH|WHILE|ELIF|ELSE|THEN|FOR|IF|DO|MAIN|FUNCTION)\b/gi;

export function findControlKeywordOffsets(
  text: string,
): { family: ControlFamily4gl; start: number; end: number }[] {
  const spans = collectCodeSpans(text);
  const out: { family: ControlFamily4gl; start: number; end: number }[] = [];

  for (const span of spans) {
    const chunk = text.slice(span.start, span.end);
    CONTROL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CONTROL_RE.exec(chunk))) {
      const raw = m[0]!;
      const family = controlFamily(raw);
      if (!family) continue;
      const from = span.start + m.index;
      out.push({ family, start: from, end: from + raw.length });
    }
  }

  return out;
}

function controlFamily(raw: string): ControlFamily4gl | null {
  const t = raw.replace(/\s+/g, " ").toUpperCase();
  if (
    t === "IF" ||
    t === "ELSE" ||
    t === "ELSE IF" ||
    t === "ELIF" ||
    t === "THEN" ||
    t === "END IF"
  ) {
    return "if";
  }
  if (t === "FOREACH" || t === "END FOREACH") return "foreach";
  if (t === "FOR" || t === "END FOR") return "for";
  if (t === "WHILE" || t === "DO" || t === "END WHILE") return "while";
  if (t === "MAIN" || t === "END MAIN") return "main";
  if (t === "FUNCTION" || t === "END FUNCTION") return "function";
  return null;
}

export function collectCodeSpans(text: string): Span[] {
  const spans: Span[] = [];
  let start = 0;
  let i = 0;

  const push = (from: number, to: number) => {
    if (to > from) spans.push({ start: from, end: to });
  };

  while (i < text.length) {
    const ch = text[i]!;

    if (ch === "-" && text[i + 1] === "-") {
      push(start, i);
      while (i < text.length && text[i] !== "\n") i++;
      start = i;
      continue;
    }
    if (ch === "{") {
      push(start, i);
      i++;
      while (i < text.length && text[i] !== "}") i++;
      if (i < text.length) i++;
      start = i;
      continue;
    }
    if (ch === "'") {
      push(start, i);
      i++;
      while (i < text.length) {
        if (text[i] === "'" && text[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (text[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      start = i;
      continue;
    }
    if (ch === '"') {
      push(start, i);
      i++;
      while (i < text.length) {
        if (text[i] === '"' && text[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      start = i;
      continue;
    }
    i++;
  }
  push(start, text.length);
  return spans;
}

export function findNameOffsets(text: string, names: Set<string>): Span[] {
  if (names.size === 0) return [];

  const spans = collectCodeSpans(text);
  const out: Span[] = [];
  const identRe = /[A-Za-z_][\w@$#]*/g;

  for (const span of spans) {
    const chunk = text.slice(span.start, span.end);
    identRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = identRe.exec(chunk))) {
      if (!names.has(m[0]!.toLowerCase())) continue;
      const from = span.start + m.index;
      out.push({ start: from, end: from + m[0]!.length });
    }
  }

  return out;
}

// ponytail: assert-based self-check; run with `bun src/highlight-parse-4gl.ts`
if (import.meta.main) {
  const sample = `
MAIN
  DEFINE lc_cuenta INTEGER,
    ln_cuit DECIMAL(11,0)
  IF num_args() < 2 THEN
    LET lc_cuenta = ARG_VAL(1)
  END IF
  CALL ff_baja_cuenta(lc_cuenta, ln_cuit)
END MAIN

FUNCTION ff_baja_cuenta(pc_cuenta, pn_cuit)
  DEFINE pc_cuenta INTEGER,
    pn_cuit DECIMAL(11,0),
    l_bajas INTEGER
  IF STATUS < 0 THEN
    EXIT PROGRAM 1
  END IF
END FUNCTION
`;
  const locals = extractDefinedLocals(sample);
  for (const name of ["lc_cuenta", "ln_cuit", "l_bajas"]) {
    if (!locals.has(name)) throw new Error(`missing local ${name}: ${[...locals]}`);
  }
  const params = extractFunctionParams(sample);
  for (const name of ["pc_cuenta", "pn_cuit"]) {
    if (!params.has(name)) throw new Error(`missing param ${name}`);
  }
  const fns = extractLocalFunctions(sample);
  if (!fns.has("ff_baja_cuenta")) throw new Error(`missing local fn: ${[...fns]}`);
  const fnHits = findNameOffsets(sample, fns);
  if (fnHits.length < 2) {
    throw new Error(`expected decl+call for local fn, got ${fnHits.length}`);
  }
  const builtins = findBuiltinCallOffsets(sample, fns);
  const builtinText = builtins.map((s) => sample.slice(s.start, s.end).toLowerCase());
  if (!builtinText.includes("num_args") || !builtinText.includes("arg_val")) {
    throw new Error(`expected num_args/arg_val builtins, got ${builtinText}`);
  }
  const controls = findControlKeywordOffsets(sample);
  const families = new Set(controls.map((c) => c.family));
  if (!families.has("main") || !families.has("function") || !families.has("if")) {
    throw new Error(`bad families: ${[...families]}`);
  }
  console.log("ok");
}
