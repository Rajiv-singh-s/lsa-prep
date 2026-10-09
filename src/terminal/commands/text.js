// Text processing commands. Regular expressions follow GNU semantics closely enough for
// learning: BRE by default, ERE with -E, POSIX character classes supported.
import { FsError, S_IFDIR, S_IFREG } from '../vfs.js';
import { getopt } from './util.js';

const fail = (ctx, msg, code = 1) => { ctx.error(`${ctx.name}: ${msg}`); return code; };

/** Read named files (or stdin when none / "-"). Returns { text, code, parts:[{name,text}] }. */
export function readInputs(ctx, files, { allowDirs = false } = {}) {
  const parts = [];
  let code = 0;
  if (!files.length) {
    if (ctx.stdin === null || ctx.stdin === undefined) {
      ctx.error(`${ctx.name}: no input (the simulator has no interactive stdin — pass a file or pipe data in)`);
      return { text: '', code: 1, parts };
    }
    parts.push({ name: '(standard input)', text: ctx.stdin });
  }
  for (const f of files) {
    if (f === '-') { parts.push({ name: '(standard input)', text: ctx.stdin || '' }); continue; }
    try {
      const r = ctx.fs.resolve(f, ctx.cwd, { user: ctx.user });
      if (r.node.type === S_IFDIR) { if (!allowDirs) { ctx.error(`${ctx.name}: ${f}: Is a directory`); code = 1; } continue; }
      parts.push({ name: f, text: ctx.fs.readFile(f, ctx.cwd, ctx.user) });
    } catch (e) { ctx.error(`${ctx.name}: ${f}: ${FsError.text(e.code) || e.message}`); code = 1; }
  }
  return { text: parts.map(p => p.text).join(''), code, parts };
}

const lines = (text) => { if (!text) return []; const l = text.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; };
const out = (ctx, arr) => { if (arr.length) ctx.print(arr.join('\n')); };

const POSIX_CLASSES = { alpha: 'a-zA-Z', digit: '0-9', alnum: 'a-zA-Z0-9', upper: 'A-Z', lower: 'a-z', space: '\\s', blank: ' \\t', punct: '!-\\/:-@\\[-`{-~', xdigit: '0-9A-Fa-f', print: '\\x20-\\x7e', graph: '\\x21-\\x7e', cntrl: '\\x00-\\x1f' };

/** Translate a GNU BRE/ERE into a JavaScript RegExp source. */
export function posixToJs(pattern, extended) {
  let src = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '[') {
      const end = findClassEnd(pattern, i);
      if (end < 0) { src += '\\['; continue; }
      let body = pattern.slice(i + 1, end);
      body = body.replace(/\[:(\w+):\]/g, (_m, n) => POSIX_CLASSES[n] || '');
      body = body.replace(/\\/g, '\\\\');
      if (body.startsWith('^')) src += '[^' + body.slice(1) + ']'; else src += '[' + body + ']';
      i = end;
      continue;
    }
    if (c === '\\') {
      const n = pattern[++i];
      if (n === undefined) { src += '\\\\'; break; }
      if (n === '<' || n === '>') src += '\\b';
      else if (!extended && '(){}|+?'.includes(n)) src += n;
      else if ('wWsSbB'.includes(n) || /\d/.test(n)) src += '\\' + n;
      else src += '\\' + n;
      continue;
    }
    if (!extended && '(){}|+?'.includes(c)) { src += '\\' + c; continue; }
    if (!extended && c === '*' && (src === '' || src.endsWith('^') || src.endsWith('('))) { src += '\\*'; continue; }
    src += c;
  }
  return src;
}

function findClassEnd(p, start) {
  let i = start + 1;
  if (p[i] === '^') i++;
  if (p[i] === ']') i++;
  for (; i < p.length; i++) {
    if (p[i] === '[' && p[i + 1] === ':') { const e = p.indexOf(':]', i + 2); if (e > 0) { i = e + 1; continue; } }
    if (p[i] === ']') return i;
  }
  return -1;
}

function makeRegex(pattern, { extended, fixed, icase, word, line, global = false }) {
  let src = fixed ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : posixToJs(pattern, extended);
  if (word) src = `(?<![\\w])(?:${src})(?![\\w])`;
  if (line) src = `^(?:${src})$`;
  return new RegExp(src, (icase ? 'i' : '') + (global ? 'g' : ''));
}

