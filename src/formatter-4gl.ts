/** Options for Informix 4GL formatting. */
export type Format4glOptions = {
  uppercase?: boolean;
  indentSize?: number;
  useTabs?: boolean;
  blankAfterIf?: boolean;
  blankBeforeElseEndIf?: boolean;
  blankBeforeBlock?: boolean;
  blankAfterBlock?: boolean;
  keepEndClosersTogether?: boolean;
};

const KEYWORDS = [
  "DATABASE",
  "MAIN",
  "FUNCTION",
  "END",
  "DEFINE",
  "GLOBAL",
  "LET",
  "CALL",
  "DISPLAY",
  "RUN",
  "EXIT",
  "PROGRAM",
  "WHENEVER",
  "ERROR",
  "CONTINUE",
  "STOP",
  "IF",
  "THEN",
  "ELSE",
  "ELIF",
  "FOR",
  "FOREACH",
  "WHILE",
  "DO",
  "TO",
  "STEP",
  "EXECUTE",
  "PROCEDURE",
  "INTO",
  "RETURNING",
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "IN",
  "BETWEEN",
  "IS",
  "NULL",
  "SET",
  "LOCK",
  "MODE",
  "WAIT",
  "BEGIN",
  "WORK",
  "COMMIT",
  "ROLLBACK",
  "WITH",
  "HOLD",
  "STATUS",
  "SQLCA",
  "INTEGER",
  "SMALLINT",
  "BIGINT",
  "INT",
  "DECIMAL",
  "NUMERIC",
  "MONEY",
  "FLOAT",
  "CHAR",
  "VARCHAR",
  "LVARCHAR",
  "DATE",
  "DATETIME",
  "INTERVAL",
  "BOOLEAN",
  "LIKE",
  "RETURN",
] as const;

