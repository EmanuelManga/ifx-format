/** Options for Informix SPL formatting. */
export type FormatOptions = {
  uppercase?: boolean;
  indentSize?: number;
  useTabs?: boolean;
  blankAfterQuery?: boolean;
  blankAfterIf?: boolean;
  blankAfterReturning?: boolean;
  blankBeforeElseEndIf?: boolean;
  keepEndClosersTogether?: boolean;
  /** Space before `(` in CREATE [TEMP] TABLE name ( */
  spaceBeforeCreateTableParen?: boolean;
  /** Group consecutive DROP TABLE; blank line above/below the group */
  blankAroundDropTable?: boolean;
  /** Blank line after CREATE [TEMP] TABLE ...; */
  blankAfterCreateTable?: boolean;
};

const KEYWORDS = [
  "DROP",
  "PROCEDURE",
  "IF",
  "EXISTS",
  "CREATE",
  "TEMP",
  "TEMPORARY",
  "SCRATCH",
  "TABLE",
  "ALTER",
  "INDEX",
  "UNIQUE",
  "CONSTRAINT",
  "FOREIGN",
  "PRIMARY",
  "KEY",
  "REFERENCES",
  "CHECK",
  "ADD",
  "COLUMN",
  "RETURNING",
  "AS",
  "DEFINE",
  "GLOBAL",
  "DEFAULT",
  "LET",
  "CALL",
  "SELECT",
  "INTO",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "IN",
  "BETWEEN",
  "IS",
  "NULL",
  "THEN",
  "ELSE",
  "END",
  "FOR",
  "FOREACH",
  "WHILE",
  "DO",
  "TO",
  "STEP",
  "CONTINUE",
  "EXIT",
  "RETURN",
  "INSERT",
  "UPDATE",
  "DELETE",
  "VALUES",
  "SET",
  "COUNT",
  "MONTH",
  "YEAR",
  "DAY",
  "HOUR",
  "MINUTE",
  "SECOND",
  "FRACTION",
  "DATETIME",
  "INTERVAL",
  "INTEGER",
  "SMALLINT",
  "BIGINT",
  "SERIAL",
  "SERIAL8",
  "INT",
  "DECIMAL",
  "NUMERIC",
  "MONEY",
  "FLOAT",
  "CHAR",
  "VARCHAR",
  "LVARCHAR",
  "NCHAR",
  "NVARCHAR",
  "DATE",
  "TODAY",
  "CURRENT",
  "COALESCE",
  "NVL",
  "MAX",
  "MIN",
  "SUM",
  "AVG",
  "BEGIN",
  "WORK",
  "COMMIT",
  "ROLLBACK",
  "WITH",
  "HOLD",
  "NO",
  "LOG",
] as const;

const KEYWORD_RE = new RegExp(`\\b(${KEYWORDS.join("|")})\\b`, "gi");
const CLAUSE_RE =
  /^(INTO|FROM|WHERE|VALUES|SET|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|GROUP|ORDER|HAVING|ON|WHEN|RETURNING|ADD|CONSTRAINT|FOREIGN|REFERENCES|PRIMARY)\b/i;
