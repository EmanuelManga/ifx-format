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

export function extractDefinedLocals(text: string): Set<string> {
  const names = new Set<string>();
  DEFINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DEFINE_RE.exec(text))) {
    names.add(match[1]!.toLowerCase());
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