const KEYWORD_RE = new RegExp(`\\b(${KEYWORDS.join("|")})\\b`, "gi");
const STRING_RE = /(["'])(?:\\.|(?!\1).)*\1/g;
const CLAUSE_RE =
  /^(INTO|FROM|WHERE|VALUES|SET|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|GROUP|ORDER|HAVING|ON|WHEN|RETURNING)\b/i;
const EXTRA_CONTINUATION_RE = /^(AND|OR|,)/i;

type OpenerFlags = {
  main: boolean;
  function: boolean;
  ifThen: boolean;
  ifOnly: boolean;
  forLoop: boolean;
  foreach: boolean;
  whileDo: boolean;
};

export function formatInformix4gl(
  text: string,
  options: Format4glOptions = {},
): string {
  const uppercase = options.uppercase !== false;
  const useTabs = options.useTabs === true;
  const indentSize = options.indentSize ?? 2;
  const unit = useTabs ? "\t" : " ".repeat(indentSize);

  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const indented = applyBlockIndent(rawLines, unit, uppercase);
  const spaced = applyBlankLineRules(indented, {
    blankAfterIf: options.blankAfterIf !== false,
    blankBeforeElseEndIf: options.blankBeforeElseEndIf !== false,
    blankBeforeBlock: options.blankBeforeBlock !== false,
    blankAfterBlock: options.blankAfterBlock !== false,
    keepEndClosersTogether: options.keepEndClosersTogether !== false,
  });
  const cleaned = collapseExtraBlankLines(spaced);

  return cleaned.join("\n").replace(/\s+$/, "") + "\n";
}

function applyBlockIndent(
  lines: string[],
  unit: string,
  uppercase: boolean,
): string[] {
  const out: string[] = [];
  let nest = 0;
  let pendingThen = false;
  let prevCode = "";
  const parenStack: number[] = [];
  let andOrBase: number | null = null;
  const andOrStack: (number | null)[] = [];

  const pushParen = (contentDepth: number) => {
    andOrStack.push(andOrBase);
    andOrBase = null;
    parenStack.push(contentDepth);
  };

  const popParen = () => {
    if (parenStack.length) parenStack.pop();
    andOrBase = andOrStack.length ? andOrStack.pop()! : null;
  };

  const applyParens = (line: string, lineDepth: number) => {
    const plain = stripStrings(line);
    for (let i = 0; i < plain.length; i++) {
      const ch = plain[i];
      if (ch === "(") pushParen(lineDepth + 1);
      else if (ch === ")" && parenStack.length) popParen();
    }
  };

  for (const original of lines) {
    const trimmed = original.trim();

    if (!trimmed) {
      out.push("");
      continue;
    }

    const line = isCommentOnly(trimmed)
      ? trimmed
      : uppercase
        ? uppercaseKeywords(normalizeWhitespace(trimmed))
        : normalizeWhitespace(trimmed);

    const closers = countClosers(line);
    const elseLine = isElseLine(line);
    const elseIfLine = isElseIfLine(line);

    let lineNest = nest;
    if (elseLine || elseIfLine) {
      lineNest = Math.max(0, nest - 1);
      parenStack.length = 0;
      andOrStack.length = 0;
      andOrBase = null;
    } else if (closers > 0) {
      lineNest = Math.max(0, nest - closers);
      parenStack.length = 0;
      andOrStack.length = 0;
      andOrBase = null;
    }

    const depth = depthForLine(line, {
      parenStack,
      prevCode,
      andOrBase,
      baseDepth: lineNest,
      isBlock: isBlockKeywordLine(line) || isCommentOnly(line),
    });

    out.push(unit.repeat(depth) + line);

    if (!(elseLine || elseIfLine)) {
      nest = Math.max(0, nest - closers);
    }

    const openers = countOpeners(line);
    if (openers.main) nest += 1;
    if (openers.function) nest += 1;
    if (openers.ifThen) {
      nest += 1;
      pendingThen = false;
    } else if (openers.ifOnly) {
      pendingThen = true;
    } else if (pendingThen && /\bTHEN\b/i.test(line)) {
      nest += 1;
      pendingThen = false;
    }
    if (openers.forLoop) nest += 1;
    if (openers.foreach) nest += 1;
    if (openers.whileDo) nest += 1;

    if (!isCommentOnly(line) && !isBlockKeywordLine(line)) {
      applyParens(line, depth);
    }

    if (/^(WHERE|HAVING)\b/i.test(line) || (/^ON\b/i.test(line) && !/^ON\s+EXCEPTION\b/i.test(line))) {
      andOrBase = depth + 1;
    } else if (parenStack.length === 0 && !EXTRA_CONTINUATION_RE.test(line) && !CLAUSE_RE.test(line)) {
      if (!/,\s*$/.test(line)) {
        andOrBase = null;
        andOrStack.length = 0;
      }
    }

    if (!isCommentOnly(line)) prevCode = line;
  }

  return out;
}

function depthForLine(
  line: string,
  ctx: {
    parenStack: number[];
    prevCode: string;
    andOrBase: number | null;
    baseDepth: number;
    isBlock?: boolean;
  },
): number {
  const { parenStack, prevCode, andOrBase, baseDepth, isBlock } = ctx;

  if (isBlock) return baseDepth;

  if (/^\)/.test(line) && parenStack.length > 0) {
    return parenStack[parenStack.length - 1]!;
  }

  if (EXTRA_CONTINUATION_RE.test(line)) {
    const parenTop = parenStack.length > 0 ? parenStack[parenStack.length - 1]! : 0;
    if (andOrBase !== null) return Math.max(andOrBase, parenTop);
    if (parenStack.length > 0) return parenTop;
    return baseDepth + 1;
  }

  let clauseExtra = 0;
  if (CLAUSE_RE.test(line)) {
    clauseExtra = 1;
  } else if (prevCode && /,\s*$/.test(prevCode) && parenStack.length === 0) {
    clauseExtra = 1;
  } else if (
    prevCode &&
    !/;\s*$/.test(prevCode) &&
    parenStack.length === 0 &&
    !isBlockKeywordLine(prevCode) &&
    !/^DEFINE\b/i.test(prevCode)
  ) {
    // continuation of DISPLAY / CALL args across lines
    if (/^(DISPLAY|CALL|LET|EXECUTE)\b/i.test(prevCode) || /,\s*$/.test(prevCode)) {
      clauseExtra = 1;
    }
  }

  if (parenStack.length > 0) {
    return parenStack[parenStack.length - 1]! + clauseExtra;
  }

  // DEFINE multi-line: name TYPE, \n name TYPE
  if (
    prevCode &&
    /^DEFINE\b/i.test(prevCode) === false &&
    /,\s*$/.test(prevCode) &&
    /^[A-Za-z_]/.test(line)
  ) {
    return baseDepth + 1;
  }
  if (prevCode && /^DEFINE\b/i.test(prevCode) && /,\s*$/.test(prevCode)) {
    return baseDepth + 1;
  }

  return baseDepth + clauseExtra;
}

function countOpeners(line: string): OpenerFlags {
  const result: OpenerFlags = {
    main: false,
    function: false,
    ifThen: false,
    ifOnly: false,
    forLoop: false,
    foreach: false,
    whileDo: false,
  };

  if (/^END\s+(IF|FOR|FOREACH|WHILE|MAIN|FUNCTION)\b/i.test(line)) {
    return result;
  }

  if (/^MAIN\b/i.test(line)) {
    result.main = true;
    return result;
  }

  if (/^FUNCTION\b/i.test(line)) {
    result.function = true;
    return result;
  }

  if (/^FOREACH\b/i.test(line)) {
    result.foreach = true;
    return result;
  }

  if (/^FOR\b/i.test(line)) result.forLoop = true;
  if (/^WHILE\b/i.test(line)) result.whileDo = true;

  if (/^IF\b/i.test(line)) {
    const hasThen = /\bTHEN\b/i.test(line);
    const hasEndIf = /\bEND\s+IF\b/i.test(line);
    if (hasThen && !hasEndIf) result.ifThen = true;
    else if (!hasThen && !hasEndIf) result.ifOnly = true;
  }

  return result;
}

function countClosers(line: string): number {
  let n = 0;
  if (/^END\s+IF\b/i.test(line)) n += 1;
  if (/^END\s+FOR\b/i.test(line)) n += 1;
  if (/^END\s+FOREACH\b/i.test(line)) n += 1;
  if (/^END\s+WHILE\b/i.test(line)) n += 1;
  if (/^END\s+MAIN\b/i.test(line)) n += 1;
  if (/^END\s+FUNCTION\b/i.test(line)) n += 1;
  return n;
}

function isElseLine(line: string): boolean {
  return /^ELSE\b/i.test(line) && !/^ELSE\s+IF\b/i.test(line);
}

function isElseIfLine(line: string): boolean {
  return /^ELSE\s+IF\b/i.test(line) || /^ELIF\b/i.test(line);
}

function isBlockKeywordLine(line: string): boolean {
  return /^(DATABASE|MAIN|FUNCTION|END|IF|ELSE|FOR|FOREACH|WHILE|DEFINE|LET|CALL|DISPLAY|RUN|EXIT|WHENEVER|EXECUTE|BEGIN|COMMIT|ROLLBACK|SET|RETURN)\b/i.test(
    line,
  );
}

function isBlockOpener(trimmed: string): boolean {
  return (
    /^MAIN\b/i.test(trimmed) ||
    /^FUNCTION\b/i.test(trimmed) ||
    (/^IF\b/i.test(trimmed) &&
      /\bTHEN\b/i.test(trimmed) &&
      !/\bEND\s+IF\b/i.test(trimmed))
  );
}

function isBlockCloser(trimmed: string): boolean {
  return /^END\s+(IF|FOR|FOREACH|WHILE|MAIN|FUNCTION)\b/i.test(trimmed);
}

function isBlockCloserOrElse(trimmed: string): boolean {
  return isBlockCloser(trimmed) || /^(ELSE|ELIF)\b/i.test(trimmed);
}

function isCommentOnly(line: string): boolean {
  return line.charCodeAt(0) === 45 && line.charCodeAt(1) === 45;
}

function stripStrings(line: string): string {
  return line.replace(STRING_RE, '""');
}

function normalizeWhitespace(line: string): string {
  if (isCommentOnly(line)) return line;

  let inSingle = false;
  let inDouble = false;
  let commentAt = -1;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    const prev = i > 0 ? line[i - 1]! : "";

    if (!inDouble && ch === "'" && prev !== "\\") inSingle = !inSingle;
    else if (!inSingle && ch === '"' && prev !== "\\") inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === "-" && line[i + 1] === "-") {
      commentAt = i;
      break;
    }
  }

  const code = (commentAt >= 0 ? line.slice(0, commentAt) : line).trimEnd();
  const comment = commentAt >= 0 ? line.slice(commentAt).trimEnd() : "";

  const strings: string[] = [];
  const protectedCode = code.replace(STRING_RE, (m) => {
    strings.push(m);
    return `__STR${strings.length - 1}__`;
  });
  const collapsed = protectedCode.replace(/\s+/g, " ").trim();
  const restored = collapsed.replace(
    /__STR(\d+)__/g,
    (_, i: string) => strings[Number(i)]!,
  );

  return comment ? `${restored} ${comment}` : restored;
}

