// Bash-like shell interpreter for the simulator.
// Supports: quoting/escaping, $VAR ${VAR} $? $# $@ $1.., $(cmd), $((arith)), ~, globs (* ? [..]),
// brace expansion, pipes, ; && || &, redirection (> >> < 2> 2>> 2>&1 &>), VAR=value,
// if/elif/else/fi, for..in..do..done, while/until..do..done, functions, return/exit.
// Not supported (reported explicitly): case, here-documents, process substitution, job control.
import { FsError, S_IFDIR, S_IFREG, normalizePath, dirname, basename } from './vfs.js';
import { currentUser, userByName } from './system.js';

const MAX_LOOP = 5000;
const OPS = ['&&', '||', '2>&1', '&>', '2>>', '>>', '2>', '>', '<', '|', ';', '&'];

class ShellExit extends Error { constructor(code) { super('exit'); this.code = code; } }
class FuncReturn extends Error { constructor(code) { super('return'); this.code = code; } }

export class Shell {
  constructor(sys, registry) {
    this.sys = sys;
    this.registry = registry;
    this.functions = {};
    this.aliases = {};
    this.positional = [];
    this.scriptName = 'bash';
    this.depth = 0;
  }

  get env() { return this.sys.session.env; }

  /** Run a line (or a whole script text). Returns { lines:[{t,s}], code, editor?, clear? }. */
  run(text, { record = true } = {}) {
    const res = { lines: [], code: 0 };
    if (record && text.trim()) {
      this.sys.history.push(text);
      if (this.sys.history.length > 1000) this.sys.history.shift();
    }
    const outer = this.output;
    this.output = res;
    try {
      const ast = parseScript(text);
      res.code = this.execBlock(ast, null);
    } catch (e) {
      if (e instanceof ShellExit) { res.code = e.code; res.exit = true; }
      else if (e instanceof SyntaxError || e.shellSyntax) { this.emitErr(`bash: syntax error: ${e.message}`); res.code = 2; }
      else { this.emitErr(`bash: internal simulator error: ${e.message}`); res.code = 1; }
    }
    this.sys.lastExit = res.code;
    if (outer) this.output = outer; // nested runs (e.g. systemd starting a script) must not clobber the caller
    return res;
  }

  emit(text, stream = 'out') {
    if (text === '' || text === undefined) return;
    this.output.lines.push({ t: stream, s: text.endsWith('\n') ? text.slice(0, -1) : text });
  }
  emitErr(text) { this.emit(text, 'err'); }

  // ---------- control flow ----------
  execBlock(nodes, stdin) {
    let code = this.sys.lastExit;
    for (const node of nodes) code = this.execNode(node, stdin);
    return code;
  }

  execNode(node, stdin) {
    switch (node.type) {
      case 'cmd': return this.execLine(node.line, stdin);
      case 'if': {
        for (const br of node.branches) {
          if (this.execLine(br.cond, stdin) === 0) return this.execBlock(br.body, stdin);
        }
        return node.elseBody ? this.execBlock(node.elseBody, stdin) : 0;
      }
      case 'for': {
        const items = node.items === null ? this.positional.slice() : this.expandWords(lex(node.items, this).filter(t => t.kind === 'word'));
        let code = 0;
        for (const item of items) { this.setVar(node.variable, item); code = this.execBlock(node.body, stdin); }
        return code;
      }
      case 'while': {
        let code = 0, n = 0;
        while ((this.execLine(node.cond, stdin) === 0) !== node.until) {
          if (++n > MAX_LOOP) { this.emitErr(`bash: loop stopped after ${MAX_LOOP} iterations (simulator safety limit)`); return 1; }
          code = this.execBlock(node.body, stdin);
        }
        return code;
      }
      case 'func': this.functions[node.name] = node.body; return 0;
      case 'unsupported': this.emitErr(`bash: '${node.what}' is not supported by this simulator`); return 2;
      default: return 0;
    }
  }

  // ---------- one logical line: lists of pipelines ----------
  execLine(line, stdin = null) {
    const tokens = lex(line, this);
    const lists = splitLists(tokens);
    let code = this.sys.lastExit;
    let skip = false;
    for (const { pipeline, op, background } of lists) {
      if (!skip) {
        code = this.execPipeline(pipeline, stdin, background);
        this.sys.lastExit = code;
      }
      if (op === '&&') skip = code !== 0;
      else if (op === '||') skip = code === 0;
      else skip = false;
    }
    return code;
  }

  execPipeline(cmds, stdin, background) {
    let input = stdin;
    let code = 0;
    for (let i = 0; i < cmds.length; i++) {
      const last = i === cmds.length - 1;
      const r = this.execSimple(cmds[i], input, !last);
      code = r.code;
      input = r.stdout;
      if (last && r.stdout) this.emit(r.stdout);
    }
    if (background) {
      const p = { pid: this.sys.nextPid++, ppid: 3999, user: this.sys.session.user, state: 'S', cpu: 0, mem: 0, rssMb: 1, nice: 0, tty: 'pts/1', start: 'now', time: '0:00', cmd: cmds.map(c => c.words.map(w => w.text).join(' ')).join(' | ') };
      this.sys.processes.push(p);
      this.sys.jobs.push({ id: this.sys.jobs.length + 1, pid: p.pid, cmd: p.cmd });
      this.emit(`[${this.sys.jobs.length}] ${p.pid}`);
      this.emit('(simulator: background jobs are recorded but do not run concurrently)', 'err');
    }
    return code;
  }