const EXTRA_CONTINUATION_RE = /^(AND|OR|,)/i;
const STRING_RE = /(["'])(?:\\.|(?!\1).)*\1/g;
const TOP_LEVEL_STARTER_RE =
  /^(CREATE|DROP|ALTER|SELECT|INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|TRUNCATE|LOCK)\b/i;

type StatementKind = "DEFINE" | "LET" | "DROP_TABLE" | "OTHER";

type OpenerFlags = {
  ifThen: boolean;
  ifOnly: boolean;
  forLoop: boolean;
  foreach: boolean;
  whileDo: boolean;
};

export function formatInformixSpl(
  text: string,
  options: FormatOptions = {},
): string {
  const uppercase = options.uppercase !== false;
  const useTabs = options.useTabs === true;
  const indentSize = options.indentSize ?? 2;
  const unit = useTabs ? "\t" : " ".repeat(indentSize);
  const spaceBeforeCreateTableParen =
    options.spaceBeforeCreateTableParen !== false;

  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const indented = applyBlockIndent(
    rawLines,
    unit,
    uppercase,
    spaceBeforeCreateTableParen,
  );
  const spaced = applyBlankLineRules(indented, {
    blankAfterQuery: options.blankAfterQuery !== false,
    blankAfterIf: options.blankAfterIf !== false,
    blankAfterReturning: options.blankAfterReturning !== false,
    blankBeforeElseEndIf: options.blankBeforeElseEndIf !== false,
    keepEndClosersTogether: options.keepEndClosersTogether !== false,
    blankAroundDropTable: options.blankAroundDropTable !== false,
    blankAfterCreateTable: options.blankAfterCreateTable !== false,
  });
  const cleaned = collapseExtraBlankLines(spaced);

  return cleaned.join("\n").replace(/\s+$/, "") + "\n";
}

function applyBlockIndent(
  lines: string[],
  unit: string,
  uppercase: boolean,
  spaceBeforeCreateTableParen: boolean,
): string[] {
  const out: string[] = [];
  let nest = 0;
  /** 0 = outside, 1 = CREATE header, 2 = procedure body */
  let region = 0;
  let pendingThen = false;
  let prevCode = "";
  const parenStack: number[] = [];
  /** Preferred depth for AND/OR hanging under WHERE/HAVING/ON */
  let andOrBase: number | null = null;
  /** Saved andOrBase for each open paren level */
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
      if (ch === "(") {
        pushParen(lineDepth + 1);
      } else if (ch === ")" && parenStack.length) {
        popParen();
      }
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
      : (() => {
          let s = normalizeWhitespace(trimmed);
          if (spaceBeforeCreateTableParen) {
            s = ensureSpaceBeforeCreateTableParen(s);
          }
          return uppercase ? uppercaseKeywords(s) : s;
        })();

    if (/^DROP\s+PROCEDURE\b/i.test(line)) {
      region = 0;
      nest = 0;
      pendingThen = false;
      prevCode = "";
      parenStack.length = 0;
      andOrStack.length = 0;
      andOrBase = null;
      out.push(line);
      continue;
    }

    if (/^CREATE\s+PROCEDURE\b/i.test(line)) {
      region = 1;
      nest = 0;
      pendingThen = false;
      prevCode = line;
      parenStack.length = 0;
      andOrStack.length = 0;
      andOrBase = null;
      out.push(line);
      continue;
    }

    if (/^END\s+PROCEDURE\b/i.test(line)) {
      region = 0;
      nest = 0;
      pendingThen = false;
      prevCode = "";
      parenStack.length = 0;
      andOrStack.length = 0;
      andOrBase = null;
      out.push(line);
      continue;
    }

    if (region === 1) {
      if (isProcedureBodyStart(line)) {
        region = 2;
      } else {
        out.push(unit + line);
        prevCode = line;
        if (/RETURNING\b/i.test(line) && /;\s*$/.test(line)) {
          region = 2;
        }
        continue;
      }
    }

    if (region !== 2) {
      // Top-level DDL / SQL (CREATE TABLE, ALTER, INDEX, bare queries, …)
      if (isCommentOnly(line)) {
        out.push(line);
        continue;
      }

      // Nested SELECT/INSERT/... must keep paren context (subqueries)
      const starter =
        TOP_LEVEL_STARTER_RE.test(line) && parenStack.length === 0;
      if (starter) {
        parenStack.length = 0;
        andOrStack.length = 0;
        andOrBase = null;
      }

      const depth = depthForSqlLine(line, {
        starter,
        parenStack,
        prevCode,
        andOrBase,
        baseDepth: 0,
      });

      out.push(unit.repeat(depth) + line);
      if (/^(WHERE|HAVING|ON)\b/i.test(line)) {
        andOrBase = depth + 1;
      }
      applyParens(line, depth);
      if (/;\s*$/.test(line) && parenStack.length === 0) {
        andOrBase = null;
        andOrStack.length = 0;
      }
      prevCode = line;
      continue;
    }

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

    const depth = depthForSqlLine(line, {
      starter: false,
      parenStack,
      prevCode,
      andOrBase,
      baseDepth: 1 + lineNest,
      isBlock: isBlockKeywordLine(line) || isCommentOnly(line),
    });

    out.push(unit.repeat(depth) + line);

    if (!(elseLine || elseIfLine)) {
      nest = Math.max(0, nest - closers);
    }

    const openers = countOpeners(line);
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

    if (/^(WHERE|HAVING|ON)\b/i.test(line)) {
      andOrBase = depth + 1;
    } else if (/;\s*$/.test(line) && parenStack.length === 0) {
      andOrBase = null;
      andOrStack.length = 0;
    }

    if (!isCommentOnly(line)) {
      prevCode = line;
    }
  }

  return out;
}

function depthForSqlLine(
  line: string,
  ctx: {
    starter: boolean;
    parenStack: number[];
    prevCode: string;
    andOrBase: number | null;
    baseDepth: number;
    isBlock?: boolean;
  },
): number {
  const { starter, parenStack, prevCode, andOrBase, baseDepth, isBlock } = ctx;

  if (isBlock) {
    return baseDepth;
  }

  if (/^\)/.test(line) && parenStack.length > 0) {
    return parenStack[parenStack.length - 1]!;
  }

  if (EXTRA_CONTINUATION_RE.test(line)) {
    const parenTop = parenStack.length > 0 ? parenStack[parenStack.length - 1]! : 0;
    if (andOrBase !== null) {
      return Math.max(andOrBase, parenTop);
    }
    if (parenStack.length > 0) {
      return parenTop;
    }
    return baseDepth + 2;
  }

  let clauseExtra = 0;
  if (!starter) {
    if (CLAUSE_RE.test(line)) {
      clauseExtra = 1;
    } else if (prevCode && /,\s*$/.test(prevCode) && parenStack.length === 0) {
      clauseExtra = 1;
    } else if (
      prevCode &&
      !/;\s*$/.test(prevCode) &&
      parenStack.length === 0
    ) {
      clauseExtra = 1;
    } else if (
      prevCode &&
      /[,(]\s*$/.test(prevCode) &&
      parenStack.length === 0
    ) {
      clauseExtra = 1;
    }
  }

  if (parenStack.length > 0) {
    return parenStack[parenStack.length - 1]! + clauseExtra;
  }

  if (starter) return baseDepth;

  if (clauseExtra === 0 && prevCode && /[,(]\s*$/.test(prevCode)) {
    return baseDepth + 1;
  }

  return baseDepth + clauseExtra;
}

function stripStrings(line: string): string {
  return line.replace(STRING_RE, '""');
}

function isProcedureBodyStart(line: string): boolean {
  if (isCommentOnly(line)) return true;
  return /^(DEFINE|LET|CALL|SELECT|INSERT|UPDATE|DELETE|RETURN|IF|FOR|FOREACH|WHILE|BEGIN)\b/i.test(
    line,
  );
}

function countOpeners(line: string): OpenerFlags {
  const result: OpenerFlags = {
    ifThen: false,
    ifOnly: false,
    forLoop: false,
    foreach: false,
    whileDo: false,
  };

  if (/^END\s+(IF|FOR|FOREACH|WHILE|PROCEDURE)\b/i.test(line)) {
    return result;
  }

  if (/^FOREACH\b/i.test(line)) {
    result.foreach = true;
    return result;
  }

  if (/^FOR\b/i.test(line)) {
    result.forLoop = true;
  }

  if (/^WHILE\b/i.test(line)) {
    result.whileDo = true;
  }

  if (/^IF\b/i.test(line)) {
    const hasThen = /\bTHEN\b/i.test(line);
    const hasEndIf = /\bEND\s+IF\b/i.test(line);
    if (hasThen && !hasEndIf) {
      result.ifThen = true;
    } else if (!hasThen && !hasEndIf) {
      result.ifOnly = true;
    }
  }

  return result;
}

function countClosers(line: string): number {
  let n = 0;
  if (/^END\s+IF\b/i.test(line)) n += 1;
  if (/^END\s+FOR\b/i.test(line)) n += 1;
  if (/^END\s+FOREACH\b/i.test(line)) n += 1;
  if (/^END\s+WHILE\b/i.test(line)) n += 1;
  return n;
}

function isElseLine(line: string): boolean {
  return /^ELSE\b/i.test(line) && !/^ELSE\s+IF\b/i.test(line);
}

function isElseIfLine(line: string): boolean {
  return /^ELSE\s+IF\b/i.test(line) || /^ELIF\b/i.test(line);
}

function isBlockKeywordLine(line: string): boolean {
  return /^(IF|ELSE|END|FOR|FOREACH|WHILE|DEFINE|LET|CALL|RETURN|CONTINUE|EXIT|CREATE|DROP|BEGIN|COMMIT|ROLLBACK)\b/i.test(
    line,
  );
}

function isCommentOnly(line: string): boolean {
  return line.charCodeAt(0) === 45 && line.charCodeAt(1) === 45; // --
}

/** Collapse runs of whitespace outside strings; keep trailing `--` comments. */
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

/** `CREATE [TEMP|TEMPORARY|SCRATCH] TABLE name(` → `... name (` */
function ensureSpaceBeforeCreateTableParen(line: string): string {
  return line.replace(
    /^(CREATE\s+(?:(?:TEMP(?:ORARY)?|SCRATCH)\s+)?TABLE\s+[A-Za-z_][\w@$#]*)\s*\(/i,
    "$1 (",
  );
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
      FormatOptions,
      | "blankAfterQuery"
      | "blankAfterIf"
      | "blankAfterReturning"
      | "blankBeforeElseEndIf"
      | "keepEndClosersTogether"
      | "blankAroundDropTable"
      | "blankAfterCreateTable"
    >
  >,
): string[] {
  const {
    blankAfterQuery,
    blankAfterIf,
    blankAfterReturning,
    blankBeforeElseEndIf,
    keepEndClosersTogether,
    blankAroundDropTable,
    blankAfterCreateTable,
  } = options;
  const out: string[] = [];
  let inQuery = false;
  let inCreateTable = false;

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

    if (blankAroundDropTable && isDropTable(trimmed)) {
      const prev = lastNonBlankTrimmed(out);
      if (
        prev &&
        !isDropTable(prev) &&
        out.length &&
        out[out.length - 1]!.trim() !== ""
      ) {
        out.push("");
      }
    }

    out.push(line);

    if (isCommentOnly(trimmed)) continue;

    if (/^(SELECT|INSERT|UPDATE|DELETE)\b/i.test(trimmed)) {
      inQuery = true;
    }

    if (isCreateTable(trimmed)) {
      inCreateTable = true;
    }

    let wantBlank = false;
    const next = nextMeaningfulSkippingComments(lines, i + 1);

    const kind = statementKind(trimmed);
    if (kind === "DEFINE" || kind === "LET") {
      if (
        next &&
        statementKind(next.trimmed) !== kind &&
        !isBlockCloserOrElse(next.trimmed)
      ) {
        wantBlank = true;
      }
    }

    if (blankAroundDropTable && kind === "DROP_TABLE") {
      if (next && statementKind(next.trimmed) !== "DROP_TABLE") {
        wantBlank = true;
      }
    }

    if (
      blankAfterReturning &&
      next &&
      /;\s*$/.test(trimmed) &&
      /^DEFINE\b/i.test(next.trimmed) &&
      !/^DEFINE\b/i.test(trimmed)
    ) {
      wantBlank = true;
    }

    if (inQuery && /;\s*$/.test(trimmed)) {
      inQuery = false;
      if (blankAfterQuery && next && !isBlockCloserOrElse(next.trimmed)) {
        wantBlank = true;
      }
    }

    if (inCreateTable && /;\s*$/.test(trimmed)) {
      inCreateTable = false;
      if (
        blankAfterCreateTable &&
        next &&
        !isCreateTable(next.trimmed)
      ) {
        wantBlank = true;
      }
    }

    if (blankAfterIf && next) {
      const isIfThen =
        /^IF\b/i.test(trimmed) &&
        /\bTHEN\b/i.test(trimmed) &&
        !/\bEND\s+IF\b/i.test(trimmed);
      const isElse = isElseLine(trimmed) || isElseIfLine(trimmed);

      if (isIfThen || isElse) {
        wantBlank = true;
      } else if (isBlockCloser(trimmed)) {
        if (keepEndClosersTogether && isBlockCloser(next.trimmed)) {
          // keep stacked closers glued (END IF / END FOR / END FOREACH / …)
        } else if (!isBlockCloserOrElse(next.trimmed)) {
          wantBlank = true;
        }
      }
    }

    if (wantBlank) out.push("");
  }

  return out;
}

function isCreateTable(trimmed: string): boolean {
  return /^CREATE\s+(?:(?:TEMP(?:ORARY)?|SCRATCH)\s+)?TABLE\b/i.test(trimmed);
}

function isDropTable(trimmed: string): boolean {
  return /^DROP\s+(?:(?:TEMP(?:ORARY)?|SCRATCH)\s+)?TABLE\b/i.test(trimmed);
}

function statementKind(trimmed: string): StatementKind {
  if (/^DEFINE\b/i.test(trimmed)) return "DEFINE";
  if (/^LET\b/i.test(trimmed)) return "LET";
  if (isDropTable(trimmed)) return "DROP_TABLE";
  return "OTHER";
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

function isBlockCloser(trimmed: string): boolean {
  return /^END\s+(IF|FOR|FOREACH|WHILE)\b/i.test(trimmed);
}

function isBlockCloserOrElse(trimmed: string): boolean {
  return isBlockCloser(trimmed) || /^(ELSE|ELIF)\b/i.test(trimmed);
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

  while (out.length && !out[0]!.trim()) out.shift();
  while (out.length && !out[out.length - 1]!.trim()) out.pop();
  return out;
}