function grep(ctx) {
  const { o, rest, bad } = getopt(ctx.args, 'ivncwlLrRhHEFoqsxzZ', 'eABCm', { 'ignore-case': 'i', 'invert-match': 'v', count: 'c', recursive: 'r', 'line-number': 'n', 'files-with-matches': 'l', 'extended-regexp': 'E', 'fixed-strings': 'F', 'only-matching': 'o', quiet: 'q', color: 'color', colour: 'color', 'word-regexp': 'w', 'line-regexp': 'x', include: '=include' });
  if (bad) return fail(ctx, bad, 2);
  const patterns = [];
  if (o.e !== undefined) patterns.push(o.e);
  // getopt keeps only the last -e; collect all -e occurrences manually
  const multiE = [];
  ctx.args.forEach((a, i) => { if (a === '-e' && ctx.args[i + 1] !== undefined) multiE.push(ctx.args[i + 1]); });
  if (multiE.length > 1) patterns.splice(0, patterns.length, ...multiE);
  if (!patterns.length) { if (!rest.length) return fail(ctx, "Usage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.", 2); patterns.push(rest.shift()); }
  let regexes;
  try { regexes = patterns.map(p => makeRegex(p, { extended: o.E || ctx.name === 'egrep', fixed: o.F, icase: o.i, word: o.w, line: o.x })); }
  catch (e) { return fail(ctx, `Invalid regular expression: ${e.message}`, 2); }
  const fs = ctx.fs;
  let files = rest;
  const sources = [];
  if (o.r || o.R) {
    if (!files.length) files = ['.'];
    for (const f of files) {
      const r = fs.tryResolve(f, ctx.cwd);
      if (!r) { ctx.error(`grep: ${f}: No such file or directory`); continue; }
      fs.walk(r.path, '/', (node, path, _d, err) => {
        if (err) { if (!o.s) ctx.error(`grep: ${path}: Permission denied`); return; }
        if (node && node.type === S_IFREG && !path.startsWith('/proc')) {
          if (o.include && !new RegExp('^' + o.include.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$').test(path.split('/').pop())) return;
          try { sources.push({ name: f === '.' ? path.replace(r.path + '/', '') : (f.endsWith('/') ? f : f + '/') + path.slice(r.path.length + 1), text: fs.readFile(path, '/', ctx.user) }); }
          catch { if (!o.s) ctx.error(`grep: ${path}: Permission denied`); }
        }
      }, { user: ctx.user });
    }
  } else {
    const { parts, code } = readInputs(ctx, files);
    sources.push(...parts);
    if (code && !parts.length) return 2;
  }
  const showName = (sources.length > 1 || o.r || o.R) && !o.h || o.H;
  let matchedAny = false;
  const A = Number(o.A ?? o.C ?? 0), B = Number(o.B ?? o.C ?? 0);
  const maxCount = o.m !== undefined ? Number(o.m) : Infinity;
  for (const src of sources) {
    const ls = lines(src.text);
    let count = 0;
    const printed = new Set();
    const result = [];
    let lastPrinted = -2;
    for (let i = 0; i < ls.length && count < maxCount; i++) {
      const hit = regexes.some(re => re.test(ls[i]));
      if (hit === !o.v) {
        count++;
        matchedAny = true;
        if (o.q || o.l || o.L || o.c) continue;
        const prefix = (n, sep) => (showName ? `${src.name}${sep}` : '') + (o.n ? `${n + 1}${sep}` : '');
        if (o.o && !o.v) {
          for (const re of regexes) {
            const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
            for (const m of ls[i].matchAll(g)) if (m[0]) result.push(prefix(i, ':') + m[0]);
          }
          continue;
        }
        if ((A || B) && lastPrinted >= 0 && i - B > lastPrinted + 1) result.push('--');
        for (let k = Math.max(0, i - B); k < i; k++) if (!printed.has(k)) { result.push(prefix(k, '-') + ls[k]); printed.add(k); }
        if (!printed.has(i)) { result.push(prefix(i, ':') + ls[i]); printed.add(i); }
        for (let k = i + 1; k <= Math.min(ls.length - 1, i + A); k++) if (!printed.has(k)) { const kh = regexes.some(re => re.test(ls[k])) === !o.v; if (!kh) { result.push(prefix(k, '-') + ls[k]); printed.add(k); } }
        lastPrinted = Math.max(...printed);
      }
    }
    if (o.q) continue;
    if (o.l) { if (count) ctx.print(src.name); continue; }
    if (o.L) { if (!count) ctx.print(src.name); continue; }
    if (o.c) { ctx.print((showName ? `${src.name}:` : '') + count); continue; }
    out(ctx, result);
  }
  return matchedAny ? 0 : 1;
}

// ---------- sed ----------
function parseSedScript(script, extended) {
  const cmds = [];
  let i = 0;
  const s = script;
  const parseAddr = () => {
    if (s[i] === '$') { i++; return { last: true }; }
    if (/\d/.test(s[i])) { let n = ''; while (/\d/.test(s[i])) n += s[i++]; return { line: Number(n) }; }
    if (s[i] === '/') { const end = findDelim(s, i + 1, '/'); const re = new RegExp(posixToJs(s.slice(i + 1, end), extended)); i = end + 1; return { re }; }
    return null;
  };
  while (i < s.length) {
    while (s[i] === ';' || s[i] === ' ' || s[i] === '\n') i++;
    if (i >= s.length) break;
    const a1 = parseAddr();
    let a2 = null;
    if (a1 && s[i] === ',') { i++; a2 = parseAddr(); }
    let negate = false;
    if (s[i] === '!') { negate = true; i++; }
    const c = s[i++];
    if (c === 's') {
      const d = s[i];
      const e1 = findDelim(s, i + 1, d);
      const e2 = findDelim(s, e1 + 1, d);
      if (e1 < 0 || e2 < 0) throw new Error(`-e expression #1, char ${i}: unterminated \`s' command`);
      const pat = s.slice(i + 1, e1), rep = s.slice(e1 + 1, e2);
      i = e2 + 1;
      let flags = '';
      while (i < s.length && /[gipI0-9]/.test(s[i])) flags += s[i++];
      const nth = Number((flags.match(/\d+/) || [0])[0]);
      const re = new RegExp(posixToJs(pat, extended), (flags.includes('g') ? 'g' : '') + (/[iI]/.test(flags) ? 'i' : ''));
      const jsRep = rep.replace(/\\(\d)/g, '$$$1').replace(/(^|[^\\])&/g, '$1$$&').replace(/\\&/g, '&').replace(/\\n/g, '\n').replace(/\\\//g, '/');
      cmds.push({ a1, a2, negate, c: 's', re, rep: jsRep, print: flags.includes('p'), nth });
    } else if ('dpq='.includes(c)) cmds.push({ a1, a2, negate, c });
    else if (c === 'a' || c === 'i' || c === 'c') {
      let text = s.slice(i).replace(/^\\?\s*/, '');
      const semi = text.indexOf(';');
      if (semi >= 0 && !text.startsWith('{')) { i += s.slice(i).indexOf(text) + semi; text = text.slice(0, semi); } else i = s.length;
      cmds.push({ a1, a2, negate, c, text });
    } else throw new Error(`-e expression #1, char ${i}: unknown command: \`${c}'`);
  }
  return cmds;
}

function findDelim(s, start, d) {
  for (let i = start; i < s.length; i++) { if (s[i] === '\\') { i++; continue; } if (s[i] === d) return i; }
  return -1;
}

function sed(ctx) {
  const args = ctx.args.slice();
  const scripts = [];
  let quiet = false, inPlace = false, extended = false;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-n' || a === '--quiet') quiet = true;
    else if (a === '-i' || a.startsWith('-i')) inPlace = true;
    else if (a === '-E' || a === '-r') extended = true;
    else if (a === '-e') scripts.push(args[++i]);
    else if (/^-[nEr]+$/.test(a)) { quiet ||= a.includes('n'); extended ||= /[Er]/.test(a); }
    else if (!scripts.length && !a.startsWith('-')) scripts.push(a);
    else files.push(a);
  }
  if (!scripts.length) return fail(ctx, 'no script specified', 1);
  let cmds;
  try { cmds = parseSedScript(scripts.join('\n'), extended); } catch (e) { return fail(ctx, e.message, 1); }
  const run = (text) => {
    const ls = lines(text);
    const result = [];
    const active = cmds.map(() => false);
    for (let n = 0; n < ls.length; n++) {
      let line = ls[n];
      let deleted = false;
      const before = [], after = [];
      const isLast = n === ls.length - 1;
      const matchAddr = (a) => (a.last ? isLast : a.line !== undefined ? n + 1 === a.line : a.re.test(line));
      let quit = false;
      for (let k = 0; k < cmds.length && !deleted; k++) {
        const c = cmds[k];
        let sel;
        if (!c.a1) sel = true;
        else if (!c.a2) sel = matchAddr(c.a1);
        else {
          if (!active[k] && matchAddr(c.a1)) { active[k] = true; sel = true; if (c.a2.line !== undefined && c.a2.line <= n + 1) active[k] = false; }
          else if (active[k]) { sel = true; if (matchAddr(c.a2)) active[k] = false; }
          else sel = false;
        }
        if (c.negate) sel = !sel;
        if (!sel) continue;
        if (c.c === 's') {
          let count = 0;
          const replaced = c.nth ? line.replace(new RegExp(c.re.source, c.re.flags.includes('g') ? c.re.flags : c.re.flags + 'g'), (...m) => (++count === c.nth ? m[0].replace(new RegExp(c.re.source, c.re.flags.replace('g', '')), c.rep) : m[0])) : line.replace(c.re, c.rep);
          if (replaced !== line || c.re.test(line)) { line = replaced; if (c.print) result.push(line); }
        } else if (c.c === 'd') deleted = true;
        else if (c.c === 'p') result.push(line);
        else if (c.c === '=') result.push(String(n + 1));
        else if (c.c === 'a') after.push(c.text);
        else if (c.c === 'i') before.push(c.text);
        else if (c.c === 'c') { line = c.text; }
        else if (c.c === 'q') quit = true;
      }
      result.push(...before);
      if (!deleted && !quiet) result.push(line);
      result.push(...after);
      if (quit) break;
    }
    return result;
  };
  if (inPlace) {
    if (!files.length) return fail(ctx, 'no input files', 1);
    for (const f of files) {
      try { const t = ctx.fs.readFile(f, ctx.cwd, ctx.user); const r = run(t); ctx.fs.writeFile(f, ctx.cwd, r.length ? r.join('\n') + '\n' : '', { user: ctx.user }); }
      catch (e) { ctx.error(`sed: can't read ${f}: ${FsError.text(e.code) || e.message}`); return 2; }
    }
    return 0;
  }
  const { text, code } = readInputs(ctx, files);
  out(ctx, run(text));
  return code ? 2 : 0;
}

// ---------- awk (subset) ----------
function awkTokens(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c) && c !== '\n') { i++; continue; }
    if (c === '\n' || c === ';') { toks.push({ t: ';' }); i++; continue; }
    if (c === '"') { let j = i + 1, s = ''; while (j < src.length && src[j] !== '"') { if (src[j] === '\\') { const n = src[++j]; s += n === 'n' ? '\n' : n === 't' ? '\t' : n; } else s += src[j]; j++; } toks.push({ t: 'str', v: s }); i = j + 1; continue; }
    if (c === '/' && (!toks.length || ['(', ',', '{', ';', '!', '~', '!~', '&&', '||', 'op'].includes(toks[toks.length - 1].t) || toks[toks.length - 1].t === 'rel' || toks[toks.length - 1].t === 'begin')) {
      const end = findDelim(src, i + 1, '/');
      toks.push({ t: 're', v: new RegExp(posixToJs(src.slice(i + 1, end), true)) }); i = end + 1; continue;
    }
    let m;
    if ((m = /^\d+(\.\d+)?/.exec(src.slice(i)))) { toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i)))) { toks.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
    if ((m = /^(\+\+|--|\+=|-=|\*=|\/=|==|!=|<=|>=|&&|\|\||!~|[-+*/%<>=!~$(){},])/.exec(src.slice(i)))) { toks.push({ t: m[0] }); i += m[0].length; continue; }
    throw new Error(`syntax error at source line 1 near '${src.slice(i, i + 10)}'`);
  }
  return toks;
}

