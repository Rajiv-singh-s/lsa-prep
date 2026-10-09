// Inode-based virtual filesystem for the simulator.
// Models: inodes, directory entries, hard links (shared inode, nlink), symlinks, permission
// bits incl. setuid/setgid/sticky, POSIX ACL subset, SELinux context labels and mount points.
// It is an educational model, not a kernel: no block allocation, no real I/O.

export const S_IFREG = 'f', S_IFDIR = 'd', S_IFLNK = 'l', S_IFCHR = 'c', S_IFBLK = 'b';

export class FsError extends Error {
  constructor(code, path) {
    super(`${path}: ${FsError.text(code)}`);
    this.code = code;
    this.path = path;
  }
  static text(code) {
    return {
      ENOENT: 'No such file or directory', ENOTDIR: 'Not a directory', EISDIR: 'Is a directory',
      EACCES: 'Permission denied', EEXIST: 'File exists', ENOTEMPTY: 'Directory not empty',
      EPERM: 'Operation not permitted', ELOOP: 'Too many levels of symbolic links', EINVAL: 'Invalid argument',
      EROFS: 'Read-only file system', ENOSPC: 'No space left on device', EBUSY: 'Device or resource busy'
    }[code] || code;
  }
}

export function splitPath(p) {
  return p.split('/').filter(Boolean);
}

export function normalizePath(path, cwd = '/') {
  const abs = path.startsWith('/') ? path : `${cwd}/${path}`;
  const out = [];
  for (const part of splitPath(abs)) {
    if (part === '.') continue;
    if (part === '..') out.pop(); else out.push(part);
  }
  return '/' + out.join('/');
}

export function dirname(p) {
  const parts = splitPath(p);
  parts.pop();
  return '/' + parts.join('/');
}

export function basename(p) {
  const parts = splitPath(p);
  return parts.length ? parts[parts.length - 1] : '/';
}

export class VFS {
  constructor(clock = () => Date.now()) {
    this.clock = clock;
    this.inodes = new Map();
    this.nextIno = 2;
    this.mounts = new Map(); // mountpoint path -> { source, fstype, options, readonly }
    this.mountRoots = new Map(); // mountpoint dir inode -> mounted filesystem root inode
    const root = this.newInode(S_IFDIR, 0o755, 0, 0, 'system_u:object_r:root_t:s0');
    this.rootIno = root.ino;
    root.entries.set('.', root.ino);
    root.entries.set('..', root.ino);
    root.nlink = 2;
  }

  newInode(type, mode, uid, gid, ctx) {
    const now = this.clock();
    const node = { ino: this.nextIno++, type, mode, uid, gid, nlink: 0, atime: now, mtime: now, ctime: now, ctx: ctx || 'unconfined_u:object_r:default_t:s0' };
    if (type === S_IFDIR) node.entries = new Map();
    if (type === S_IFREG) node.data = '';
    this.inodes.set(node.ino, node);
    return node;
  }

  get(ino) { return this.inodes.get(ino); }

  /** Follow a mount: a directory that is a mount point shows the mounted filesystem's root. */
  over(node) {
    while (node && this.mountRoots.has(node.ino)) node = this.get(this.mountRoots.get(node.ino));
    return node;
  }

  child(dir, name) {
    const ino = dir.entries.get(name);
    return ino === undefined ? undefined : this.over(this.get(ino));
  }

  // ---------- permissions ----------
  /** user: { uid, gid, groups:[gid...] } ; want: 'r' | 'w' | 'x' */
  can(node, want, user) {
    const bit = { r: 4, w: 2, x: 1 }[want];
    if (user.uid === 0) {
      if (want !== 'x') return true;
      return node.type === S_IFDIR || (node.mode & 0o111) !== 0;
    }
    let perms;
    if (node.uid === user.uid) perms = (node.mode >> 6) & 7;
    else if (node.acl?.users?.[user.uid] !== undefined) perms = node.acl.users[user.uid] & (node.acl.mask ?? 7);
    else {
      const inGroup = node.gid === user.gid || (user.groups || []).includes(node.gid);
      const aclGroups = Object.entries(node.acl?.groups || {}).filter(([g]) => user.gid === Number(g) || (user.groups || []).includes(Number(g)));
      if (inGroup || aclGroups.length) {
        let p = inGroup ? (node.mode >> 3) & 7 : 0;
        for (const [, gp] of aclGroups) p |= gp;
        if (node.acl) p &= (node.acl.mask ?? 7);
        perms = p;
      } else perms = node.mode & 7;
    }
    return (perms & bit) !== 0;
  }

