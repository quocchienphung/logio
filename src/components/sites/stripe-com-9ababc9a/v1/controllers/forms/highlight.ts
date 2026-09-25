// Syntax highlighting for the CodeEditor port. The reference highlights with Prism (loaded on demand) and
// the captured stylesheet colours Prism's token classes (`.CodeSyntax .token.keyword` …, already mapped to
// a grey ramp). This module re-implements Prism's tokenising model — grammar keys in order, `lookbehind`,
// `greedy` (a greedy match may swallow earlier non-greedy tokens) and `inside` — with grammars written for
// the languages the legacy pages use, so the editor emits the same `<span class="token …">` structure.

type Rule = {
  re: RegExp;
  lookbehind?: boolean;
  greedy?: boolean;
  alias?: string;
  inside?: Grammar;
};
type Grammar = [type: string, rules: Rule[]][];
type Tok = { type: string; alias?: string; content: Node[] };
type Node = string | Tok;

const r = (re: RegExp, o: Omit<Rule, "re"> = {}): Rule => ({ re, ...o });

function len(n: Node): number {
  return typeof n === "string" ? n.length : n.content.reduce((a, c) => a + len(c), 0);
}

const globalRe = new WeakMap<RegExp, RegExp>();
function execAt(rule: Rule, text: string, pos: number): RegExpExecArray | null {
  let re = globalRe.get(rule.re);
  if (!re) globalRe.set(rule.re, (re = new RegExp(rule.re.source, rule.re.flags.includes("g") ? rule.re.flags : rule.re.flags + "g")));
  re.lastIndex = pos;
  const m = re.exec(text);
  if (m && rule.lookbehind && m[1]) {
    const lb = m[1].length;
    m.index += lb;
    m[0] = m[0].slice(lb);
  }
  return m;
}

function makeTok(type: string, rule: Rule, text: string): Tok {
  return { type, alias: rule.alias, content: rule.inside ? tokenize(text, rule.inside) : [text] };
}

/** Apply one rule to `list` (in place), following Prism's matchGrammar semantics. */
function applyRule(list: Node[], text: string, type: string, rule: Rule, prefix: Grammar): void {
  let pos = 0;
  for (let i = 0; i < list.length; pos += len(list[i]), i++) {
    const node = list[i];
    if (typeof node !== "string") continue;
    if (rule.greedy) {
      const m = execAt(rule, text, pos);
      if (!m || m.index >= text.length || !m[0]) break;
      const from = m.index;
      const to = from + m[0].length;
      // node containing `from`
      let j = i;
      let p = pos;
      while (j < list.length && from >= p + len(list[j])) {
        p += len(list[j]);
        j++;
      }
      if (j >= list.length) break;
      if (typeof list[j] !== "string") {
        i = j;
        pos = p;
        continue;
      }
      // nodes affected by the match: every node up to `to`, plus trailing plain strands
      let k = j;
      let end = p;
      while (k < list.length && (end < to || typeof list[k] === "string")) {
        end += len(list[k]);
        k++;
      }
      const removed = k - j;
      const str = text.slice(p, end);
      const before = str.slice(0, from - p);
      const after = str.slice(to - p);
      const rep: Node[] = [];
      if (before) rep.push(before);
      rep.push(makeTok(type, rule, m[0]));
      let afterNodes: Node[] = after ? [after] : [];
      if (after && removed > 1 && prefix.length) afterNodes = tokenize(after, prefix); // Prism's "rematch"
      rep.push(...afterNodes);
      list.splice(j, removed, ...rep);
      i = j + (before ? 1 : 0);
      pos = p + before.length;
      continue;
    }
    const m = execAt(rule, node, 0);
    if (!m || !m[0]) continue;
    const before = node.slice(0, m.index);
    const after = node.slice(m.index + m[0].length);
    const rep: Node[] = [];
    if (before) rep.push(before);
    rep.push(makeTok(type, rule, m[0]));
    if (after) rep.push(after);
    list.splice(i, 1, ...rep);
    if (before) {
      pos += before.length;
      i++;
    }
  }
}

function tokenize(text: string, grammar: Grammar): Node[] {
  const list: Node[] = [text];
  grammar.forEach(([type, rules], gi) => {
    rules.forEach((rule, ri) => {
      const prefix: Grammar = [...grammar.slice(0, gi), [type, rules.slice(0, ri)]];
      applyRule(list, text, type, rule, prefix);
    });
  });
  return list;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
}