function awkCompile(program) {
  const toks = awkTokens(program);
  let p = 0;
  const peek = (o = 0) => toks[p + o];
  const eat = (t) => { if (peek()?.t !== t) throw new Error(`syntax error: expected '${t}'`); return toks[p++]; };
  const rules = [];
  // expression parser (precedence climbing)
  const primary = () => {
    const tk = toks[p++];
    if (!tk) throw new Error('syntax error: unexpected end of program');
    if (tk.t === 'num') return () => tk.v;
    if (tk.t === 'str') return () => tk.v;
    if (tk.t === 're') return (env) => (tk.v.test(env.$0) ? 1 : 0);
    if (tk.t === '$') { const e = primary(); return (env) => env.field(Number(e(env))); }
    if (tk.t === '(') { const e = expr(); eat(')'); return e; }
    if (tk.t === '!') { const e = primary(); return (env) => (truthy(e(env)) ? 0 : 1); }
    if (tk.t === '-') { const e = primary(); return (env) => -num(e(env)); }
    if (tk.t === 'id') {
      const name = tk.v;
      if (peek()?.t === '(' && ['length', 'toupper', 'tolower', 'substr', 'int', 'index'].includes(name)) {
        p++;
        const args = [];
        while (peek()?.t !== ')') { args.push(expr()); if (peek()?.t === ',') p++; }
        eat(')');
        return (env) => {
          const v = args.map(a => a(env));
          switch (name) {
            case 'length': return String(v.length ? v[0] : env.$0).length;
            case 'toupper': return String(v[0]).toUpperCase();
            case 'tolower': return String(v[0]).toLowerCase();
            case 'substr': return String(v[0]).substr(num(v[1]) - 1, v[2] === undefined ? undefined : num(v[2]));
            case 'int': return Math.trunc(num(v[0]));
            case 'index': return String(v[0]).indexOf(String(v[1])) + 1;
          }
          return '';
        };
      }
      if (peek()?.t === '++' || peek()?.t === '--') { const op = toks[p++].t; return (env) => { const old = num(env.get(name)); env.set(name, op === '++' ? old + 1 : old - 1); return old; }; }
      if (['+=', '-=', '*=', '/=', '='].includes(peek()?.t)) {
        const op = toks[p++].t; const e = expr();
        return (env) => { const v = e(env); const old = num(env.get(name)); const r = op === '=' ? v : op === '+=' ? old + num(v) : op === '-=' ? old - num(v) : op === '*=' ? old * num(v) : old / num(v); env.set(name, r); return r; };
      }
      return (env) => env.get(name);
    }
    throw new Error(`syntax error near '${tk.t}'`);
  };
  const concat = () => {
    let left = additive();
    while (peek() && ['num', 'str', 'id', '$', '('].includes(peek().t)) { const l = left, r = additive(); left = (env) => String(l(env)) + String(r(env)); }
    return left;
  };
  const term = () => { let l = primary(); while (['*', '/', '%'].includes(peek()?.t)) { const op = toks[p++].t; const a = l, b = primary(); l = (env) => (op === '*' ? num(a(env)) * num(b(env)) : op === '/' ? num(a(env)) / num(b(env)) : num(a(env)) % num(b(env))); } return l; };
  const additive = () => { let l = term(); while (['+', '-'].includes(peek()?.t)) { const op = toks[p++].t; const a = l, b = term(); l = (env) => (op === '+' ? num(a(env)) + num(b(env)) : num(a(env)) - num(b(env))); } return l; };
  const rel = () => {
    let l = concat();
    while (['<', '>', '<=', '>=', '==', '!=', '~', '!~'].includes(peek()?.t)) {
      const op = toks[p++].t;
      if (op === '~' || op === '!~') { const reTok = toks[p++]; const re = reTok.t === 're' ? reTok.v : new RegExp(reTok.v); const a = l; l = (env) => (re.test(String(a(env))) === (op === '~') ? 1 : 0); continue; }
      const a = l, b = concat();
      l = (env) => { const x = a(env), y = b(env); const both = isNum(x) && isNum(y); const X = both ? num(x) : String(x), Y = both ? num(y) : String(y); return ({ '<': X < Y, '>': X > Y, '<=': X <= Y, '>=': X >= Y, '==': X === Y, '!=': X !== Y })[op] ? 1 : 0; };
    }
    return l;
  };
  const and = () => { let l = rel(); while (peek()?.t === '&&') { p++; const a = l, b = rel(); l = (env) => (truthy(a(env)) && truthy(b(env)) ? 1 : 0); } return l; };
  const expr = () => { let l = and(); while (peek()?.t === '||') { p++; const a = l, b = and(); l = (env) => (truthy(a(env)) || truthy(b(env)) ? 1 : 0); } return l; };
  const statement = () => {
    const tk = peek();
    if (tk?.t === 'id' && (tk.v === 'print' || tk.v === 'printf')) {
      p++;
      const args = [];
      while (peek() && peek().t !== ';' && peek().t !== '}') { args.push(expr()); if (peek()?.t === ',') { p++; args.push(null); } }
      if (tk.v === 'printf') return (env) => { const vals = args.filter(Boolean).map(a => a(env)); env.out(formatPrintf(String(vals[0]), vals.slice(1).map(String)).text); };
      return (env) => {
        if (!args.length) { env.out(env.$0 + '\n'); return; }
        let s = '';
        for (const a of args) s += a === null ? env.OFS : String(fmtNum(a(env)));
        env.out(s + '\n');
      };
    }
    if (tk?.t === 'id' && tk.v === 'next') { p++; return (env) => { env.next = true; }; }
    const e = expr();
    return (env) => { e(env); };
  };
  const block = () => {
    eat('{');
    const stmts = [];
    while (peek() && peek().t !== '}') { if (peek().t === ';') { p++; continue; } stmts.push(statement()); }
    eat('}');
    return (env) => { for (const s of stmts) { s(env); if (env.next) return; } };
  };
  while (p < toks.length) {
    if (peek().t === ';') { p++; continue; }
    if (peek().t === 'id' && (peek().v === 'BEGIN' || peek().v === 'END')) { const kind = toks[p++].v; rules.push({ kind, action: block() }); continue; }
    let pattern = null;
    if (peek().t !== '{') {
      pattern = expr();
      if (peek()?.t === ',') { p++; const second = expr(); const first = pattern; let on = false; pattern = (env) => { if (!on && truthy(first(env))) { on = true; if (truthy(second(env))) on = false; return 1; } if (on) { if (truthy(second(env))) on = false; return 1; } return 0; }; }
    }
    const action = peek()?.t === '{' ? block() : null;
    rules.push({ kind: 'main', pattern, action });
  }
  return rules;
}
const isNum = (v) => typeof v === 'number' || (/^\s*-?\d+(\.\d+)?\s*$/.test(String(v)));
const num = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);
const truthy = (v) => (typeof v === 'number' ? v !== 0 : v !== '' && v !== '0');
const fmtNum = (v) => (typeof v === 'number' && !Number.isInteger(v) ? Number(v.toFixed(6)) : v);