  // ---------- path resolution ----------
  /**
   * Resolve a path. Returns { node, parent, name, path }.
   * opts.follow: follow a trailing symlink (default true); opts.user: enforce search (x) permission.
   */
  resolve(path, cwd = '/', opts = {}) {
    const { follow = true, user = null, depth = 0 } = opts;
    if (depth > 20) throw new FsError('ELOOP', path);
    const abs = normalizePath(path, cwd);
    const parts = splitPath(abs);
    let node = this.over(this.get(this.rootIno));
    let parent = node;
    let curPath = '/';
    for (let i = 0; i < parts.length; i++) {
      if (node.type !== S_IFDIR) throw new FsError('ENOTDIR', abs);
      if (user && !this.can(node, 'x', user)) throw new FsError('EACCES', abs);
      const ino = node.entries.get(parts[i]);
      if (ino === undefined) throw new FsError('ENOENT', abs);
      parent = node;
      let child = parts[i] === '..' ? this.get(ino) : this.over(this.get(ino));
      const last = i === parts.length - 1;
      const childPath = curPath === '/' ? `/${parts[i]}` : `${curPath}/${parts[i]}`;
      if (child.type === S_IFLNK && (!last || follow)) {
        const target = child.target.startsWith('/') ? child.target : normalizePath(child.target, curPath);
        const rest = parts.slice(i + 1).join('/');
        return this.resolve(rest ? `${target}/${rest}` : target, '/', { follow, user, depth: depth + 1 });
      }
      node = child;
      curPath = childPath;
    }
    return { node, parent, name: parts.length ? parts[parts.length - 1] : '/', path: curPath };
  }

  exists(path, cwd = '/') {
    try { this.resolve(path, cwd); return true; } catch { return false; }
  }

  tryResolve(path, cwd = '/', opts = {}) {
    try { return this.resolve(path, cwd, opts); } catch { return null; }
  }

  /** Resolve the parent directory of a path that may not exist yet. */
  resolveParent(path, cwd, user) {
    const abs = normalizePath(path, cwd);
    if (abs === '/') throw new FsError('EEXIST', '/');
    const { node } = this.resolve(dirname(abs), '/', { user });
    if (node.type !== S_IFDIR) throw new FsError('ENOTDIR', abs);
    return { dir: node, name: basename(abs), abs };
  }

  isReadOnly(abs) {
    let best = null;
    for (const mp of this.mounts.keys()) {
      if ((abs === mp || abs.startsWith(mp === '/' ? '/' : mp + '/')) && (!best || mp.length > best.length)) best = mp;
    }
    return best ? !!this.mounts.get(best).readonly : false;
  }

  // ---------- mutation ----------
  link(dir, name, node) {
    dir.entries.set(name, node.ino);
    node.nlink++;
    if (node.type === S_IFDIR) {
      node.entries.set('.', node.ino);
      node.entries.set('..', dir.ino);
      node.nlink++;
      dir.nlink++;
    }
    dir.mtime = dir.ctime = this.clock();
  }

  unlink(dir, name) {
    const ino = dir.entries.get(name);
    const node = this.get(ino);
    if (node?.openBy?.length && node.nlink <= 1) {
      const dirPath = this.pathOf(dir.ino);
      node.deletedPath = (dirPath === '/' ? '' : dirPath) + '/' + name;
    }
    dir.entries.delete(name);
    dir.mtime = dir.ctime = this.clock();
    if (!node) return;
    node.nlink--;
    if (node.type === S_IFDIR) { node.nlink = 0; dir.nlink--; }
    node.ctime = this.clock();
    if (node.nlink <= 0 && !node.openBy?.length) this.freeTree(node);
  }

  freeTree(node) {
    if (node.type === S_IFDIR) {
      for (const [n, ino] of node.entries) if (n !== '.' && n !== '..') { const c = this.get(ino); if (c) { c.nlink--; if (c.nlink <= 0) this.freeTree(c); } }
    }
    this.inodes.delete(node.ino);
  }

