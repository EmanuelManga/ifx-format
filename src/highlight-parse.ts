const TYPE_RE =
  /CHAR|VARCHAR|LVARCHAR|NCHAR|NVARCHAR|INTEGER|INT|SMALLINT|SERIAL|BIGINT|DECIMAL|NUMERIC|MONEY|FLOAT|SMALLFLOAT|DATE|DATETIME|INTERVAL|BYTE|TEXT|BOOLEAN|BLOB|CLOB/i;

const PARAM_IN_LIST_RE = new RegExp(
  String.raw`\b([A-Za-z_][\w@$#]*)\s+(?:${TYPE_RE.source})\b`,
  "gi",
);

const DEFINE_RE =
  /\bDEFINE\s+(?:GLOBAL\s+)?([A-Za-z_][\w@$#]*)\b/gi;

const CREATE_PROC_RE = /\bCREATE\s+PROCEDURE\s+[A-Za-z_][\w@$#]*\s*\(/gi;

export function extractProcedureParams(text: string): Set<string> {
  const names = new Set<string>();
  CREATE_PROC_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CREATE_PROC_RE.exec(text))) {
    const openAt = match.index + match[0].length;
    const closeAt = findMatchingParen(text, openAt - 1);
    if (closeAt < 0) continue;

    const body = text.slice(openAt, closeAt);
    PARAM_IN_LIST_RE.lastIndex = 0;
    let pm: RegExpExecArray | null;
    while ((pm = PARAM_IN_LIST_RE.exec(body))) {
      names.add(pm[1]!.toLowerCase());
    }
  }

  return names;
}

const ON_EXCEPTION_SET_RE =
  /\bON\s+EXCEPTION\s+SET\s+([A-Za-z_][\w@$#]*(?:\s*,\s*[A-Za-z_][\w@$#]*)*)/gi;

export function extractDefinedLocals(text: string): Set<string> {
  const names = new Set<string>();
  DEFINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DEFINE_RE.exec(text))) {
    names.add(match[1]!.toLowerCase());
  }

  ON_EXCEPTION_SET_RE.lastIndex = 0;
  while ((match = ON_EXCEPTION_SET_RE.exec(text))) {
    for (const name of match[1]!.split(/\s*,\s*/)) {
      names.add(name.toLowerCase());
    }
  }
  return names;
}

/** Index of `(` is openIndex; returns index of matching `)`. */
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

export type ControlFamily = "if" | "for" | "foreach" | "while" | "exception";

const CONTROL_RE =
  /\b(?:END\s+FOREACH|END\s+WHILE|END\s+FOR|END\s+IF|END\s+EXCEPTION|ON\s+EXCEPTION|ELSE\s+IF|FOREACH|WHILE|ELIF|ELSE|THEN|FOR|IF|DO)\b/gi;

export function findControlKeywordOffsets(
  text: string,
): { family: ControlFamily; start: number; end: number }[] {
  const spans = collectCodeSpans(text);
  const out: { family: ControlFamily; start: number; end: number }[] = [];

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

function controlFamily(raw: string): ControlFamily | null {
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
  if (t === "ON EXCEPTION" || t === "END EXCEPTION") return "exception";
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

// ponytail: assert-based self-check; run with `bun src/highlight-parse.ts`
if (import.meta.main) {
  const sample = `
ON EXCEPTION SET v_err, v_isam, v_txt
  RETURN v_err;
END EXCEPTION
RAISE EXCEPTION -746, 0, 'x';
`;
  const locals = extractDefinedLocals(sample);
  for (const name of ["v_err", "v_isam", "v_txt"]) {
    if (!locals.has(name)) throw new Error(`missing local ${name}`);
  }
  const controls = findControlKeywordOffsets(sample);
  const families = controls.map((c) => c.family);
  if (!families.includes("exception") || controls.length < 2) {
    throw new Error(`expected ON/END EXCEPTION control hits, got ${JSON.stringify(controls)}`);
  }
  console.log("ok");
}