  /** Execute one simple command. Returns { code, stdout } where stdout is captured text. */
  execSimple(cmd, stdin, piped) {
    let words = cmd.words;
    // Leading assignments
    const assigns = [];
    while (words.length && words[0].assign) { assigns.push(words[0]); words = words.slice(1); }
    let argv = this.expandWords(words);
    if (!argv.length) {
      for (const a of assigns) { const eq = a.text.indexOf('='); this.setVar(a.text.slice(0, eq), a.text.slice(eq + 1)); }
      return { code: 0, stdout: '' };
    }
    if (this.aliases[argv[0]]) argv = [...this.expandWords(lex(this.aliases[argv[0]]).filter(t => t.kind === 'word')), ...argv.slice(1)];
    const saved = {};
    for (const a of assigns) { const eq = a.text.indexOf('='); const k = a.text.slice(0, eq); saved[k] = this.env[k]; this.env[k] = a.text.slice(eq + 1); }

    let stdout = '';
    let stderrBuf = [];
    let stdinData = stdin;
    let stdoutTarget = null, stderrTarget = null, mergeErr = false;
    // Redirections
    for (const r of cmd.redirects) {
      const target = r.target === undefined ? undefined : this.expandWords([r.target])[0];
      if (r.op === '<') {
        try { stdinData = this.sys.fs.readFile(target, this.sys.session.cwd, currentUser(this.sys)); }
        catch (e) { this.emitErr(`bash: ${e.message}`); return { code: 1, stdout: '' }; }
      } else if (r.op === '>' || r.op === '>>') stdoutTarget = { path: target, append: r.op === '>>' };
      else if (r.op === '2>' || r.op === '2>>') stderrTarget = { path: target, append: r.op === '2>>' };
      else if (r.op === '2>&1') mergeErr = true;
      else if (r.op === '&>') { stdoutTarget = { path: target, append: false }; mergeErr = true; }
    }
    // Truncate output files before running (bash semantics: `sort f > f` empties f first).
    for (const t of [stdoutTarget, stderrTarget]) {
      if (t && !t.append && t.path !== '/dev/null') {
        const err = this.writeRedirect(t.path, '', false);
        if (err) { this.emitErr(`bash: ${err}`); return { code: 1, stdout: '' }; }
      }
    }
    const ctx = this.makeCtx(argv, stdinData, (s) => { stdout += s; }, (s) => { if (mergeErr) stdout += s; else stderrBuf.push(s); });
    let code;
    try { code = this.dispatch(argv, ctx); }
    catch (e) {
      if (e instanceof ShellExit || e instanceof FuncReturn) { this.restoreVars(saved); throw e; }
      if (e instanceof FsError) { ctx.error(`${argv[0]}: ${e.message}`); code = 1; }
      else { ctx.error(`${argv[0]}: simulator error: ${e.message}`); code = 1; }
    }
    this.restoreVars(saved);
    if (code && typeof code === 'object') {
      // Commands can ask the UI to do something interactive (open the editor, clear the screen).
      if (code.editor) this.output.editor = code;
      if (code.clear) this.output.clear = true;
      code = 0;
    }
    if (stdoutTarget) {
      if (stdoutTarget.path !== '/dev/null') {
        const err = this.writeRedirect(stdoutTarget.path, stdout, true);
        if (err) stderrBuf.push(`bash: ${err}\n`);
      }
      stdout = '';
    }
    const errText = stderrBuf.join('');
    if (errText) {
      if (stderrTarget) { if (stderrTarget.path !== '/dev/null') this.writeRedirect(stderrTarget.path, errText, true); }
      else this.emitErr(errText);
    }
    // Commands that print directly (e.g. inside functions) already emitted; piped output is returned.
    return { code: code ?? 0, stdout: piped || !stdoutTarget ? stdout : '' };
  }