function awk(ctx) {
  const args = ctx.args.slice();
  let fs = null;
  const vars = {};
  while (args.length && args[0].startsWith('-') && args[0] !== '-') {
    const a = args.shift();
    if (a === '-F') fs = args.shift();
    else if (a.startsWith('-F')) fs = a.slice(2);
    else if (a === '-v') { const [k, v] = args.shift().split('='); vars[k] = v; }
    else return fail(ctx, `unknown option ${a}`, 2);
  }
  const program = args.shift();
  if (program === undefined) return fail(ctx, "usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]", 2);
  let rules;
  try { rules = awkCompile(program); } catch (e) { return fail(ctx, e.message, 2); }
  const { parts, code } = readInputs(ctx, args);
  const sep = fs === null ? null : fs === '\\t' || fs === 't' ? '\t' : fs;
  let output = '';
  const g = { ...vars, OFS: ' ', NR: 0 };
  const env = {
    $0: '', fields: [], next: false, OFS: ' ',
    out: (s) => { output += s; },
    field(n) { return n === 0 ? this.$0 : this.fields[n - 1] ?? ''; },
    get(name) { if (name === 'NR') return g.NR; if (name === 'NF') return this.fields.length; if (name === 'FNR') return g.NR; return g[name] ?? ''; },
    set(name, v) { g[name] = v; }
  };
  for (const r of rules.filter(r => r.kind === 'BEGIN')) r.action(env);
  for (const part of parts) {
    for (const line of lines(part.text)) {
      g.NR++;
      env.$0 = line;
      env.fields = sep === null ? line.trim().split(/\s+/).filter(Boolean) : line.split(sep.length === 1 ? sep : new RegExp(sep));
      env.next = false;
      for (const r of rules.filter(r => r.kind === 'main')) {
        if (env.next) break;
        if (r.pattern && !truthy(r.pattern(env))) continue;
        if (r.action) r.action(env); else env.out(line + '\n');
      }
    }
  }
  env.$0 = ''; env.fields = [];
  for (const r of rules.filter(r => r.kind === 'END')) r.action(env);
  if (output) ctx.write(output);
  return code ? 2 : 0;
}