function uppercaseKeywords(line: string): string {
  if (isCommentOnly(line)) return line;

  const strings: string[] = [];
  const protectedLine = line.replace(STRING_RE, (m) => {
    strings.push(m);
    return `__STR${strings.length - 1}__`;
  });
  const uppered = protectedLine.replace(KEYWORD_RE, (m) => m.toUpperCase());
  return uppered.replace(/__STR(\d+)__/g, (_, i: string) => strings[Number(i)]!);
}

function applyBlankLineRules(
  lines: string[],
  options: Required<
    Pick<
      Format4glOptions,
      | "blankAfterIf"
      | "blankBeforeElseEndIf"
      | "blankBeforeBlock"
      | "blankAfterBlock"
      | "keepEndClosersTogether"
    >
  >,
): string[] {
  const {
    blankAfterIf,
    blankBeforeElseEndIf,
    blankBeforeBlock,
    blankAfterBlock,
    keepEndClosersTogether,
  } = options;
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (
      blankBeforeElseEndIf &&
      (isElseLine(trimmed) ||
        isElseIfLine(trimmed) ||
        /^END\s+IF\b/i.test(trimmed))
    ) {
      maybeBlankBefore(out, trimmed, keepEndClosersTogether);
    }

    if (
      blankBeforeBlock &&
      (/^MAIN\b/i.test(trimmed) ||
        /^FUNCTION\b/i.test(trimmed) ||
        /^END\s+(MAIN|FUNCTION)\b/i.test(trimmed))
    ) {
      maybeBlankBefore(out, trimmed, keepEndClosersTogether);
    }

    out.push(line);
    if (isCommentOnly(trimmed)) continue;

    let wantBlank = false;
    const next = nextMeaningfulSkippingComments(lines, i + 1);

    if (blankAfterIf && next) {
      const isIfThen =
        /^IF\b/i.test(trimmed) &&
        /\bTHEN\b/i.test(trimmed) &&
        !/\bEND\s+IF\b/i.test(trimmed);
      const isElse = isElseLine(trimmed) || isElseIfLine(trimmed);

      if (isIfThen || isElse) {
        wantBlank = true;
      } else if (
        isBlockCloser(trimmed) &&
        !/^END\s+(MAIN|FUNCTION)\b/i.test(trimmed)
      ) {
        if (keepEndClosersTogether && isBlockCloser(next.trimmed)) {
          // glued
        } else if (!isBlockCloserOrElse(next.trimmed)) {
          wantBlank = true;
        }
      }
    }

    if (blankAfterBlock && next) {
      if (isBlockOpener(trimmed) && (/^MAIN\b/i.test(trimmed) || /^FUNCTION\b/i.test(trimmed))) {
        wantBlank = true;
      } else if (/^END\s+(MAIN|FUNCTION)\b/i.test(trimmed)) {
        if (keepEndClosersTogether && isBlockCloser(next.trimmed)) {
          // glued
        } else if (!isBlockCloserOrElse(next.trimmed)) {
          wantBlank = true;
        }
      }
    }

    // blank after DEFINE block (last DEFINE line before a non-define stmt)
    if (next && isDefineRelated(trimmed) && !isDefineRelated(next.trimmed)) {
      if (!isBlockCloserOrElse(next.trimmed)) wantBlank = true;
    }

    if (wantBlank) out.push("");
  }

  return out;
}