  restoreVars(saved) {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete this.env[k]; else this.env[k] = v; }
  }

  writeRedirect(path, content, append) {
    const sys = this.sys;
    try {
      sys.fs.writeFile(path, sys.session.cwd, content, { user: currentUser(sys), append, umask: sys.session.umask });
      return null;
    } catch (e) { return e.message; }
  }

  dispatch(argv, ctx) {
    const name = argv[0];
    if (this.functions[name]) return this.callFunction(name, argv.slice(1), ctx);
    const builtin = BUILTINS[name];
    if (builtin) return builtin.call(this, ctx);
    if (name.includes('/')) return this.execPath(name, ctx);
    const cmd = this.registry.get(name);
    if (cmd) {
      if (!this.inPath(name)) { ctx.error(`bash: ${name}: command not found`); return 127; }
      return cmd.run(ctx);
    }
    if (this.registry.knownUnsupported(name)) {
      ctx.error(`bash: ${name}: real Linux command, but not implemented in this simulator. Type 'help' for supported commands.`);
      return 127;
    }
    ctx.error(`bash: ${name}: command not found`);
    return 127;
  }

  inPath(name) {
    const { fs } = this.sys;
    for (const dir of (this.env.PATH || '/usr/local/bin:/usr/bin:/usr/sbin').split(':')) {
      if (fs.tryResolve(`${dir}/${name}`)) return true;
    }
    // Commands provided by not-yet-installed packages are absent from PATH.
    return !this.registry.requiresBinary(name);
  }

  execPath(path, ctx) {
    const sys = this.sys;
    const user = currentUser(sys);
    const res = sys.fs.tryResolve(path, sys.session.cwd);
    if (!res) { ctx.error(`bash: ${path}: No such file or directory`); return 127; }
    if (res.node.type === S_IFDIR) { ctx.error(`bash: ${path}: Is a directory`); return 126; }
    if (!sys.fs.can(res.node, 'x', user)) { ctx.error(`bash: ${path}: Permission denied`); return 126; }
    const content = res.node.data || '';
    if (content.startsWith('\u007fELF')) {
      const cmd = this.registry.get(basename(res.path));
      return cmd ? cmd.run(ctx) : (ctx.error(`bash: ${path}: cannot execute simulated binary`), 126);
    }
    if (!sys.fs.can(res.node, 'r', user)) { ctx.error(`bash: ${path}: Permission denied`); return 126; }
    return this.runScriptText(content, path, ctx.args, ctx);
  }

  runScriptText(content, name, args, ctx) {
    if (this.depth > 20) { ctx.error('bash: maximum script nesting exceeded'); return 1; }
    const savedPos = this.positional, savedName = this.scriptName;
    this.positional = args.slice();
    this.scriptName = name;
    this.depth++;
    const outer = this.output;
    const inner = { lines: [], code: 0 };
    this.output = inner;
    let code;
    try { code = this.execBlock(parseScript(content), ctx.stdin); }
    catch (e) {
      if (e instanceof ShellExit) code = e.code;
      else if (e.shellSyntax || e instanceof SyntaxError) { this.emitErr(`${name}: syntax error: ${e.message}`); code = 2; }
      else throw e;
    } finally {
      this.depth--;
      this.positional = savedPos;
      this.scriptName = savedName;
      this.output = outer;
    }
    for (const l of inner.lines) (l.t === 'err' ? ctx.error : ctx.print)(l.s);
    return code;
  }

  callFunction(name, args, ctx) {
    const savedPos = this.positional;
    this.positional = args;
    const outer = this.output;
    const inner = { lines: [], code: 0 };
    this.output = inner;
    let code;
    this.depth++;
    try { code = this.execBlock(this.functions[name], ctx.stdin); }
    catch (e) { if (e instanceof FuncReturn) code = e.code; else throw e; }
    finally { this.positional = savedPos; this.output = outer; this.depth--; }
    for (const l of inner.lines) (l.t === 'err' ? ctx.error : ctx.print)(l.s);
    return code;
  }

  makeCtx(argv, stdin, writeOut, writeErr) {
    const sys = this.sys;
    const shell = this;
    return {
      sys, shell, stdin,
      name: argv[0],
      args: argv.slice(1),
      get user() { return currentUser(sys); },
      get cwd() { return sys.session.cwd; },
      fs: sys.fs,
      print: (s = '') => writeOut(String(s) + '\n'),
      write: (s) => writeOut(String(s)),
      error: (s) => writeErr(String(s).endsWith('\n') ? String(s) : String(s) + '\n'),
      abs: (p) => normalizePath(String(p).replace(/^~(?=\/|$)/, userByName(sys, sys.session.user)?.home || '/'), sys.session.cwd),
      isRoot: () => currentUser(sys).uid === 0,
      requireRoot(cmdName) {
        if (currentUser(sys).uid !== 0) { writeErr(`${cmdName || argv[0]}: Permission denied (are you root? try sudo)\n`); return false; }
        return true;
      }
    };
  }

  // ---------- variables & expansion ----------
  getVar(name) {
    const sys = this.sys;
    if (name === '?') return String(sys.lastExit);
    if (name === '$') return '3999';
    if (name === '#') return String(this.positional.length);
    if (name === '@' || name === '*') return this.positional.join(' ');
    if (name === '0') return this.scriptName;
    if (/^\d+$/.test(name)) return this.positional[Number(name) - 1] ?? '';
    if (name === 'PWD') return sys.session.cwd;
    if (name === 'USER' || name === 'LOGNAME') return sys.session.user;
    if (name === 'HOME') return this.env.HOME ?? userByName(sys, sys.session.user)?.home ?? '/';
    if (name === 'HOSTNAME') return sys.hostname;
    if (name === 'UID') return String(currentUser(sys).uid);
    if (name === 'SHELL') return '/bin/bash';
    if (name === 'RANDOM') return String(Math.floor(Math.random() * 32768));
    if (name === 'PATH' && this.env.PATH === undefined) return '/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin';
    return this.env[name] ?? '';
  }
  setVar(name, value) { this.env[name] = value; }

  /** Expand word tokens into argv: tilde, braces, globs (vars/substitution were done in the lexer). */
  expandWords(words) {
    const out = [];
    for (const w of words) {
      let variants = w.braceable ? braceExpand(w.text) : [w.text];
      for (let v of variants) {
        if (w.tilde && (v === '~' || v.startsWith('~/'))) v = (userByName(this.sys, this.sys.session.user)?.home || '/') + v.slice(1);
        if (w.glob && /[*?[]/.test(v)) {
          const matches = this.glob(v);
          if (matches.length) { out.push(...matches); continue; }
        }
        if (w.fromUnquotedVar && v === '') continue; // unquoted empty expansion disappears
        if (w.splitFields) out.push(...v.split(/\s+/).filter(Boolean));
        else out.push(v);
      }
    }
    return out;
  }

  glob(pattern) {
    const fs = this.sys.fs;
    const abs = pattern.startsWith('/');
    const parts = pattern.split('/').filter(Boolean);
    let bases = [abs ? '/' : this.sys.session.cwd];
    let prefixes = [abs ? '/' : ''];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const nextB = [], nextP = [];
      for (let k = 0; k < bases.length; k++) {
        const base = bases[k], prefix = prefixes[k];
        if (!/[*?[]/.test(part)) {
          const p = normalizePath(part, base);
          if (fs.exists(p)) { nextB.push(p); nextP.push(prefix + (prefix && !prefix.endsWith('/') ? '/' : '') + part); }
          continue;
        }
        const res = fs.tryResolve(base);
        if (!res || res.node.type !== S_IFDIR) continue;
        const re = globToRegex(part);
        for (const name of fs.list(res.node)) {
          if (name.startsWith('.') && !part.startsWith('.')) continue;
          if (re.test(name)) { nextB.push(normalizePath(name, base)); nextP.push(prefix + (prefix && !prefix.endsWith('/') ? '/' : '') + name); }
        }
      }
      bases = nextB; prefixes = nextP;
    }
    return prefixes.sort();
  }

  complete(line) {
    // Tab completion for command names (first word) and paths (other words).
    const m = /(\S*)$/.exec(line);
    const partial = m[1];
    const isFirst = line.trim() === partial;
    let candidates = [];
    if (isFirst && !partial.includes('/')) {
      candidates = [...new Set([...this.registry.names(), ...Object.keys(BUILTINS), ...Object.keys(this.functions)])].filter(n => n.startsWith(partial));
      candidates = candidates.map(c => c + ' ');
    } else {
      const expanded = partial.replace(/^~(?=\/|$)/, userByName(this.sys, this.sys.session.user)?.home || '/');
      const dir = expanded.includes('/') ? (expanded.endsWith('/') ? expanded : dirname(expanded.startsWith('/') ? expanded : normalizePath(expanded, '/').slice(1)) ) : '.';
      const dirPart = expanded.includes('/') ? expanded.slice(0, expanded.lastIndexOf('/') + 1) : '';
      const base = expanded.slice(dirPart.length);
      const res = this.sys.fs.tryResolve(dirPart || (dir === '.' ? '.' : dir), this.sys.session.cwd);
      if (res && res.node.type === S_IFDIR) {
        candidates = this.sys.fs.list(res.node).filter(n => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.'))).map(n => {
          const child = this.sys.fs.get(res.node.entries.get(n));
          return (partial.slice(0, partial.length - base.length)) + n + (child?.type === S_IFDIR ? '/' : ' ');
        });
      }
    }
    if (!candidates.length) return { line, options: [] };
    const common = candidates.reduce((a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });
    const newLine = line.slice(0, line.length - partial.length) + (candidates.length === 1 ? candidates[0] : common);
    return { line: newLine, options: candidates.length > 1 ? candidates.map(c => c.trim()) : [] };
  }
}