// ---------- printf ----------
export function unescape(s) {
  return s.replace(/\\(n|t|r|\\|a|e|0[0-7]{0,3}|x[0-9a-fA-F]{1,2}|c)/g, (_m, e) => {
    if (e === 'n') return '\n'; if (e === 't') return '\t'; if (e === 'r') return '\r'; if (e === '\\') return '\\';
    if (e === 'a') return '\u0007'; if (e === 'e') return '\u001b'; if (e === 'c') return '\u0000STOP';
    if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
    return String.fromCharCode(parseInt(e.slice(1) || '0', 8));
  });
}

export function formatPrintf(fmt, args) {
  let text = '';
  let ai = 0;
  const once = () => fmt.replace(/%(-?)(0?)(\d*)(?:\.(\d+))?([sdifxXobc%])/g, (_m, left, zero, width, prec, conv) => {
    if (conv === '%') return '%';
    const a = args[ai++] ?? '';
    let s;
    switch (conv) {
      case 's': s = prec ? String(a).slice(0, Number(prec)) : String(a); break;
      case 'd': case 'i': s = String(Math.trunc(Number(a) || 0)); break;
      case 'f': s = (Number(a) || 0).toFixed(prec === undefined ? 6 : Number(prec)); break;
      case 'x': s = (Math.trunc(Number(a)) >>> 0).toString(16); break;
      case 'X': s = (Math.trunc(Number(a)) >>> 0).toString(16).toUpperCase(); break;
      case 'o': s = (Math.trunc(Number(a)) >>> 0).toString(8); break;
      case 'c': s = String(a)[0] || ''; break;
      case 'b': s = unescape(String(a)); break;
      default: s = String(a);
    }
    const w = Number(width || 0);
    if (s.length < w) s = left ? s.padEnd(w) : s.padStart(w, zero && conv !== 's' ? '0' : ' ');
    return s;
  });
  do { text += unescape(once()); } while (ai < args.length && ai > 0);
  return { text: text.split('\u0000STOP')[0] };
}

// ---------- test / [ ----------
export function evalTest(ctx, argv) {
  const fs = ctx.fs;
  const fileTest = (op, path) => {
    const r = fs.tryResolve(path, ctx.cwd, { follow: op !== '-L' && op !== '-h' });
    if (!r) return false;
    const n = r.node;
    switch (op) {
      case '-e': return true; case '-f': return n.type === 'f'; case '-d': return n.type === 'd';
      case '-L': case '-h': return n.type === 'l'; case '-s': return fs.usage(n) > 0;
      case '-r': return fs.can(n, 'r', ctx.user); case '-w': return fs.can(n, 'w', ctx.user); case '-x': return fs.can(n, 'x', ctx.user);
      case '-b': return n.type === 'b'; case '-c': return n.type === 'c'; case '-u': return !!(n.mode & 0o4000); case '-g': return !!(n.mode & 0o2000); case '-k': return !!(n.mode & 0o1000);
      case '-O': return n.uid === ctx.user.uid; case '-G': return n.gid === ctx.user.gid;
    }
    return false;
  };
  const unary = (op, a) => {
    if (op === '-z') return a.length === 0;
    if (op === '-n') return a.length > 0;
    return fileTest(op, a);
  };
  const binary = (a, op, b) => {
    switch (op) {
      case '=': case '==': return ctx.name === '[[' ? new RegExp('^' + b.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(a) : a === b;
      case '!=': return a !== b;
      case '=~': return new RegExp(b).test(a);
      case '<': return a < b; case '>': return a > b;
      case '-eq': return Number(a) === Number(b); case '-ne': return Number(a) !== Number(b);
      case '-lt': return Number(a) < Number(b); case '-le': return Number(a) <= Number(b);
      case '-gt': return Number(a) > Number(b); case '-ge': return Number(a) >= Number(b);
      case '-nt': { const x = fs.tryResolve(a, ctx.cwd), y = fs.tryResolve(b, ctx.cwd); return !!x && (!y || x.node.mtime > y.node.mtime); }
    }
    throw new Error(`${op}: binary operator expected`);
  };
  const parseOr = (toks) => {
    const idx = toks.findIndex(t => t === '-o' || t === '||');
    if (idx > 0) return parseOr(toks.slice(0, idx)) || parseOr(toks.slice(idx + 1));
    const ia = toks.findIndex(t => t === '-a' || t === '&&');
    if (ia > 0) return parseOr(toks.slice(0, ia)) && parseOr(toks.slice(ia + 1));
    if (toks[0] === '!') return !parseOr(toks.slice(1));
    if (toks[0] === '(' && toks[toks.length - 1] === ')') return parseOr(toks.slice(1, -1));
    if (toks.length === 0) return false;
    if (toks.length === 1) return toks[0].length > 0;
    if (toks.length === 2) return unary(toks[0], toks[1]);
    if (toks.length === 3) return binary(toks[0], toks[1], toks[2]);
    throw new Error('too many arguments');
  };
  return parseOr(argv);
}

function sortLines(ls, o) {
  const keyOf = (line) => {
    if (!o.k) return line;
    const [startF, endF] = String(o.k).split(',').map(x => parseInt(x, 10));
    const fields = o.t ? line.split(o.t) : line.trim().split(/\s+/);
    return fields.slice(startF - 1, endF ? endF : undefined).join(o.t || ' ') || '';
  };
  const humanVal = (s) => { const m = /^([\d.]+)([KMGTP]?)/i.exec(s.trim()); if (!m) return 0; return parseFloat(m[1]) * 1024 ** ' KMGTP'.indexOf((m[2] || ' ').toUpperCase()); };
  const cmp = (a, b) => {
    let x = keyOf(a), y = keyOf(b);
    if (o.f) { x = x.toLowerCase(); y = y.toLowerCase(); }
    let r;
    if (o.n) r = (parseFloat(x) || 0) - (parseFloat(y) || 0);
    else if (o.h) r = humanVal(x) - humanVal(y);
    else r = x < y ? -1 : x > y ? 1 : 0;
    return r || (a < b ? -1 : a > b ? 1 : 0);
  };
  let sorted = ls.slice().sort(cmp);
  if (o.r) sorted.reverse();
  if (o.u) sorted = sorted.filter((l, i) => i === 0 || cmp(sorted[i - 1], l) !== 0 || keyOf(sorted[i - 1]) !== keyOf(l));
  return sorted;
}

function parseList(spec) {
  // "1,3", "2-4", "3-", "-2"
  return spec.split(',').map(part => {
    const m = /^(\d*)-(\d*)$/.exec(part);
    if (m) return [m[1] ? Number(m[1]) : 1, m[2] ? Number(m[2]) : Infinity];
    return [Number(part), Number(part)];
  });
}

function expandTrSet(set) {
  let s = set.replace(/\[:(\w+):\]/g, (_m, n) => ({ upper: 'A-Z', lower: 'a-z', digit: '0-9', space: ' \t\n', alpha: 'a-zA-Z', alnum: 'a-zA-Z0-9', punct: '!-/:-@[-`{-~' }[n] || ''));
  s = unescape(s);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i + 1] === '-' && s[i + 2] !== undefined) { for (let c = s.charCodeAt(i); c <= s.charCodeAt(i + 2); c++) out += String.fromCharCode(c); i += 2; }
    else out += s[i];
  }
  return out;
}