const TYPE_WORD_RE =
  /^(CHAR|VARCHAR|LVARCHAR|NCHAR|NVARCHAR|INTEGER|INT|SMALLINT|SERIAL|BIGINT|DECIMAL|NUMERIC|MONEY|FLOAT|SMALLFLOAT|DATE|DATETIME|INTERVAL|BYTE|TEXT|BOOLEAN|BLOB|CLOB)\b/i;

function isDefineRelated(trimmed: string): boolean {
  if (/^DEFINE\b/i.test(trimmed)) return true;
  // continuation: name TYPE[(...)] [,]
  const m = trimmed.match(/^([A-Za-z_][\w@$#]*)\s+(\w+)/);
  if (!m) return false;
  return TYPE_WORD_RE.test(m[2]!);
}

function maybeBlankBefore(
  out: string[],
  trimmed: string,
  keepEndClosersTogether: boolean,
): void {
  const prev = lastNonBlankTrimmed(out);
  const gluedClosers =
    keepEndClosersTogether &&
    isBlockCloser(trimmed) &&
    prev !== null &&
    isBlockCloser(prev);

  if (!gluedClosers && out.length && out[out.length - 1]!.trim() !== "") {
    out.push("");
  }
}

function nextMeaningfulSkippingComments(
  lines: string[],
  from: number,
): { index: number; trimmed: string; line: string } | null {
  for (let i = from; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!trimmed || isCommentOnly(trimmed)) continue;
    return { index: i, trimmed, line: lines[i]! };
  }
  return null;
}

function lastNonBlankTrimmed(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i]!.trim();
    if (t) return t;
  }
  return null;
}