// ---------- lexer ----------
/**
 * Lex a line into tokens: { kind:'word', text, glob, assign, tilde, braceable, splitFields } | { kind:'op', op }.
 * When a shell is given, $VAR, $(...) and $((...)) are expanded during lexing.
 */
export function lex(line, shell = null) {
  const tokens = [];
  let i = 0;
  let cur = null;
  const startWord = () => { if (!cur) cur = { kind: 'word', text: '', glob: false, quoted: false, tilde: false, braceable: false, fromUnquotedVar: false, splitFields: false, start: i }; };
  const endWord = () => {
    if (cur) {
      cur.assign = !cur.quotedPrefix && /^[A-Za-z_][A-Za-z0-9_]*=/.test(cur.text);
      tokens.push(cur);
      cur = null;
    }
  };
  while (i < line.length) {
    const c = line[i];
    if (c === ' ' || c === '\t' || c === '\n') { endWord(); i++; continue; }
    if (c === '#' && !cur) break; // comment
    const op = OPS.find(o => line.startsWith(o, i));
    if (op && !(op === '&' && line[i + 1] === '>') ) {
      // "2>" only counts as an operator at word start
      if ((op === '2>' || op === '2>>' || op === '2>&1') && cur) { /* part of a word like file2>x */ }
      else { endWord(); tokens.push({ kind: 'op', op }); i += op.length; continue; }
    }
    if (op === '&>' && !cur) { endWord(); tokens.push({ kind: 'op', op: '&>' }); i += 2; continue; }
    startWord();
    if (c === '\\') { cur.text += line[i + 1] ?? ''; cur.quotedPrefix = cur.quotedPrefix || cur.text.length === 1; i += 2; continue; }
    if (c === "'") {
      const end = line.indexOf("'", i + 1);
      if (end < 0) throw shellSyntax('unexpected EOF while looking for matching `\'\'');
      cur.text += line.slice(i + 1, end);
      cur.quoted = true;
      i = end + 1;
      continue;
    }
    if (c === '"') {
      i++;
      let s = '';
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\' && ['"', '\\', '$', '`'].includes(line[i + 1])) { s += line[i + 1]; i += 2; continue; }
        if (line[i] === '$' && shell) { const r = expandDollar(line, i, shell); s += r.value; i = r.end; continue; }
        s += line[i++];
      }
      if (i >= line.length) throw shellSyntax('unexpected EOF while looking for matching `"\'');
      i++;
      cur.text += s;
      cur.quoted = true;
      continue;
    }
    if (c === '$' && shell) {
      const r = expandDollar(line, i, shell);
      if (r.value === '' && cur.text === '') cur.fromUnquotedVar = true;
      if (r.isSubst || r.isVar) cur.splitFields = true;
      cur.text += r.value;
      i = r.end;
      continue;
    }
    if (c === '`' && shell) {
      const end = line.indexOf('`', i + 1);
      if (end < 0) throw shellSyntax('unexpected EOF while looking for matching ``\'');
      cur.text += commandSubst(shell, line.slice(i + 1, end));
      cur.splitFields = true;
      i = end + 1;
      continue;
    }
    if (c === '*' || c === '?' || (c === '[' && line.indexOf(']', i) > i)) cur.glob = true;
    if (c === '{' && /^\{[^{}\s]*(,|\.\.)[^{}\s]*\}/.test(line.slice(i))) cur.braceable = true;
    if (c === '~' && cur.text === '') cur.tilde = true;
    cur.text += c;
    i++;
  }
  endWord();
  return tokens;
}