  checkWritableDir(dir, abs, user) {
    if (this.isReadOnly(abs)) throw new FsError('EROFS', abs);
    if (user && (!this.can(dir, 'w', user) || !this.can(dir, 'x', user))) throw new FsError('EACCES', abs);
  }

  /** Create file/dir/symlink with umask and parent-directory inheritance (setgid + SELinux type). */
  create(path, cwd, type, { user, mode, umask = 0o022, target = '', data = '', ctx } = {}) {
    const { dir, name, abs } = this.resolveParent(path, cwd, user);
    if (dir.entries.has(name)) throw new FsError('EEXIST', abs);
    this.checkWritableDir(dir, abs, user);
    const base = mode ?? (type === S_IFDIR ? 0o777 : type === S_IFLNK ? 0o777 : 0o666);
    const finalMode = type === S_IFLNK ? 0o777 : (base & ~umask) & 0o7777;
    const uid = user ? user.uid : 0;
    // setgid directory: new entries inherit the directory's group; subdirectories inherit setgid too.
    const sgid = (dir.mode & 0o2000) !== 0;
    const gid = sgid ? dir.gid : (user ? user.gid : 0);
    const node = this.newInode(type, finalMode | (type === S_IFDIR && sgid ? 0o2000 : 0), uid, gid, ctx || dir.ctx);
    if (type === S_IFLNK) node.target = target;
    if (type === S_IFREG) node.data = data;
    if (dir.defaultAcl && type !== S_IFLNK) node.acl = structuredClone(dir.defaultAcl);
    if (dir.defaultAcl && type === S_IFDIR) node.defaultAcl = structuredClone(dir.defaultAcl);
    this.link(dir, name, node);
    return node;
  }

  readFile(path, cwd, user) {
    const { node, path: p } = this.resolve(path, cwd, { user });
    if (node.type === S_IFDIR) throw new FsError('EISDIR', p);
    if (user && !this.can(node, 'r', user)) throw new FsError('EACCES', p);
    node.atime = this.clock();
    return typeof node.gen === 'function' ? node.gen() : (node.data ?? '');
  }

  writeFile(path, cwd, content, { user, append = false, umask = 0o022 } = {}) {
    let res = this.tryResolve(path, cwd, { user });
    if (!res) {
      const node = this.create(path, cwd, S_IFREG, { user, umask, data: content });
      return node;
    }
    const { node, path: p } = res;
    if (node.type === S_IFDIR) throw new FsError('EISDIR', p);
    if (this.isReadOnly(p)) throw new FsError('EROFS', p);
    if (node.readonlyGen) throw new FsError('EPERM', p);
    if (user && !this.can(node, 'w', user)) throw new FsError('EACCES', p);
    node.data = append ? (node.data || '') + content : content;
    node.mtime = node.ctime = this.clock();
    return node;
  }

  list(dirNode) {
    return [...dirNode.entries.keys()].filter(n => n !== '.' && n !== '..').sort();
  }

  /** Absolute path of an inode (first match) — used for diagnostics. */
  pathOf(ino) {
    const walk = (dirIno, prefix, seen) => {
      const dir = this.get(dirIno);
      for (const [n, child] of dir.entries) {
        if (n === '.' || n === '..') continue;
        const p = prefix === '/' ? `/${n}` : `${prefix}/${n}`;
        if (child === ino || this.mountRoots.get(child) === ino) return p;
        const c = this.over(this.get(child));
        if (c?.type === S_IFDIR && !seen.has(c.ino)) { seen.add(c.ino); const r = walk(c.ino, p, seen); if (r) return r; }
      }
      return null;
    };
    return ino === this.rootIno ? '/' : walk(this.over(this.get(this.rootIno)).ino, '/', new Set());
  }

  walk(path, cwd, fn, { user, maxDepth = Infinity } = {}) {
    const start = this.resolve(path, cwd);
    const visit = (node, p, depth) => {
      fn(node, p, depth);
      if (node.type !== S_IFDIR || depth >= maxDepth) return;
      if (user && (!this.can(node, 'r', user) || !this.can(node, 'x', user))) { fn(null, p, depth, 'EACCES'); return; }
      for (const name of this.list(node)) {
        const child = this.child(node, name);
        if (!child) continue;
        visit(child, p === '/' ? `/${name}` : `${p}/${name}`, depth + 1);
      }
    };
    visit(start.node, start.path, 0);
  }