function collapseExtraBlankLines(lines: string[]): string[] {
  const out: string[] = [];
  let blankRun = 0;

  for (const line of lines) {
    if (!line.trim()) {
      blankRun += 1;
      if (blankRun <= 1) out.push("");
      continue;
    }
    blankRun = 0;
    out.push(line);
  }

  return out;
}

// ponytail: assert-based self-check; run with `bun src/formatter-4gl.ts`
if (import.meta.main) {
  const sample = `DATABASE recaudaciones
MAIN
DEFINE lc_cuenta INTEGER,
ln_cuit DECIMAL(11,0)
IF num_args() < 2 THEN
DISPLAY "uso"
EXIT PROGRAM 1
END IF
CALL ff_baja_cuenta(lc_cuenta, ln_cuit)
END MAIN
FUNCTION ff_baja_cuenta(pc_cuenta, pn_cuit)
DEFINE pc_cuenta INTEGER
IF STATUS < 0 THEN
EXIT PROGRAM 1
END IF
END FUNCTION
`;
  const out = formatInformix4gl(sample);
  if (!/^DATABASE /m.test(out)) throw new Error("DATABASE missing");
  if (!/\nMAIN\n/.test(out) && !/\nMAIN\n\n/.test(out)) {
    // MAIN may have blank after
  }
  if (!/^\s{2}DEFINE /m.test(out)) throw new Error(`DEFINE not indented:\n${out}`);
  if (!/^\s{4}DISPLAY /m.test(out) && !/^\s{2}IF /m.test(out)) {
    throw new Error(`IF body indent fail:\n${out}`);
  }
  if (!/\nFUNCTION ff_baja_cuenta/m.test(out)) throw new Error("FUNCTION missing");
  const again = formatInformix4gl(out);
  if (again !== out) throw new Error("not idempotent");
  console.log(out);
  console.log("ok");
}