function shellSyntax(msg) { const e = new Error(msg); e.shellSyntax = true; return e; }

function expandDollar(line, i, shell) {
  const rest = line.slice(i + 1);
  if (rest.startsWith('((')) {
    let depth = 0, j = i + 1;
    for (; j < line.length; j++) {
      if (line[j] === '(') depth++;
      else if (line[j] === ')') { depth--; if (depth === 0) break; }
    }
    const expr = line.slice(i + 3, j - 1);
    return { value: String(arith(expr, shell)), end: j + 1, isSubst: true };
  }
  if (rest.startsWith('(')) {
    let depth = 0, j = i + 1, q = null;
    for (; j < line.length; j++) {
      const ch = line[j];
      if (q) { if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') q = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth === 0) break; }
    }
    if (j >= line.length) throw shellSyntax("unexpected EOF while looking for matching `)'");
    return { value: commandSubst(shell, line.slice(i + 2, j)), end: j + 1, isSubst: true };
  }
  if (rest.startsWith('{')) {
    const end = line.indexOf('}', i);
    const inner = line.slice(i + 2, end);
    let m;
    if ((m = /^#(\w+)$/.exec(inner))) return { value: String(shell.getVar(m[1]).length), end: end + 1, isVar: true };
    if ((m = /^(\w+):-(.*)$/.exec(inner))) return { value: shell.getVar(m[1]) || m[2], end: end + 1, isVar: true };
    return { value: shell.getVar(inner), end: end + 1, isVar: true };
  }
  const m = /^([A-Za-z_][A-Za-z0-9_]*|[0-9?#@*$])/.exec(rest);
  if (!m) return { value: '$', end: i + 1 };
  return { value: shell.getVar(m[1]), end: i + 1 + m[1].length, isVar: true };
}

function commandSubst(shell, text) {
  const outer = shell.output;
  const inner = { lines: [], code: 0 };
  shell.output = inner;
  try { shell.execBlock(parseScript(text), null); }
  finally { shell.output = outer; }
  for (const l of inner.lines.filter(l => l.t === 'err')) outer.lines.push(l);
  return inner.lines.filter(l => l.t === 'out').map(l => l.s).join('\n').replace(/\n+$/, '');
}

/** Integer arithmetic for $(( )): + - * / % ** comparisons && || ! and parentheses. */
export function arith(expr, shell) {
  const src = expr.replace(/\$?([A-Za-z_][A-Za-z0-9_]*)/g, (_m, v) => String(parseInt(shell ? shell.getVar(v) : 0, 10) || 0));
  const toks = src.match(/\d+|\*\*|==|!=|<=|>=|&&|\|\||[-+*/%()<>!]/g) || [];
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];
  const prec = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6, '**': 7 };
  const unary = () => {
    const t = next();
    if (t === '(') { const v = binary(0); next(); return v; }
    if (t === '-') return -unary();
    if (t === '+') return unary();
    if (t === '!') return unary() ? 0 : 1;
    if (t === undefined) throw shellSyntax('arithmetic: operand expected');
    if (!/^\d+$/.test(t)) throw shellSyntax(`arithmetic: syntax error near "${t}"`);
    return parseInt(t, 10);
  };
  const binary = (minPrec) => {
    let left = unary();
    while (peek() && prec[peek()] !== undefined && prec[peek()] >= minPrec) {
      const op = next();
      const right = binary(op === '**' ? prec[op] : prec[op] + 1);
      switch (op) {
        case '+': left += right; break; case '-': left -= right; break; case '*': left *= right; break;
        case '/': if (right === 0) throw shellSyntax('division by 0'); left = Math.trunc(left / right); break;
        case '%': if (right === 0) throw shellSyntax('division by 0'); left %= right; break;
        case '**': left = left ** right; break;
        case '==': left = +(left === right); break; case '!=': left = +(left !== right); break;
        case '<': left = +(left < right); break; case '>': left = +(left > right); break;
        case '<=': left = +(left <= right); break; case '>=': left = +(left >= right); break;
        case '&&': left = +(left && right); break; case '||': left = +(left || right); break;
      }
    }
    return left;
  };
  if (!toks.length) return 0;
  return binary(0);
}

export function globToRegex(glob) {
  let re = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '[') {
      const end = glob.indexOf(']', i + 1);
      if (end < 0) { re += '\\['; continue; }
      let cls = glob.slice(i + 1, end).replace(/^!/, '^').replace(/\\/g, '\\\\');
      re += `[${cls}]`;
      i = end;
    } else re += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(re + '$');
}

export function braceExpand(word) {
  const m = /^(.*?)\{([^{}]*)\}(.*)$/.exec(word);
  if (!m) return [word];
  const [, pre, body, post] = m;
  let items;
  const range = /^(-?\d+)\.\.(-?\d+)$/.exec(body) || /^([a-z])\.\.([a-z])$/i.exec(body);
  if (range) {
    const a = range[1], b = range[2];
    if (/^-?\d+$/.test(a)) {
      const s = +a, e = +b, step = s <= e ? 1 : -1;
      items = []; for (let n = s; step > 0 ? n <= e : n >= e; n += step) items.push(String(n));
      if (items.length > 10000) items = items.slice(0, 10000);
    } else {
      const s = a.charCodeAt(0), e = b.charCodeAt(0), step = s <= e ? 1 : -1;
      items = []; for (let n = s; step > 0 ? n <= e : n >= e; n += step) items.push(String.fromCharCode(n));
    }
  } else if (body.includes(',')) items = body.split(',');
  else return [word];
  return items.flatMap(it => braceExpand(pre + it + post));
}

// ---------- list / pipeline splitting ----------
function splitLists(tokens) {
  const lists = [];
  let pipeline = [];
  let cmd = { words: [], redirects: [] };
  const endCmd = () => {
    if (cmd.words.length || cmd.redirects.length) pipeline.push(cmd);
    cmd = { words: [], redirects: [] };
  };
  const endPipeline = (op, background = false) => {
    endCmd();
    if (pipeline.length) lists.push({ pipeline, op, background });
    else if (op === '&&' || op === '||' || op === '|') throw shellSyntax(`syntax error near unexpected token \`${op}'`);
    pipeline = [];
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === 'word') { cmd.words.push(t); continue; }
    switch (t.op) {
      case '|': if (!cmd.words.length) throw shellSyntax("syntax error near unexpected token `|'"); endCmd(); break;
      case ';': endPipeline(';'); break;
      case '&&': case '||': endPipeline(t.op); break;
      case '&': endPipeline(';', true); break;
      case '2>&1': cmd.redirects.push({ op: '2>&1' }); break;
      default: {
        const target = tokens[i + 1];
        if (!target || target.kind !== 'word') throw shellSyntax("syntax error near unexpected token `newline'");
        cmd.redirects.push({ op: t.op, target });
        i++;
      }
    }
  }
  endPipeline(null);
  return lists;
}

// ---------- script parsing (control flow) ----------
const KW_SPLIT = /^(then|do|else)\s+(.+)$/;

/** Split script text into statements at newlines and top-level ';' (respecting quotes and $( )). */
export function splitStatements(text) {
  const out = [];
  let cur = '', q = null, depth = 0;
  const push = () => { const s = cur.trim(); if (s) out.push(s); cur = ''; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { cur += c; if (c === '\\' && q === '"') { cur += text[++i] ?? ''; continue; } if (c === q) q = null; continue; }
    if (c === '\\') { cur += c + (text[i + 1] ?? ''); i++; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth = Math.max(0, depth - 1);
    if (c === '#' && (cur === '' || /\s$/.test(cur)) && depth === 0) { while (i < text.length && text[i] !== '\n') i++; push(); continue; }
    if ((c === '\n' || (c === ';' && text[i + 1] !== ';')) && depth === 0) { push(); continue; }
    cur += c;
  }
  push();
  // Separate leading keywords (then/do/else) from the command that follows on the same line.
  const result = [];
  for (const s of out) {
    let rest = s;
    let m;
    while ((m = KW_SPLIT.exec(rest))) { result.push(m[1]); rest = m[2].trim(); }
    // "{" after function header or "}" glued to a command
    if (/^(\w+)\s*\(\)\s*\{\s*(.*)$/.test(rest) || /^function\s+(\w+)\s*(\(\))?\s*\{\s*(.*)$/.test(rest)) {
      const mm = /^(?:function\s+)?(\w+)\s*(?:\(\))?\s*\{\s*(.*)$/.exec(rest);
      result.push(`__func__ ${mm[1]}`);
      if (mm[2]) result.push(mm[2]);
      continue;
    }
    result.push(rest);
  }
  return result;
}

export function parseScript(text) {
  const stmts = splitStatements(String(text));
  let pos = 0;
  const parseUntil = (terminators) => {
    const body = [];
    while (pos < stmts.length) {
      const s = stmts[pos];
      const first = s.split(/\s+/)[0];
      if (terminators.includes(first)) return body;
      pos++;
      if (first === 'if') {
        const node = { type: 'if', branches: [], elseBody: null };
        let cond = s.slice(2).trim();
        for (;;) {
          if (stmts[pos] !== 'then') throw shellSyntax("expected 'then'");
          pos++;
          const branchBody = parseUntil(['elif', 'else', 'fi']);
          node.branches.push({ cond, body: branchBody });
          const kw = stmts[pos]?.split(/\s+/)[0];
          if (kw === 'elif') { cond = stmts[pos].slice(4).trim(); pos++; continue; }
          if (kw === 'else') { pos++; node.elseBody = parseUntil(['fi']); }
          if (stmts[pos] !== 'fi') throw shellSyntax("expected 'fi'");
          pos++;
          break;
        }
        body.push(node);
      } else if (first === 'for') {
        const m = /^for\s+(\w+)(?:\s+in\s+(.*))?$/.exec(s);
        if (!m) throw shellSyntax('bad for loop (use: for VAR in LIST; do ...; done)');
        if (stmts[pos] !== 'do') throw shellSyntax("expected 'do'");
        pos++;
        const loopBody = parseUntil(['done']);
        if (stmts[pos] !== 'done') throw shellSyntax("expected 'done'");
        pos++;
        body.push({ type: 'for', variable: m[1], items: m[2] === undefined ? null : m[2], body: loopBody });
      } else if (first === 'while' || first === 'until') {
        const cond = s.slice(first.length).trim();
        if (stmts[pos] !== 'do') throw shellSyntax("expected 'do'");
        pos++;
        const loopBody = parseUntil(['done']);
        if (stmts[pos] !== 'done') throw shellSyntax("expected 'done'");
        pos++;
        body.push({ type: 'while', cond, body: loopBody, until: first === 'until' });
      } else if (first === '__func__') {
        const name = s.split(/\s+/)[1];
        const fnBody = parseUntil(['}']);
        if (stmts[pos] !== '}') throw shellSyntax("expected '}'");
        pos++;
        body.push({ type: 'func', name, body: fnBody });
      } else if (first === 'case') {
        while (pos < stmts.length && stmts[pos].split(/\s+/)[0] !== 'esac') pos++;
        pos++;
        body.push({ type: 'unsupported', what: 'case ... esac' });
      } else if (['then', 'do', 'done', 'fi', 'else', 'elif', '}', 'esac'].includes(first)) {
        throw shellSyntax(`syntax error near unexpected token \`${first}'`);
      } else if (/<<-?\s*['"]?\w+/.test(s)) {
        body.push({ type: 'unsupported', what: 'here-documents (<<EOF); use the editor (nano/vi) or echo/printf' });
      } else {
        body.push({ type: 'cmd', line: s });
      }
    }
    return body;
  };
  const ast = parseUntil([]);
  return ast;
}

// ---------- builtins ----------
const BUILTINS = {
  cd(ctx) {
    const sys = this.sys;
    let target = ctx.args[0];
    if (!target || target === '~') target = userByName(sys, sys.session.user)?.home || '/';
    else if (target === '-') { target = this.env.OLDPWD || sys.session.cwd; ctx.print(target); }
    const abs = ctx.abs(target);
    try {
      const res = sys.fs.resolve(abs, '/', { user: ctx.user });
      if (res.node.type !== S_IFDIR) { ctx.error(`bash: cd: ${target}: Not a directory`); return 1; }
      if (!sys.fs.can(res.node, 'x', ctx.user)) { ctx.error(`bash: cd: ${target}: Permission denied`); return 1; }
      this.env.OLDPWD = sys.session.cwd;
      sys.session.cwd = res.path;
      return 0;
    } catch (e) { ctx.error(`bash: cd: ${target}: ${FsError.text(e.code) || e.message}`); return 1; }
  },
  pwd(ctx) { ctx.print(this.sys.session.cwd); return 0; },
  export(ctx) {
    if (!ctx.args.length || ctx.args[0] === '-p') { for (const [k, v] of Object.entries(this.env)) ctx.print(`declare -x ${k}="${v}"`); return 0; }
    for (const a of ctx.args) { const eq = a.indexOf('='); if (eq > 0) this.setVar(a.slice(0, eq), a.slice(eq + 1)); else this.env[a] ??= ''; }
    return 0;
  },
  unset(ctx) { for (const a of ctx.args) { delete this.env[a]; delete this.functions[a]; } return 0; },
  local(ctx) { return BUILTINS.export.call(this, ctx); },
  readonly(ctx) { return BUILTINS.export.call(this, ctx); },
  alias(ctx) {
    if (!ctx.args.length) { for (const [k, v] of Object.entries(this.aliases)) ctx.print(`alias ${k}='${v}'`); return 0; }
    for (const a of ctx.args) {
      const eq = a.indexOf('=');
      if (eq > 0) this.aliases[a.slice(0, eq)] = a.slice(eq + 1);
      else if (this.aliases[a]) ctx.print(`alias ${a}='${this.aliases[a]}'`);
      else { ctx.error(`bash: alias: ${a}: not found`); return 1; }
    }
    return 0;
  },
  unalias(ctx) { for (const a of ctx.args) delete this.aliases[a]; return 0; },
  exit(ctx) {
    const code = Number(ctx.args[0] ?? this.sys.lastExit) || 0;
    if (this.depth > 0) throw new ShellExit(code);
    // Interactive exit: leave a su/sudo -i session if one is active.
    const sess = this.sys.session;
    if (sess.stack.length) {
      const prev = sess.stack.pop();
      sess.user = prev.user; sess.cwd = prev.cwd;
      ctx.print('logout');
      return 0;
    }
    ctx.print('logout (simulator: the session stays open — use the Reset button to restart the host)');
    return 0;
  },
  logout(ctx) { return BUILTINS.exit.call(this, ctx); },
  return(ctx) { throw new FuncReturn(Number(ctx.args[0] ?? this.sys.lastExit) || 0); },
  shift(ctx) { this.positional = this.positional.slice(Number(ctx.args[0] || 1)); return 0; },
  source(ctx) {
    const path = ctx.args[0];
    if (!path) { ctx.error('bash: source: filename argument required'); return 2; }
    try {
      const text = this.sys.fs.readFile(path, this.sys.session.cwd, ctx.user);
      const ast = parseScript(text);
      return this.execBlock(ast, ctx.stdin);
    } catch (e) { ctx.error(`bash: ${path}: ${e.message}`); return 1; }
  },
  '.'(ctx) { return BUILTINS.source.call(this, ctx); },
  history(ctx) {
    if (ctx.args[0] === '-c') { this.sys.history.length = 0; return 0; }
    const n = Number(ctx.args[0]) || this.sys.history.length;
    const start = Math.max(0, this.sys.history.length - n);
    this.sys.history.slice(start).forEach((h, i) => ctx.print(`${String(start + i + 1).padStart(5)}  ${h}`));
    return 0;
  },
  type(ctx) {
    let code = 0;
    for (const n of ctx.args) {
      if (this.aliases[n]) ctx.print(`${n} is aliased to \`${this.aliases[n]}'`);
      else if (this.functions[n]) ctx.print(`${n} is a function`);
      else if (BUILTINS[n] || ['echo', 'printf', 'test', '[', 'true', 'false', 'read', 'jobs', 'kill'].includes(n)) ctx.print(`${n} is a shell builtin`);
      else if (this.registry.get(n)) ctx.print(`${n} is ${this.registry.pathOf(n, this.sys)}`);
      else { ctx.error(`bash: type: ${n}: not found`); code = 1; }
    }
    return code;
  },
  jobs(ctx) { this.sys.jobs.forEach(j => ctx.print(`[${j.id}]+  Running                 ${j.cmd} &`)); return 0; },
  fg(ctx) { ctx.error('bash: fg: job control is not simulated (background jobs do not run concurrently here)'); return 1; },
  bg(ctx) { return BUILTINS.fg.call(this, ctx); },
  wait() { return 0; },
  read(ctx) {
    const vars = ctx.args.filter(a => !a.startsWith('-'));
    const line = (ctx.stdin || '').split('\n')[0] ?? '';
    if (!ctx.stdin) ctx.error('read: simulator has no interactive stdin; pipe input instead, e.g. echo value | ( read x )');
    const parts = line.split(/\s+/);
    vars.forEach((v, i) => this.setVar(v, i === vars.length - 1 ? parts.slice(i).join(' ') : parts[i] ?? ''));
    return ctx.stdin ? 0 : 1;
  },
  set(ctx) {
    if (!ctx.args.length) { for (const [k, v] of Object.entries(this.env)) ctx.print(`${k}=${v}`); return 0; }
    if (ctx.args[0] === '--') { this.positional = ctx.args.slice(1); return 0; }
    return 0; // -e/-u/-o pipefail are accepted but not enforced
  },
  ':'() { return 0; },
  true() { return 0; },
  false() { return 1; },
  umask(ctx) {
    const sess = this.sys.session;
    if (!ctx.args.length) { ctx.print(sess.umask.toString(8).padStart(4, '0')); return 0; }
    if (ctx.args[0] === '-S') {
      const m = sess.umask; const sym = (shift) => { const b = (~m >> shift) & 7; return (b & 4 ? 'r' : '') + (b & 2 ? 'w' : '') + (b & 1 ? 'x' : ''); };
      ctx.print(`u=${sym(6)},g=${sym(3)},o=${sym(0)}`); return 0;
    }
    if (!/^[0-7]{1,4}$/.test(ctx.args[0])) { ctx.error(`bash: umask: ${ctx.args[0]}: octal number out of range`); return 1; }
    sess.umask = parseInt(ctx.args[0], 8) & 0o777;
    return 0;
  }
};

export const SHELL_BUILTINS = Object.keys(BUILTINS);
export { S_IFREG };
