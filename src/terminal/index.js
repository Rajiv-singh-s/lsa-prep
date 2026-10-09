// Public API of the terminal simulator. Pure JS (no DOM) so labs and tests can drive it.
import { createSystem, generators, currentUser } from './system.js';
import { VFS } from './vfs.js';
import { Shell } from './shell.js';
import { Registry } from './commands/index.js';

export const SNAPSHOT_VERSION = 1;

export class Terminal {
  constructor({ clock } = {}) {
    this.clock = clock;
    this.reset();
  }

  reset() {
    this.sys = createSystem(this.clock);
    this.sys.fstabReloadHint = true;
    this.registry = new Registry(this.sys);
    this.shell = new Shell(this.sys, this.registry);
  }

  /** Run a command line. Returns { lines:[{t:'out'|'err', s}], code, editor?, clear? }. */
  run(line) {
    return this.shell.run(line);
  }

  complete(line) {
    return this.shell.complete(line);
  }

  prompt() {
    const s = this.sys.session;
    const home = this.sys.users.find(u => u.name === s.user)?.home;
    const dir = s.cwd === home ? '~' : s.cwd === '/' ? '/' : s.cwd.split('/').pop();
    return `[${s.user}@${this.sys.hostname.split('.')[0]} ${dir}]${s.user === 'root' ? '#' : '$'}`;
  }

  /** Save the editor buffer with the current user's permissions. */
  saveFile(path, content) {
    try {
      this.sys.fs.writeFile(path, '/', content.endsWith('\n') || !content ? content : content + '\n', { user: currentUser(this.sys), umask: this.sys.session.umask });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  readFileForEdit(path) {
    try { return { ok: true, content: this.sys.fs.readFile(path, '/', currentUser(this.sys)), exists: true }; }
    catch (e) { return e.code === 'ENOENT' ? { ok: true, content: '', exists: false } : { ok: false, error: e.message }; }
  }

  /** Serialise everything except functions; Maps/Sets are converted. */
  snapshot() {
    const { fs, clock, ...rest } = this.sys;
    void clock;
    return JSON.stringify({ v: SNAPSHOT_VERSION, fs: fs.toJSON(), state: rest, shell: { functions: this.shell.functions, aliases: this.shell.aliases } });
  }

  restore(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || data.v !== SNAPSHOT_VERSION) throw new Error('Unsupported terminal snapshot');
    const fresh = createSystem(this.clock);
    const sys = Object.assign(fresh, data.state);
    sys.fs = VFS.fromJSON(data.fs, fresh.clock, generators(sys));
    sys.clock = fresh.clock;
    this.sys = sys;
    this.registry = new Registry(sys);
    this.shell = new Shell(sys, this.registry);
    Object.assign(this.shell.functions, data.shell?.functions || {});
    Object.assign(this.shell.aliases, data.shell?.aliases || {});
  }
}

export function createTerminal(opts) {
  return new Terminal(opts);
}