function render(nodes: Node[]): string {
  return nodes
    .map((n) =>
      typeof n === "string"
        ? escapeHtml(n)
        : `<span class="token ${n.type}${n.alias ? " " + n.alias : ""}">${render(n.content)}</span>`,
    )
    .join("");
}

// ---------------------------------------------------------------------------------------------------
// Grammars (token classes as in Prism 1.29; only the classes the stylesheet colours affect the look:
// comment, string, keyword, function, number, property, class-name, and tag/attr-* for markup).

const CLIKE_COMMENT = [r(/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/, { lookbehind: true, greedy: true }), r(/(^|[^\\:])\/\/.*/, { lookbehind: true, greedy: true })];
const QUOTED = r(/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/, { greedy: true });
const DOT_PUNCT: Grammar = [["punctuation", [r(/[.\\]/)]]];
const CLIKE_FUNCTION = r(/\b\w+(?=\()/);
const CLIKE_NUMBER = r(/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i);
const CLIKE_OPERATOR = r(/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/);
const PUNCT = r(/[{}[\];(),.:]/);

const ID = "[_$a-zA-Z\\xA0-\\uFFFF][$\\w\\xA0-\\uFFFF]*";
const JS_KEYWORDS =
  "as|assert(?=\\s*\\{)|async(?=\\s*(?:function\\b|\\(|[$\\w\\xA0-\\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\\s*(?:\\{|$))|for|from(?=\\s*(?:['\"]|$))|function|(?:get|set)(?=\\s*(?:[#\\[$\\w\\xA0-\\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield";

const javascript: Grammar = [
  ["comment", CLIKE_COMMENT],
  ["hashbang", [r(/^#!.*/, { greedy: true, alias: "comment" })]],
  ["template-string", [r(/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/, { greedy: true, inside: [["string", [r(/[\s\S]+/)]]] })]],
  ["string-property", [r(/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m, { lookbehind: true, greedy: true, alias: "property" })]],
  ["string", [QUOTED]],
  [
    "class-name",
    [
      r(/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/, { lookbehind: true, inside: DOT_PUNCT }),
      r(new RegExp(`(^|[^$\\w\\xA0-\\uFFFF])[_$A-Z\\xA0-\\uFFFF][$\\w\\xA0-\\uFFFF]*(?=\\.(?:constructor|prototype))`), { lookbehind: true }),
    ],
  ],
  ["function-variable", [r(new RegExp(`#?${ID}(?=\\s*[=:]\\s*(?:async\\s*)?(?:\\bfunction\\b|(?:\\((?:[^()]|\\([^()]*\\))*\\)|${ID})\\s*=>))`), { alias: "function" })]],
  ["constant", [r(/\b[A-Z](?:[A-Z_]|\dx?)*\b/)]],
  ["keyword", [r(/((?:^|\})\s*)catch\b/, { lookbehind: true }), r(new RegExp(`(^|[^.]|\\.\\.\\.\\s*)\\b(?:${JS_KEYWORDS})\\b`), { lookbehind: true })]],
  ["boolean", [r(/\b(?:false|true)\b/)]],
  ["function", [r(new RegExp(`#?${ID}(?=\\s*(?:\\.\\s*(?:apply|bind|call)\\s*)?\\()`))]],
  ["number", [r(/(^|[^\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?|\d+(?:_\d+)*n|(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?)(?![\w$])/, { lookbehind: true })]],
  ["literal-property", [r(new RegExp(`((?:^|[,{])[ \\t]*)${ID}(?=\\s*:)`, "m"), { lookbehind: true, alias: "property" })]],
  ["operator", [r(/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/)]],
  ["punctuation", [PUNCT]],
];

const json: Grammar = [
  ["property", [r(/(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/, { lookbehind: true, greedy: true })]],
  ["string", [r(/(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/, { lookbehind: true, greedy: true })]],
  ["comment", [r(/\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/, { greedy: true })]],
  ["number", [r(/-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i)]],
  ["punctuation", [r(/[{}[\],]/)]],
  ["operator", [r(/:/)]],
  ["boolean", [r(/\b(?:false|true)\b/)]],
  ["null", [r(/\bnull\b/, { alias: "keyword" })]],
];

const python: Grammar = [
  ["comment", [r(/(^|[^\\])#.*/, { lookbehind: true, greedy: true })]],
  ["triple-quoted-string", [r(/(?:[rub]|br|rb)?("""|''')[\s\S]*?\1/i, { greedy: true, alias: "string" })]],
  ["string", [r(/(?:[rubf]|br|rb|fr|rf)?(["'])(?:\\.|(?!\1)[^\\\r\n])*\1/i, { greedy: true })]],
  ["function", [r(/((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/, { lookbehind: true })]],
  ["class-name", [r(/(\bclass\s+)\w+/i, { lookbehind: true })]],
  ["decorator", [r(/(^[\t ]*)@\w+(?:\.\w+)*/m, { lookbehind: true, alias: "annotation punctuation" })]],
  ["keyword", [r(/\b(?:_(?=\s*:)|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/)]],
  ["builtin", [r(/\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/)]],
  ["boolean", [r(/\b(?:False|None|True)\b/)]],
  ["number", [r(/\b0(?:b(?:_?[01])+|o(?:_?[0-7])+|x(?:_?[a-f0-9])+)\b|(?:\b\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\B\.\d+(?:_\d+)*)(?:e[+-]?\d+(?:_\d+)*)?j?(?!\w)/i)]],
  ["operator", [r(/[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/)]],
  ["punctuation", [PUNCT]],
];

const ruby: Grammar = [
  ["comment", [r(/(^|[^\\])#.*/, { lookbehind: true, greedy: true }), r(/^=begin\s[\s\S]*?^=end/m, { greedy: true })]],
  ["string", [QUOTED]],
  [
    "class-name",
    [r(/(\b(?:class|module)\s+|\bcatch\s+\()[\w.\\]+|\b[A-Z_]\w*(?=\s*\.\s*new\b)/, { lookbehind: true, inside: DOT_PUNCT })],
  ],
  ["method-definition", [r(/(\bdef\s+)\w+(?:\s*\.\s*\w+)?/, { lookbehind: true, inside: [["function", [r(/\b\w+$/)]], ["punctuation", [r(/\./)]]] })]],
  ["symbol", [r(/(^|[^:]):[a-zA-Z_]\w*(?:[?!]|\b)/, { lookbehind: true, greedy: true }), r(/([\r\n{(,][ \t]*)[a-zA-Z_]\w*[?!]?(?=:(?!:))/, { lookbehind: true, greedy: true })]],
  ["keyword", [r(/\b(?:BEGIN|END|alias|and|begin|break|case|class|def|define_method|defined|do|each|else|elsif|end|ensure|extend|for|if|in|include|module|new|next|nil|not|or|prepend|private|protected|public|raise|redo|require|rescue|retry|return|self|super|then|throw|undef|unless|until|when|while|yield)\b/)]],
  ["variable", [r(/[@$]+[a-zA-Z_]\w*(?:[?!]|\b)/)]],
  ["boolean", [r(/\b(?:false|true)\b/)]],
  ["function", [CLIKE_FUNCTION]],
  ["constant", [r(/\b[A-Z][A-Z0-9_]*(?:[?!]|\b)/)]],
  ["number", [CLIKE_NUMBER]],
  ["double-colon", [r(/::/, { alias: "punctuation" })]],
  ["operator", [r(/\.{2,3}|&\.|===|<?=>|[!=]?~|(?:&&|\|\||<<|>>|\*\*|[+\-*/%<>!^&|=])=?|[?:]/)]],
  ["punctuation", [r(/[(){}[\].,;]/)]],
];

const go: Grammar = [
  ["comment", CLIKE_COMMENT],
  ["char", [r(/'(?:\\.|[^'\\\r\n]){0,10}'/, { greedy: true })]],
  ["string", [r(/(^|[^\\])"(?:\\.|[^"\\\r\n])*"|`[^`]*`/, { lookbehind: true, greedy: true })]],
  ["keyword", [r(/\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(?:to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/)]],
  ["boolean", [r(/\b(?:_|false|iota|nil|true)\b/)]],
  ["function", [CLIKE_FUNCTION]],
  ["number", [r(/\b0(?:b[01_]+|o[0-7_]+)i?\b|\b0x(?:[a-f\d_]+(?:\.[a-f\d_]*)?|\.[a-f\d_]+)(?:p[+-]?\d+(?:_\d+)*)?i?(?!\w)|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?[\d_]+)?i?(?!\w)/i)]],
  ["operator", [r(/[*/%^!=]=?|\+[=+]?|-[=-]?|\|[=|]?|&(?:=|&|\^=?)?|>(?:>=?|=)?|<(?:<=?|=|-)?|:=|\.\.\./)]],
  ["punctuation", [PUNCT]],
  ["builtin", [r(/\b(?:append|bool|byte|cap|close|complex|complex(?:64|128)|copy|delete|error|float(?:32|64)|u?int(?:8|16|32|64)?|imag|len|make|new|panic|print(?:ln)?|real|recover|rune|string|uintptr)\b/)]],
];

const PHP_FQ = r(/(?:\\?\b[a-z_]\w*)+/i, { inside: [["punctuation", [r(/\\/)]]] });
const php: Grammar = [
  ["delimiter", [r(/\?>$|^<\?(?:php(?=\s)|=)?/i, { alias: "important" })]],
  ["comment", [r(/\/\*[\s\S]*?\*\/|\/\/.*|#(?!\[).*/)]],
  [
    "string",
    [
      r(/`(?:\\[\s\S]|[^\\`])*`/, { greedy: true, alias: "backtick-quoted-string" }),
      r(/'(?:\\[\s\S]|[^\\'])*'/, { greedy: true, alias: "single-quoted-string" }),
      r(/"(?:\\[\s\S]|[^\\"])*"/, { greedy: true, alias: "double-quoted-string" }),
    ],
  ],
  ["variable", [r(/\$+(?:\w+\b|(?=\{))/)]],
  ["keyword", [r(/((?:^|[^\s>:]|(?:^|[^-])>|(?:^|[^:]):)\s*)\b(?:abstract|and|array|as|break|callable|case|catch|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|never|new|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|try|unset|use|var|while|xor|yield)\b/i, { lookbehind: true })]],
  [
    "class-name",
    [
      r(/(\b(?:extends|implements|instanceof|new(?!\s+self\b|\s+static\b))\s+|\bcatch\s*\()(?:\\?\b[a-z_]\w*)+\b(?!\\)/i, { lookbehind: true, greedy: true, alias: "class-name-fully-qualified", inside: [["punctuation", [r(/\\/)]]] }),
      { ...PHP_FQ, re: /(?:\\?\b[a-z_]\w*)+(?=\s*::)/i, greedy: true, alias: "class-name-fully-qualified static-context" },
    ],
  ],
  ["constant", [r(/\b(?:false|true)\b/i, { alias: "boolean" }), r(/(::\s*)\b[a-z_]\w*\b(?!\s*\()/i, { lookbehind: true, greedy: true }), r(/\b(?:null)\b/i), r(/\b[A-Z_][A-Z0-9_]*\b(?!\s*\()/)]],
  ["function", [r(/(^|[^\\\w])\\?[a-z_](?:[\w\\]*\w)?(?=\s*\()/i, { lookbehind: true, inside: [["punctuation", [r(/\\/)]]] })]],
  ["property", [r(/(->\s*)\w+/, { lookbehind: true })]],
  ["number", [r(/\b0b[01]+(?:_[01]+)*\b|\b0o[0-7]+(?:_[0-7]+)*\b|\b0x[\da-f]+(?:_[\da-f]+)*\b|(?:\b\d+(?:_\d+)*\.?(?:\d+(?:_\d+)*)?|\B\.\d+)(?:e[+-]?\d+)?/i)]],
  ["operator", [r(/<?=>|\?\?=?|\.{3}|\??->|[!=]=?=?|::|\*\*=?|--|\+\+|&&|\|\||<<|>>|[?~]|[/^|%*&<>.+-]=?/)]],
  ["punctuation", [r(/[{}[\](),:;]/)]],
];

const JAVA_PREFIX = "(?:[a-z]\\w*\\s*\\.\\s*)*(?:[A-Z]\\w*\\s*\\.\\s*)*";
const java: Grammar = [
  ["comment", CLIKE_COMMENT],
  ["triple-quoted-string", [r(/"""[ \t]*[\r\n](?:(?:"|"")?(?:\\.|[^"\\]))*"""/, { greedy: true, alias: "string" })]],
  ["char", [r(/'(?:\\.|[^'\\\r\n]){1,6}'/, { greedy: true })]],
  ["string", [r(/(^|[^\\])"(?:\\.|[^"\\\r\n])*"/, { lookbehind: true, greedy: true })]],
  ["annotation", [r(/(^|[^.])@\w+(?:\s*\.\s*\w+)*/, { lookbehind: true, alias: "punctuation" })]],
  [
    "class-name",
    [
      r(new RegExp(`(^|[^\\w.])${JAVA_PREFIX}[A-Z](?:[\\d_A-Z]*[a-z]\\w*)?\\b`), { lookbehind: true, inside: DOT_PUNCT }),
      r(/(\b(?:class|enum|extends|implements|instanceof|interface|new|record|throws)\s+)[A-Z_]\w*/, { lookbehind: true }),
    ],
  ],
  ["keyword", [r(/\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|null|open|opens|package|permits|private|protected|provides|public|record(?!\s*[(){}[\]<>=%~.:,;?+\-*/&|^])|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/)]],
  ["boolean", [r(/\b(?:false|true)\b/)]],
  ["function", [CLIKE_FUNCTION, r(/(::\s*)[a-z_]\w*/, { lookbehind: true })]],
  ["number", [r(/\b0b[01][01_]*L?\b|\b0x(?:\.[\da-f_p+-]+|[\da-f_]+(?:\.[\da-f_p+-]+)?)\b|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i)]],
  ["constant", [r(/\b[A-Z][A-Z_\d]+\b/)]],
  ["operator", [r(/(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m, { lookbehind: true })]],
  ["punctuation", [PUNCT]],
];

const csharp: Grammar = [
  ["comment", CLIKE_COMMENT],
  ["string", [r(/(^|[^$\\])@"(?:""|\\[\s\S]|[^\\"])*"(?!")/, { lookbehind: true, greedy: true }), r(/(^|[^@$\\])"(?:\\.|[^\\"\r\n])*"/, { lookbehind: true, greedy: true })]],
  ["char", [r(/'(?:[^\r\n'\\]|\\.|\\[Uux][\da-fA-F]{1,8})'/, { greedy: true })]],
  [
    "class-name",
    [
      r(/(\bnew\s+)[A-Z_]\w*(?:\s*<[^<>;=+\-*/%&|^]*>)?(?=\s*[[({])/, { lookbehind: true, alias: "constructor-invocation", inside: [["punctuation", [r(/[<>,.]/)]]] }),
      r(/(\b(?:class|enum|interface|record|struct)\s+)[A-Z_]\w*/, { lookbehind: true }),
      r(/(^|[^\w.])[A-Z_]\w*(?:\s*<[^<>;=+\-*/%&|^()]*>)?(?=\s+(?!(?:in|is|as|var)\b)[a-z_]\w*\s*[=;,)])/i, { lookbehind: true, inside: [["punctuation", [r(/[<>,.]/)]]] }),
    ],
  ],
  ["keyword", [r(/\b(?:abstract|as|async|await|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|var|virtual|void|volatile|while|yield)\b/)]],
  ["boolean", [r(/\b(?:false|true)\b/)]],
  ["function", [CLIKE_FUNCTION]],
  ["number", [r(/(?:\b0(?:x[\da-f_]*[\da-f]|b[01_]*[01])|(?:\B\.\d+(?:_+\d+)*|\b\d+(?:_+\d+)*(?:\.\d+(?:_+\d+)*)?)(?:e[-+]?\d+(?:_+\d+)*)?)(?:[dflmu]|lu|ul)?\b/i)]],
  ["operator", [r(/>>=?|<<=?|[-=]>|([-+&|])\1|~|\?\?=?|[-+*/%&|^!=<>]=?/)]],
  ["punctuation", [r(/\?\.?|::|[{}[\];(),.:]/)]],
];

const SQL_KEYWORDS =
  "ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR";

const sql: Grammar = [
  ["comment", [r(/(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/, { lookbehind: true })]],
  ["variable", [r(/@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/, { greedy: true }), r(/@[\w.$]+/)]],
  ["string", [r(/(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/, { lookbehind: true, greedy: true })]],
  ["identifier", [r(/(^|[^@\\])`(?:\\[\s\S]|[^`\\]|``)*`/, { lookbehind: true, greedy: true, inside: [["punctuation", [r(/^`|`$/)]]] })]],
  ["function", [r(/\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i)]],
  ["keyword", [r(new RegExp(`\\b(?:${SQL_KEYWORDS})\\b`, "i"))]],
  ["boolean", [r(/\b(?:FALSE|NULL|TRUE)\b/i)]],
  ["number", [r(/\b0x[\da-f]+\b|\b\d+(?:\.\d*)?|\B\.\d+\b/i)]],
  ["operator", [r(/[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i)]],
  ["punctuation", [r(/[;[\]()`,.]/)]],
];

const BASH_VARIABLE: Rule[] = [r(/\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/, { greedy: true, inside: [["variable", [r(/^\$\(|^`|\)$|`$/)]]] }), r(/\$\{[^}]+\}/, { greedy: true }), r(/\$(?:\w+|[#?*!@$])/)];
const BASH_IN_STRING: Grammar = [["variable", BASH_VARIABLE]];
const bash: Grammar = [
  ["shebang", [r(/^#!\s*\/.*/, { alias: "important" })]],
  ["comment", [r(/(^|[^"{\\$])#.*/, { lookbehind: true })]],
  ["function-name", [r(/(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/, { lookbehind: true, alias: "function" }), r(/\b[\w-]+(?=\s*\(\s*\)\s*\{)/, { alias: "function" })]],
  ["assign-left", [r(/(^|[\s;|&]|[<>]\()\w+(?:\.\w+)*(?=\+?=)/, { lookbehind: true, alias: "variable" })]],
  ["parameter", [r(/(^|\s)-{1,2}(?:\w+:[+-]?)?\w+(?:\.\w+)*(?=[=\s]|$)/, { lookbehind: true, alias: "variable" })]],
  [
    "string",
    [
      r(/(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/, { lookbehind: true, greedy: true, inside: BASH_IN_STRING }),
      r(/(^|[^$\\])'[^']*'/, { lookbehind: true, greedy: true }),
    ],
  ],
  ["variable", BASH_VARIABLE],
  ["function", [r(/(^|[\s;|&]|[<>]\()(?:awk|bash|cat|cd|chmod|chown|cp|curl|cut|date|diff|docker|echo|env|export|find|git|grep|gzip|head|kill|less|ln|ls|make|mkdir|mv|node|npm|open|ping|pnpm|ps|pwd|rm|rsync|scp|sed|sh|sleep|sort|ssh|sudo|tail|tar|tee|touch|tr|uniq|unzip|wc|wget|which|xargs|yarn|zip|zsh)(?=$|[)\s;|&])/, { lookbehind: true })]],
  ["keyword", [r(/(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/, { lookbehind: true })]],
  ["builtin", [r(/(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/, { lookbehind: true, alias: "class-name" })]],
  ["boolean", [r(/(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/, { lookbehind: true })]],
  ["operator", [r(/\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/)]],
  ["punctuation", [r(/\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/)]],
  ["number", [r(/(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/, { lookbehind: true })]],
];

const markup: Grammar = [
  ["comment", [r(/<!--(?:(?!<!--)[\s\S])*?-->/)]],
  [
    "tag",
    [
      r(/<\/?(?!\d)[^\s>/=$<%]+(?:\s(?:\s*[^\s>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/, {
        greedy: true,
        inside: [
          ["tag", [r(/^<\/?[^\s>/]+/, { inside: [["punctuation", [r(/^<\/?/)]]] })]],
          ["attr-value", [r(/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/, { inside: [["punctuation", [r(/^=/), r(/^(\s*)["']|["']$/, { lookbehind: true })]]] })]],
          ["punctuation", [r(/\/?>/)]],
          ["attr-name", [r(/[^\s>/]+/)]],
        ],
      }),
    ],
  ],
  ["entity", [r(/&[\da-z]{1,8};/i)]],
];

const clike: Grammar = [
  ["comment", CLIKE_COMMENT],
  ["string", [QUOTED]],
  ["class-name", [r(/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i, { lookbehind: true, inside: DOT_PUNCT })]],
  ["keyword", [r(/\b(?:abstract|as|break|case|catch|class|continue|do|else|enum|false|finally|for|fun|func|if|import|in|interface|is|let|new|null|object|override|package|private|protected|public|return|static|struct|super|switch|this|throw|true|try|val|var|when|while)\b/)]],
  ["boolean", [r(/\b(?:false|true)\b/)]],
  ["function", [CLIKE_FUNCTION]],
  ["number", [CLIKE_NUMBER]],
  ["operator", [CLIKE_OPERATOR]],
  ["punctuation", [PUNCT]],
];

const GRAMMARS: Record<string, Grammar> = {
  javascript,
  jsx: javascript,
  json,
  python,
  ruby,
  go,
  php,
  java,
  csharp,
  dotnet: csharp,
  sql,
  bash,
  html: markup,
  markup,
  markdown: markup,
  markdoc: markup,
  kotlin: clike,
  swift: clike,
};

export const SUPPORTED_LANGUAGES = [
  "bash", "csharp", "go", "html", "java", "javascript", "json", "jsx", "kotlin", "markdoc", "markdown", "php",
  "python", "ruby", "sql", "swift",
] as const;

/** Prism.highlight equivalent: escaped HTML with `<span class="token …">` wrappers. */
export function highlight(code: string, language: string): string {
  const grammar = GRAMMARS[language];
  if (!grammar) return escapeHtml(code);
  return render(tokenize(code, grammar));
}