  usage(node) {
    // Apparent size in bytes; directories count 4096 like ext4/xfs block-sized dirs.
    if (node.type === S_IFDIR) return 4096;
    if (node.type === S_IFLNK) return node.target.length;
    if (node.size !== undefined) return node.size;
    return new TextEncoder().encode(typeof node.gen === 'function' ? node.gen() : node.data || '').length;
  }

  // ---------- serialization (for save / restore) ----------
  toJSON() {
    const inodes = [];
    for (const n of this.inodes.values()) {
      if (n.gen) { inodes.push({ ...n, gen: undefined, genKey: n.genKey, entries: undefined }); continue; }
      inodes.push({ ...n, entries: n.entries ? [...n.entries] : undefined });
    }
    return { inodes, nextIno: this.nextIno, rootIno: this.rootIno, mounts: [...this.mounts], mountRoots: [...this.mountRoots] };
  }

  static fromJSON(json, clock, generators = {}) {
    const v = new VFS(clock);
    v.inodes = new Map();
    for (const raw of json.inodes) {
      const n = { ...raw };
      if (raw.entries) n.entries = new Map(raw.entries); else delete n.entries;
      if (raw.genKey && generators[raw.genKey]) n.gen = generators[raw.genKey]; else delete n.gen;
      v.inodes.set(n.ino, n);
    }
    v.nextIno = json.nextIno;
    v.rootIno = json.rootIno;
    v.mounts = new Map(json.mounts);
    v.mountRoots = new Map(json.mountRoots || []);
    return v;
  }
}

// ---------- mode helpers ----------
export function modeString(node) {
  const t = { f: '-', d: 'd', l: 'l', c: 'c', b: 'b' }[node.type] || '-';
  const m = node.mode;
  const trip = (shift, special, ch) => {
    const r = (m >> shift) & 4 ? 'r' : '-';
    const w = (m >> shift) & 2 ? 'w' : '-';
    const xBit = (m >> shift) & 1;
    let x = xBit ? 'x' : '-';
    if (m & special) x = xBit ? ch : ch.toUpperCase();
    return r + w + x;
  };
  return t + trip(6, 0o4000, 's') + trip(3, 0o2000, 's') + trip(0, 0o1000, 't');
}

/** Apply chmod spec (octal or symbolic, comma-separated) to a mode. Returns new mode or throws. */
export function applyChmod(spec, mode, isDir) {
  if (/^[0-7]{1,4}$/.test(spec)) {
    const v = parseInt(spec, 8);
    // GNU chmod keeps setuid/setgid on directories when only 3 octal digits are given.
    if (spec.length <= 3 && isDir) return (mode & 0o6000) | v;
    return v;
  }
  let result = mode;
  for (const clause of spec.split(',')) {
    const m = /^([ugoa]*)([+\-=])([rwxXstugo]*)$/.exec(clause);
    if (!m) throw new Error(`invalid mode: '${spec}'`);
    const who = m[1] || 'a';
    const op = m[2];
    const permsStr = m[3];
    const masks = { u: 0o4700, g: 0o2070, o: 0o1007 };
    let bits = 0;
    for (const p of permsStr) {
      if (p === 'r') bits |= 0o444;
      else if (p === 'w') bits |= 0o222;
      else if (p === 'x') bits |= 0o111;
      else if (p === 'X') { if (isDir || (mode & 0o111)) bits |= 0o111; }
      else if (p === 's') bits |= 0o6000;
      else if (p === 't') bits |= 0o1000;
    }
    let mask = 0;
    for (const w of who === 'a' ? 'ugo' : who) mask |= masks[w];
    if (!m[1] && (op === '+' || op === '=')) {
      // no "who": umask would apply in real chmod; we treat as 'a' (common case)
    }
    const eff = bits & mask;
    if (op === '+') result |= eff;
    else if (op === '-') result &= ~eff;
    else { result = (result & ~mask) | eff; }
  }
  return result & 0o7777;
}