function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { ops.push(['=', i, j]); i++; j++; }
    else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { ops.push(['+', i, j]); j++; }
    else { ops.push(['-', i, j]); i++; }
  }
  // group into normal-format hunks
  const out = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k][0] === '=') { k++; continue; }
    const start = k;
    while (k < ops.length && ops[k][0] !== '=') k++;
    const hunk = ops.slice(start, k);
    const dels = hunk.filter(h => h[0] === '-'), adds = hunk.filter(h => h[0] === '+');
    const range = (arr, idx) => (arr.length > 1 ? `${arr[0][idx] + 1},${arr[arr.length - 1][idx] + 1}` : `${arr[0][idx] + 1}`);
    if (dels.length && adds.length) out.push(`${range(dels, 1)}c${range(adds, 2)}`, ...dels.map(d => `< ${a[d[1]]}`), '---', ...adds.map(d => `> ${b[d[2]]}`));
    else if (dels.length) out.push(`${range(dels, 1)}d${dels[0][2]}`, ...dels.map(d => `< ${a[d[1]]}`));
    else out.push(`${adds[0][1]}a${range(adds, 2)}`, ...adds.map(d => `> ${b[d[2]]}`));
  }
  return out;
}

export const textCommands = [
  {
    name: 'cat', cat: 'Text', summary: 'Concatenate and print files', usage: 'cat [-n] [-A] [file...]', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'nAbsvET');
      const { text, code } = readInputs(ctx, rest);
      if (!text) return code;
      let ls = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
      if (o.A || o.E) ls = ls.map(l => l.replace(/\t/g, o.A ? '^I' : '\t') + '$');
      if (o.n) ls = ls.map((l, i) => `${String(i + 1).padStart(6)}\t${l}`);
      else if (o.b) { let n = 0; ls = ls.map(l => (l ? `${String(++n).padStart(6)}\t${l}` : l)); }
      ctx.write(ls.join('\n') + (text.endsWith('\n') ? '\n' : ''));
      if (!text.endsWith('\n')) ctx.write('\n');
      return code;
    }
  },
  ...['less', 'more'].map(name => ({
    name, cat: 'Text', summary: 'Page through a file (prints whole file in the simulator)', usage: `${name} file`, fidelity: 'partial',
    run(ctx) { const { text, code } = readInputs(ctx, ctx.args.filter(a => !a.startsWith('-') && !a.startsWith('+'))); if (text) ctx.write(text.endsWith('\n') ? text : text + '\n'); return code; }
  })),
  ...['head', 'tail'].map(name => ({
    name, cat: 'Text', summary: name === 'head' ? 'Print the first lines' : 'Print the last lines (-f not followed in simulator)', usage: `${name} [-n N] [file...]`, fidelity: 'functional',
    run(ctx) {
      const args = ctx.args.map(a => (/^-\d+$/.test(a) ? `-n${a.slice(1)}` : a));
      const { o, rest } = getopt(args, 'fqvF', 'nc', { lines: '=n', bytes: '=c', follow: 'f' });
      const nSpec = String(o.n ?? '10');
      const fromStart = nSpec.startsWith('+');
      const n = Math.abs(parseInt(nSpec, 10)) || 0;
      const { parts, code } = readInputs(ctx, rest);
      parts.forEach((p, idx) => {
        if (parts.length > 1) ctx.print(`${idx ? '\n' : ''}==> ${p.name} <==`);
        if (o.c) { const c = Number(o.c); ctx.write(name === 'head' ? p.text.slice(0, c) : p.text.slice(-c)); return; }
        const ls = lines(p.text);
        let sel;
        if (name === 'head') sel = nSpec.startsWith('-') ? ls.slice(0, Math.max(0, ls.length - n)) : ls.slice(0, n);
        else sel = fromStart ? ls.slice(Math.max(0, n - 1)) : (n === 0 ? [] : ls.slice(-n));
        out(ctx, sel);
      });
      if (o.f) ctx.error('tail: (simulator) follow mode is not supported; printed the current end of file');
      return code;
    }
  })),
  {
    name: 'wc', cat: 'Text', summary: 'Count lines, words, bytes', usage: 'wc [-lwcm] [file...]', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'lwcmL');
      const { parts, code } = readInputs(ctx, rest);
      const all = !o.l && !o.w && !o.c && !o.m;
      const tot = [0, 0, 0];
      const fmt = (l, w, c, name) => [o.l || all ? l : null, o.w || all ? w : null, o.c || o.m || all ? c : null].filter(x => x !== null).map(x => (all || parts.length > 1 ? String(x).padStart(7) : String(x))).join(' ') + (name ? ` ${name}` : '');
      for (const p of parts) {
        const l = (p.text.match(/\n/g) || []).length, w = p.text.split(/\s+/).filter(Boolean).length, c = new TextEncoder().encode(p.text).length;
        tot[0] += l; tot[1] += w; tot[2] += c;
        ctx.print(fmt(l, w, c, p.name === '(standard input)' ? '' : p.name));
      }
      if (parts.length > 1) ctx.print(fmt(tot[0], tot[1], tot[2], 'total'));
      return code;
    }
  },
  {
    name: 'sort', cat: 'Text', summary: 'Sort lines', usage: 'sort [-n|-h] [-r] [-u] [-f] [-t SEP] [-k N[,M]] [file...]', fidelity: 'functional',
    run(ctx) { const { o, rest } = getopt(ctx.args, 'nrufhbV', 'tko', { 'human-numeric-sort': 'h', reverse: 'r', unique: 'u', numeric: 'n' }); const { text, code } = readInputs(ctx, rest); out(ctx, sortLines(lines(text), o)); return code; }
  },
  {
    name: 'uniq', cat: 'Text', summary: 'Collapse adjacent duplicate lines', usage: 'uniq [-c] [-d] [-u] [-i] [file]', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'cdui');
      const { text, code } = readInputs(ctx, rest.slice(0, 1));
      const groups = [];
      for (const l of lines(text)) {
        const last = groups[groups.length - 1];
        if (last && (o.i ? last.line.toLowerCase() === l.toLowerCase() : last.line === l)) last.n++;
        else groups.push({ line: l, n: 1 });
      }
      out(ctx, groups.filter(g => (o.d ? g.n > 1 : o.u ? g.n === 1 : true)).map(g => (o.c ? `${String(g.n).padStart(7)} ${g.line}` : g.line)));
      return code;
    }
  },
  {
    name: 'cut', cat: 'Text', summary: 'Select fields or characters', usage: 'cut -d DELIM -f LIST | -c LIST [file...]', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 's', 'dfcb', { delimiter: '=d', fields: '=f', characters: '=c' });
      if (!o.f && !o.c && !o.b) return fail(ctx, 'you must specify a list of bytes, characters, or fields');
      const { text, code } = readInputs(ctx, rest);
      const ranges = parseList(o.f || o.c || o.b);
      const inRange = (i) => ranges.some(([a, b]) => i >= a && i <= b);
      const d = o.d ?? '\t';
      out(ctx, lines(text).flatMap(l => {
        if (o.f) {
          if (!l.includes(d)) return o.s ? [] : [l];
          return [l.split(d).filter((_, i) => inRange(i + 1)).join(d)];
        }
        return [[...l].filter((_, i) => inRange(i + 1)).join('')];
      }));
      return code;
    }
  },
  {
    name: 'tr', cat: 'Text', summary: 'Translate or delete characters', usage: 'tr [-d] [-s] SET1 [SET2]', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'dsc');
      if (!rest.length) return fail(ctx, 'missing operand');
      const text = ctx.stdin ?? '';
      if (ctx.stdin === null) return fail(ctx, '(simulator) tr reads standard input only — pipe data into it');
      const s1 = expandTrSet(rest[0]), s2 = rest[1] !== undefined ? expandTrSet(rest[1]) : '';
      let result = '';
      if (o.d) result = [...text].filter(c => !s1.includes(c)).join('');
      else if (s2) result = [...text].map(c => { const i = s1.indexOf(c); return i < 0 ? c : s2[Math.min(i, s2.length - 1)]; }).join('');
      else result = text;
      if (o.s) { const sq = s2 && !o.d ? s2 : s1; result = result.replace(/(.)\1+/gs, (m, c) => (sq.includes(c) ? c : m)); }
      ctx.write(result);
      return 0;
    }
  },
  {
    name: 'tee', cat: 'Text', summary: 'Copy stdin to stdout and files', usage: 'tee [-a] file...', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'ai');
      const text = ctx.stdin ?? '';
      let code = 0;
      for (const f of rest) {
        try { ctx.fs.writeFile(f, ctx.cwd, text, { user: ctx.user, append: !!o.a, umask: ctx.sys.session.umask }); }
        catch (e) { ctx.error(`tee: ${f}: ${FsError.text(e.code) || e.message}`); code = 1; }
      }
      ctx.write(text);
      return code;
    }
  },
  { name: 'grep', cat: 'Text', summary: 'Search text with regular expressions (BRE, -E ERE, -F fixed)', usage: 'grep [-ivnclrEFowx] [-A N] [-B N] [-C N] PATTERN [file...]', fidelity: 'functional', run: grep },
  { name: 'egrep', cat: 'Text', summary: 'grep -E (deprecated alias)', usage: 'egrep PATTERN [file...]', fidelity: 'functional', run: grep },
  { name: 'sed', cat: 'Text', summary: 'Stream editor (s///, d, p, a, i, c, =, q; addresses N, $, /re/, ranges; -n -i -E)', usage: "sed [-n] [-i] [-E] 's/old/new/g' [file...]", fidelity: 'partial', run: sed },
  { name: 'awk', cat: 'Text', summary: 'Pattern scanning (subset: fields, NR/NF, patterns, BEGIN/END, print/printf, arithmetic)', usage: "awk [-F SEP] 'pattern {action}' [file...]", fidelity: 'partial', run: awk },
  {
    name: 'echo', cat: 'Text', summary: 'Print arguments', usage: 'echo [-n] [-e] [text...]', fidelity: 'functional',
    run(ctx) {
      const args = ctx.args.slice();
      let newline = true, esc = false;
      while (args.length && /^-[neE]+$/.test(args[0])) { const f = args.shift(); if (f.includes('n')) newline = false; if (f.includes('e')) esc = true; if (f.includes('E')) esc = false; }
      let s = args.join(' ');
      if (esc) s = unescape(s).split('\u0000STOP')[0];
      ctx.write(s + (newline ? '\n' : ''));
      return 0;
    }
  },
  {
    name: 'printf', cat: 'Text', summary: 'Formatted output (%s %d %f %x %o %b %%)', usage: 'printf FORMAT [args...]', fidelity: 'functional',
    run(ctx) { if (!ctx.args.length) return fail(ctx, 'usage: printf format [arguments]', 2); ctx.write(formatPrintf(ctx.args[0], ctx.args.slice(1)).text); return 0; }
  },
  {
    name: 'xargs', cat: 'Text', summary: 'Build command lines from stdin', usage: 'xargs [-n N] [-I {}] [-0] command [args...]', fidelity: 'partial',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, '0rt', 'nI', { 'no-run-if-empty': 'r' });
      const cmd = rest.length ? rest : ['echo'];
      const input = ctx.stdin ?? '';
      const items = o.I ? lines(input) : input.split(o['0'] ? '\0' : /\s+/).filter(Boolean);
      if (!items.length && o.r) return 0;
      const batches = [];
      if (o.I) items.forEach(it => batches.push(cmd.map(c => c.replaceAll(o.I, it))));
      else if (o.n) for (let i = 0; i < items.length; i += Number(o.n)) batches.push([...cmd, ...items.slice(i, i + Number(o.n))]);
      else batches.push([...cmd, ...items]);
      let code = 0;
      for (const argv of batches) {
        if (o.t) ctx.error(argv.join(' '));
        let buf = '';
        const sub = ctx.shell.makeCtx(argv, null, (s) => { buf += s; }, (s) => ctx.error(s.replace(/\n$/, '')));
        const c = ctx.shell.dispatch(argv, sub);
        if (buf) ctx.write(buf);
        if (c) code = 123;
      }
      return code;
    }
  },
  {
    name: 'nl', cat: 'Text', summary: 'Number non-empty lines', usage: 'nl [file]', fidelity: 'functional',
    run(ctx) { const { text, code } = readInputs(ctx, ctx.args.filter(a => !a.startsWith('-'))); let n = 0; out(ctx, lines(text).map(l => (l.trim() ? `${String(++n).padStart(6)}\t${l}` : ''))); return code; }
  },
  {
    name: 'paste', cat: 'Text', summary: 'Merge lines of files', usage: 'paste [-d DELIM] [-s] file...', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 's', 'd');
      const d = o.d ?? '\t';
      const { parts, code } = readInputs(ctx, rest);
      if (o.s) { out(ctx, parts.map(p => lines(p.text).join(d))); return code; }
      const cols = parts.map(p => lines(p.text));
      const n = Math.max(0, ...cols.map(c => c.length));
      out(ctx, Array.from({ length: n }, (_, i) => cols.map(c => c[i] ?? '').join(d)));
      return code;
    }
  },
  {
    name: 'rev', cat: 'Text', summary: 'Reverse characters on each line', usage: 'rev [file]', fidelity: 'functional',
    run(ctx) { const { text, code } = readInputs(ctx, ctx.args); out(ctx, lines(text).map(l => [...l].reverse().join(''))); return code; }
  },
  {
    name: 'seq', cat: 'Text', summary: 'Print a sequence of numbers', usage: 'seq [FIRST [STEP]] LAST', fidelity: 'functional',
    run(ctx) {
      const nums = ctx.args.filter(a => /^-?\d+$/.test(a)).map(Number);
      let [a, s, b] = nums.length === 1 ? [1, 1, nums[0]] : nums.length === 2 ? [nums[0], 1, nums[1]] : nums;
      if (b === undefined || !s) return fail(ctx, 'missing operand');
      const res = [];
      for (let x = a; s > 0 ? x <= b : x >= b; x += s) { res.push(String(x)); if (res.length > 100000) break; }
      out(ctx, res);
      return 0;
    }
  },
  {
    name: 'diff', cat: 'Text', summary: 'Compare files line by line (normal format)', usage: 'diff file1 file2', fidelity: 'partial',
    run(ctx) {
      const files = ctx.args.filter(a => !a.startsWith('-'));
      if (files.length !== 2) return fail(ctx, 'missing operand', 2);
      try {
        const a = lines(ctx.fs.readFile(files[0], ctx.cwd, ctx.user)), b = lines(ctx.fs.readFile(files[1], ctx.cwd, ctx.user));
        const d = lcsDiff(a, b);
        out(ctx, d);
        return d.length ? 1 : 0;
      } catch (e) { return fail(ctx, `${e.path}: ${FsError.text(e.code)}`, 2); }
    }
  },
  ...['test', '[', '[['].map(name => ({
    name, cat: 'Shell', summary: 'Evaluate conditional expressions (-f -d -e -r -w -x -s -z -n = != -eq -lt ...)', usage: name === 'test' ? 'test EXPR' : `${name} EXPR ${name === '[' ? ']' : ']]'}`, fidelity: 'functional', builtin: true,
    run(ctx) {
      let argv = ctx.args.slice();
      if (name === '[' || name === '[[') {
        const close = name === '[' ? ']' : ']]';
        if (argv[argv.length - 1] !== close) { ctx.error(`bash: ${name}: missing \`${close}'`); return 2; }
        argv = argv.slice(0, -1);
      }
      try { return evalTest(ctx, argv) ? 0 : 1; } catch (e) { ctx.error(`bash: ${name}: ${e.message}`); return 2; }
    }
  })),
  {
    name: 'date', cat: 'System', summary: 'Print the simulated date/time', usage: 'date [-u] [+FORMAT]', fidelity: 'functional',
    run(ctx) {
      const d = new Date(ctx.sys.clock());
      const fmt = ctx.args.find(a => a.startsWith('+'));
      const p2 = (n) => String(n).padStart(2, '0');
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const map = { Y: d.getUTCFullYear(), m: p2(d.getUTCMonth() + 1), d: p2(d.getUTCDate()), H: p2(d.getUTCHours()), M: p2(d.getUTCMinutes()), S: p2(d.getUTCSeconds()), a: days[d.getUTCDay()], b: mons[d.getUTCMonth()], Z: 'UTC', s: Math.floor(d / 1000), j: String(Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000)).padStart(3, '0'), '%': '%' };
      map.F = `${map.Y}-${map.m}-${map.d}`; map.T = `${map.H}:${map.M}:${map.S}`;
      if (fmt) ctx.print(fmt.slice(1).replace(/%([a-zA-Z%])/g, (_m, c) => map[c] ?? `%${c}`));
      else ctx.print(`${map.a} ${map.b} ${String(d.getUTCDate()).padStart(2)} ${map.T} UTC ${map.Y}`);
      return 0;
    }
  },
  { name: 'sleep', cat: 'Shell', summary: 'Pause (returns immediately in the simulator)', usage: 'sleep SECONDS', fidelity: 'static', run() { return 0; } }
];
