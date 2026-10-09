// File and directory commands operating on the simulated VFS with permission enforcement.
import { FsError, S_IFDIR, S_IFREG, S_IFLNK, modeString, applyChmod, normalizePath, basename, dirname } from '../vfs.js';
import { uname, gname, userByName, groupByName, supplementaryGids } from '../system.js';
import { getopt, human, fmtDate, columns } from './util.js';

const fail = (ctx, msg, code = 1) => { ctx.error(`${ctx.name}: ${msg}`); return code; };

function lsEntry(ctx, node, name, o) {
  const fs = ctx.fs;
  const sys = ctx.sys;
  if (!o.l) return o.Z ? `${node.ctx} ${name}` : name + (o.F ? suffixF(node) : '');
  const acl = node.acl ? '+' : '.';
  const size = node.type === 'b' || node.type === 'c' ? '8, 0' : o.h ? human(fs.usage(node)) : String(fs.usage(node));
  const link = node.type === S_IFLNK ? ` -> ${node.target}` : '';
  const cols = [modeString(node) + acl, node.nlink, uname(sys, node.uid), gname(sys, node.gid)];
  if (o.Z) cols.push(node.ctx);
  cols.push(size, fmtDate(node.mtime), name + link);
  return cols;
}

function suffixF(node) {
  if (node.type === S_IFDIR) return '/';
  if (node.type === S_IFLNK) return '@';
  if (node.mode & 0o111) return '*';
  return '';
}

export const fileCommands = [
  {
    name: 'ls', cat: 'Files', summary: 'List directory contents', usage: 'ls [-lahdiRZ1tSrF] [path...]', fidelity: 'functional',
    run(ctx) {
      const { o, rest, bad } = getopt(ctx.args, 'laAhdiRZ1tSrF', '', { all: 'a', 'human-readable': 'h', directory: 'd', inode: 'i', context: 'Z', recursive: 'R' });
      if (bad) return fail(ctx, `${bad}\nTry 'ls --help' for more information.`, 2);
      const fs = ctx.fs;
      const user = ctx.user;
      const targets = rest.length ? rest : ['.'];
      let code = 0;
      const files = [], dirs = [];
      for (const t of targets) {
        try {
          const lres = fs.resolve(t, ctx.cwd, { user, follow: false });
          // Like GNU ls: with -l or -d a symlink operand is shown as the link itself (unless "dir/").
          if (lres.node.type === S_IFLNK && (o.l || o.d) && !t.endsWith('/')) { files.push({ t, node: lres.node }); continue; }
          const res = fs.resolve(t, ctx.cwd, { user });
          if (res.node.type === S_IFDIR && !o.d) dirs.push({ t, res });
          else files.push({ t, node: res.node });
        } catch (e) {
          ctx.error(`ls: cannot access '${t}': ${FsError.text(e.code)}`);
          code = 2;
        }
      }
      const render = (items) => {
        const sorted = sortEntries(fs, items, o);
        const rows = sorted.map(({ node, name }) => {
          const e = lsEntry(ctx, node, name, o);
          return o.i ? (Array.isArray(e) ? [node.ino, ...e] : `${node.ino} ${e}`) : e;
        });
        if (o.l) ctx.print(columns(rows, { align: o.i ? ['r', '', 'r', '', '', 'r'] : ['', 'r', '', '', 'r'] }));
        else if (rows.length) ctx.print(o['1'] || o.Z ? rows.join('\n') : rows.join('  '));
      };
      if (files.length) render(files.map(f => ({ node: f.node, name: f.t })));
      const showHeader = targets.length > 1 || o.R;
      const listDir = (path, res, first) => {
        if (!fs.can(res.node, 'r', user)) { ctx.error(`ls: cannot open directory '${path}': Permission denied`); code = 2; return; }
        if (showHeader) ctx.print(`${first && !files.length ? '' : '\n'}${path}:`);
        let names = fs.list(res.node);
        if (!o.a && !o.A) names = names.filter(n => !n.startsWith('.'));
        const items = names.map(n => ({ node: fs.child(res.node, n), name: n }));
        if (o.a) items.unshift({ node: res.node, name: '.' }, { node: fs.get(res.node.entries.get('..')), name: '..' });
        if (o.l) {
          const total = items.reduce((s, i) => s + Math.ceil(fs.usage(i.node) / 4096) * 4, 0);
          ctx.print(`total ${total}`);
        }
        if (!fs.can(res.node, 'x', user) && user.uid !== 0) {
          if (o.l) { items.forEach(i => ctx.print(`ls: cannot access '${path}/${i.name}': Permission denied`)); return; }
        }
        render(items);
        if (o.R) {
          for (const it of sortEntries(fs, items, o)) {
            if (it.node.type === S_IFDIR && it.name !== '.' && it.name !== '..') {
              const p = path === '/' ? `/${it.name}` : `${path}/${it.name}`;
              listDir(p, { node: it.node }, false);
            }
          }
        }
      };
      dirs.forEach((d, i) => listDir(d.t, d.res, i === 0));
      return code;
    }
  },
  {
    name: 'mkdir', cat: 'Files', summary: 'Create directories', usage: 'mkdir [-p] [-m MODE] [-v] dir...', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'pv', 'm', { parents: 'p', mode: '=m' });
      if (!rest.length) return fail(ctx, 'missing operand', 1);
      let code = 0;
      for (const d of rest) {
        const abs = ctx.abs(d);
        try {
          if (o.p) {
            let cur = '';
            for (const part of abs.split('/').filter(Boolean)) {
              cur += '/' + part;
              const ex = ctx.fs.tryResolve(cur);
              if (ex) { if (ex.node.type !== S_IFDIR) throw new FsError('ENOTDIR', cur); continue; }
              ctx.fs.create(cur, '/', S_IFDIR, { user: ctx.user, umask: ctx.sys.session.umask });
              if (o.v) ctx.print(`mkdir: created directory '${cur}'`);
            }
          } else {
            ctx.fs.create(abs, '/', S_IFDIR, { user: ctx.user, umask: ctx.sys.session.umask });
            if (o.v) ctx.print(`mkdir: created directory '${d}'`);
          }
          if (o.m) { const n = ctx.fs.resolve(abs).node; n.mode = applyChmod(o.m, n.mode, true); }
        } catch (e) { ctx.error(`mkdir: cannot create directory '${d}': ${FsError.text(e.code) || e.message}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'rmdir', cat: 'Files', summary: 'Remove empty directories', usage: 'rmdir dir...', fidelity: 'functional',
    run(ctx) {
      if (!ctx.args.length) return fail(ctx, 'missing operand');
      let code = 0;
      for (const d of ctx.args.filter(a => !a.startsWith('-'))) {
        try {
          const res = ctx.fs.resolve(d, ctx.cwd, { user: ctx.user, follow: false });
          if (res.node.type !== S_IFDIR) throw new FsError('ENOTDIR', d);
          if (ctx.fs.list(res.node).length) throw new FsError('ENOTEMPTY', d);
          ctx.fs.checkWritableDir(res.parent, res.path, ctx.user);
          ctx.fs.unlink(res.parent, res.name);
        } catch (e) { ctx.error(`rmdir: failed to remove '${d}': ${FsError.text(e.code)}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'touch', cat: 'Files', summary: 'Create empty files or update timestamps', usage: 'touch file...', fidelity: 'functional',
    run(ctx) {
      const { rest } = getopt(ctx.args, 'acm', 'dt');
      if (!rest.length) return fail(ctx, 'missing file operand');
      let code = 0;
      for (const f of rest) {
        try {
          const res = ctx.fs.tryResolve(f, ctx.cwd, { user: ctx.user });
          if (res) {
            if (ctx.user.uid !== 0 && res.node.uid !== ctx.user.uid && !ctx.fs.can(res.node, 'w', ctx.user)) throw new FsError('EACCES', f);
            res.node.mtime = res.node.atime = ctx.sys.clock();
          } else ctx.fs.create(f, ctx.cwd, S_IFREG, { user: ctx.user, umask: ctx.sys.session.umask });
        } catch (e) { ctx.error(`touch: cannot touch '${f}': ${FsError.text(e.code)}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'cp', cat: 'Files', summary: 'Copy files and directories', usage: 'cp [-r] [-a|-p] [-v] src... dest', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'rRapvifnu', '', { recursive: 'r', archive: 'a', preserve: 'p', verbose: 'v' });
      if (rest.length < 2) return fail(ctx, rest.length ? `missing destination file operand after '${rest[0]}'` : 'missing file operand');
      const fs = ctx.fs;
      const dest = rest.pop();
      const destRes = fs.tryResolve(dest, ctx.cwd);
      if (rest.length > 1 && (!destRes || destRes.node.type !== S_IFDIR)) return fail(ctx, `target '${dest}' is not a directory`);
      let code = 0;
      const preserve = o.a || o.p;
      const copyNode = (src, srcPath, targetPath) => {
        if (!fs.can(src, 'r', ctx.user)) throw new FsError('EACCES', srcPath);
        if (src.type === S_IFDIR) {
          if (!(o.r || o.R || o.a)) { ctx.error(`cp: -r not specified; omitting directory '${srcPath}'`); code = 1; return; }
          let d = fs.tryResolve(targetPath);
          if (!d) fs.create(targetPath, '/', S_IFDIR, { user: ctx.user, umask: ctx.sys.session.umask });
          const dn = fs.resolve(targetPath).node;
          if (preserve) { dn.mode = src.mode; if (ctx.user.uid === 0) { dn.uid = src.uid; dn.gid = src.gid; } }
          if (o.a) dn.ctx = src.ctx;
          for (const name of fs.list(src)) copyNode(fs.child(src, name), `${srcPath}/${name}`, `${targetPath}/${name}`);
          return;
        }
        if (src.type === S_IFLNK && o.a) { if (!fs.tryResolve(targetPath, '/', { follow: false })) fs.create(targetPath, '/', S_IFLNK, { user: ctx.user, target: src.target }); return; }
        const content = typeof src.gen === 'function' ? src.gen() : src.data || '';
        const existing = fs.tryResolve(targetPath);
        const node = existing ? fs.writeFile(targetPath, '/', content, { user: ctx.user }) : fs.create(targetPath, '/', S_IFREG, { user: ctx.user, umask: ctx.sys.session.umask, mode: src.mode & 0o777, data: content });
        if (src.size !== undefined) node.size = src.size;
        if (preserve) { node.mode = src.mode; node.mtime = src.mtime; if (ctx.user.uid === 0) { node.uid = src.uid; node.gid = src.gid; } }
        if (o.a) node.ctx = src.ctx;
        if (o.v) ctx.print(`'${srcPath}' -> '${targetPath}'`);
      };
      for (const s of rest) {
        try {
          const src = fs.resolve(s, ctx.cwd, { user: ctx.user });
          let target = ctx.abs(dest);
          if (destRes && destRes.node.type === S_IFDIR) target = normalizePath(basename(src.path), destRes.path);
          if (src.node.type === S_IFDIR && (target + '/').startsWith(src.path + '/')) { ctx.error(`cp: cannot copy a directory, '${s}', into itself, '${dest}'`); code = 1; continue; }
          if (target === src.path) { ctx.error(`cp: '${s}' and '${dest}' are the same file`); code = 1; continue; }
          copyNode(src.node, s, target);
        } catch (e) { ctx.error(`cp: cannot ${e.code === 'ENOENT' ? 'stat' : 'create regular file'} '${e.path || s}': ${FsError.text(e.code) || e.message}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'mv', cat: 'Files', summary: 'Move/rename files (keeps inode and SELinux label)', usage: 'mv [-v] src... dest', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'vfinu', '');
      if (rest.length < 2) return fail(ctx, 'missing destination file operand');
      const fs = ctx.fs;
      const dest = rest.pop();
      const destRes = fs.tryResolve(dest, ctx.cwd);
      if (rest.length > 1 && (!destRes || destRes.node.type !== S_IFDIR)) return fail(ctx, `target '${dest}' is not a directory`);
      let code = 0;
      for (const s of rest) {
        try {
          const src = fs.resolve(s, ctx.cwd, { user: ctx.user, follow: false });
          let targetAbs = ctx.abs(dest);
          if (destRes && destRes.node.type === S_IFDIR) targetAbs = normalizePath(basename(src.path), destRes.path);
          if (src.node.type === S_IFDIR && (targetAbs + '/').startsWith(src.path + '/')) { ctx.error(`mv: cannot move '${s}' to a subdirectory of itself, '${dest}'`); code = 1; continue; }
          fs.checkWritableDir(src.parent, src.path, ctx.user);
          stickyCheck(ctx, src.parent, src.node, src.path);
          const { dir, name, abs } = fs.resolveParent(targetAbs, '/', ctx.user);
          fs.checkWritableDir(dir, abs, ctx.user);
          const existing = dir.entries.get(name);
          if (existing !== undefined) {
            const ex = fs.get(existing);
            if (ex.type === S_IFDIR) { if (src.node.type !== S_IFDIR) throw new FsError('EISDIR', abs); if (fs.list(ex).length) throw new FsError('ENOTEMPTY', abs); }
            fs.unlink(dir, name);
          }
          // rename(2): same inode keeps its SELinux context — a classic cause of AVC denials.
          src.parent.entries.delete(src.name);
          dir.entries.set(name, src.node.ino);
          if (src.node.type === S_IFDIR) { src.node.entries.set('..', dir.ino); src.parent.nlink--; dir.nlink++; }
          src.node.ctime = ctx.sys.clock();
          if (o.v) ctx.print(`renamed '${s}' -> '${abs}'`);
        } catch (e) { ctx.error(`mv: cannot move '${s}': ${FsError.text(e.code) || e.message}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'rm', cat: 'Files', summary: 'Remove files or directories', usage: 'rm [-r] [-f] [-v] path...', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'rRfivd', '', { recursive: 'r', force: 'f', verbose: 'v', 'no-preserve-root': 'nopreserve' });
      if (!rest.length) return o.f ? 0 : fail(ctx, 'missing operand');
      const fs = ctx.fs;
      let code = 0;
      for (const p of rest) {
        const abs = ctx.abs(p);
        if (abs === '/' && !o.nopreserve) { ctx.error("rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe"); code = 1; continue; }
        if (abs === '/') { ctx.error('rm: refusing to remove / in this simulator'); code = 1; continue; }
        try {
          const res = fs.resolve(abs, '/', { user: ctx.user, follow: false });
          if (res.node.type === S_IFDIR && !(o.r || o.R) && !(o.d && !fs.list(res.node).length)) { ctx.error(`rm: cannot remove '${p}': Is a directory`); code = 1; continue; }
          removeTree(ctx, res, p, o);
        } catch (e) {
          if (e.code === 'ENOENT' && o.f) continue;
          ctx.error(`rm: cannot remove '${e.path === abs || !e.path ? p : e.path}': ${FsError.text(e.code) || e.message}`); code = 1;
        }
      }
      return code;
    }
  },
  {
    name: 'ln', cat: 'Files', summary: 'Create hard or symbolic links', usage: 'ln [-s] [-f] target link_name', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'sfvnr', '', { symbolic: 's', force: 'f' });
      if (rest.length < 2) return fail(ctx, 'missing destination file operand');
      const [target, linkName] = rest;
      const fs = ctx.fs;
      try {
        let linkPath = ctx.abs(linkName);
        const ex = fs.tryResolve(linkPath);
        if (ex && ex.node.type === S_IFDIR) linkPath = normalizePath(basename(target), linkPath);
        if (o.f && fs.tryResolve(linkPath, '/', { follow: false })) { const r = fs.resolve(linkPath, '/', { follow: false }); fs.unlink(r.parent, r.name); }
        if (o.s) { fs.create(linkPath, '/', S_IFLNK, { user: ctx.user, target }); return 0; }
        const src = fs.resolve(target, ctx.cwd, { user: ctx.user });
        if (src.node.type === S_IFDIR) return fail(ctx, `${target}: hard link not allowed for directory`);
        const { dir, name, abs } = fs.resolveParent(linkPath, '/', ctx.user);
        if (dir.entries.has(name)) throw new FsError('EEXIST', abs);
        fs.checkWritableDir(dir, abs, ctx.user);
        fs.link(dir, name, src.node);
        src.node.ctime = ctx.sys.clock();
        return 0;
      } catch (e) { return fail(ctx, `failed to create ${o.s ? 'symbolic' : 'hard'} link '${linkName}': ${FsError.text(e.code) || e.message}`); }
    }
  },
  {
    name: 'readlink', cat: 'Files', summary: 'Print symlink target or canonical path', usage: 'readlink [-f] path', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'fem');
      const p = rest[0];
      if (!p) return fail(ctx, 'missing operand');
      if (o.f || o.e || o.m) { const r = ctx.fs.tryResolve(p, ctx.cwd); if (!r) return 1; ctx.print(r.path); return 0; }
      const r = ctx.fs.tryResolve(p, ctx.cwd, { follow: false });
      if (!r || r.node.type !== S_IFLNK) return 1;
      ctx.print(r.node.target);
      return 0;
    }
  },
  {
    name: 'realpath', cat: 'Files', summary: 'Print the resolved absolute path', usage: 'realpath path', fidelity: 'functional',
    run(ctx) { const r = ctx.fs.tryResolve(ctx.args[0] || '.', ctx.cwd); if (!r) return fail(ctx, `${ctx.args[0]}: No such file or directory`); ctx.print(r.path); return 0; }
  },
  {
    name: 'stat', cat: 'Files', summary: 'Display inode metadata', usage: 'stat [-c FORMAT] path...', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'L', 'c', { format: '=c' });
      if (!rest.length) return fail(ctx, 'missing operand');
      let code = 0;
      for (const p of rest) {
        try {
          const r = ctx.fs.resolve(p, ctx.cwd, { user: ctx.user, follow: !!o.L });
          const n = r.node;
          const sys = ctx.sys;
          const size = ctx.fs.usage(n);
          const typeName = { f: size ? 'regular file' : 'regular empty file', d: 'directory', l: 'symbolic link', c: 'character special file', b: 'block special file' }[n.type];
          const octal = (n.mode & 0o7777).toString(8).padStart(4, '0');
          if (o.c) {
            ctx.print(o.c.replace(/%([a-zA-Z])/g, (_m, f) => ({
              a: (n.mode & 0o7777).toString(8), A: modeString(n), U: uname(sys, n.uid), G: gname(sys, n.gid), u: n.uid, g: n.gid,
              s: size, i: n.ino, h: n.nlink, n: p, F: typeName, C: n.ctx, y: fmtDate(n.mtime, true), x: fmtDate(n.atime, true), z: fmtDate(n.ctime, true)
            }[f] ?? `%${f}`)));
            continue;
          }
          ctx.print(`  File: ${p}${n.type === S_IFLNK ? ` -> ${n.target}` : ''}`);
          ctx.print(`  Size: ${String(size).padEnd(10)}\tBlocks: ${String(Math.ceil(size / 4096) * 8).padEnd(10)} IO Block: 4096   ${typeName}`);
          ctx.print(`Device: fd00h/64768d\tInode: ${String(n.ino).padEnd(11)} Links: ${n.nlink}`);
          ctx.print(`Access: (${octal}/${modeString(n)})  Uid: (${String(n.uid).padStart(5)}/${uname(sys, n.uid).padStart(8)})   Gid: (${String(n.gid).padStart(5)}/${gname(sys, n.gid).padStart(8)})`);
          ctx.print(`Context: ${n.ctx}`);
          ctx.print(`Access: ${fmtDate(n.atime, true)}`);
          ctx.print(`Modify: ${fmtDate(n.mtime, true)}`);
          ctx.print(`Change: ${fmtDate(n.ctime, true)}`);
          ctx.print(` Birth: ${fmtDate(Math.min(n.ctime, n.mtime), true)}`);
        } catch (e) { ctx.error(`stat: cannot statx '${p}': ${FsError.text(e.code)}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'file', cat: 'Files', summary: 'Determine file type', usage: 'file path...', fidelity: 'partial',
    run(ctx) {
      let code = 0;
      for (const p of ctx.args.filter(a => !a.startsWith('-'))) {
        const r = ctx.fs.tryResolve(p, ctx.cwd, { follow: false });
        if (!r) { ctx.print(`${p}: cannot open \`${p}' (No such file or directory)`); code = 1; continue; }
        const n = r.node;
        let desc;
        if (n.type === S_IFDIR) desc = 'directory';
        else if (n.type === S_IFLNK) desc = `symbolic link to ${n.target}`;
        else if (n.type === 'c') desc = 'character special';
        else if (n.type === 'b') desc = 'block special';
        else {
          const d = typeof n.gen === 'function' ? n.gen() : n.data || '';
          if (!d && n.size === undefined) desc = 'empty';
          else if (d.startsWith('\u007fELF')) desc = 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, stripped';
          else if (d.startsWith('#!/bin/bash') || d.startsWith('#!/usr/bin/bash')) desc = 'Bourne-Again shell script, ASCII text executable';
          else if (d.startsWith('#!/bin/sh')) desc = 'POSIX shell script, ASCII text executable';
          else if (d.startsWith('#!/usr/bin/python')) desc = 'Python script, ASCII text executable';
          else if (d.startsWith('SIMTAR1')) desc = 'POSIX tar archive (GNU)';
          else if (d.startsWith('SIMGZ')) desc = 'gzip compressed data, original size modulo 2^32 ' + d.length;
          else if (/^<\??(html|xml|h1)/i.test(d)) desc = 'HTML document, ASCII text';
          else desc = [...d].some(ch => ch.charCodeAt(0) > 127) ? 'Unicode text, UTF-8 text' : 'ASCII text';
        }
        ctx.print(`${p}: ${desc}`);
      }
      return code;
    }
  },
  {
    name: 'chmod', cat: 'Permissions', summary: 'Change permission bits (octal or symbolic)', usage: 'chmod [-R] [-v] MODE path...', fidelity: 'functional',
    run(ctx) {
      const args = ctx.args.slice();
      let recursive = false, verbose = false;
      while (args.length && /^-[Rvcf]+$/.test(args[0])) { const f = args.shift(); recursive ||= f.includes('R'); verbose ||= f.includes('v'); }
      if (args.length < 2) return fail(ctx, `missing operand after '${args[0] ?? ''}'`);
      const spec = args.shift();
      let code = 0;
      for (const p of args) {
        try {
          const visit = (node, path) => {
            if (ctx.user.uid !== 0 && node.uid !== ctx.user.uid) throw new FsError('EPERM', path);
            if (ctx.fs.isReadOnly(path)) throw new FsError('EROFS', path);
            const before = node.mode;
            node.mode = applyChmod(spec, node.mode, node.type === S_IFDIR);
            node.ctime = ctx.sys.clock();
            if (verbose) ctx.print(`mode of '${path}' changed from ${(before & 0o7777).toString(8).padStart(4, '0')} to ${(node.mode & 0o7777).toString(8).padStart(4, '0')}`);
            if (recursive && node.type === S_IFDIR) for (const name of ctx.fs.list(node)) { const c = ctx.fs.child(node, name); if (c.type !== S_IFLNK) visit(c, `${path}/${name}`); }
          };
          const r = ctx.fs.resolve(p, ctx.cwd, { user: ctx.user });
          visit(r.node, p);
        } catch (e) { ctx.error(`chmod: ${e.code ? `changing permissions of '${e.path || p}': ${FsError.text(e.code)}` : e.message}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'chown', cat: 'Permissions', summary: 'Change file owner and group (root only)', usage: 'chown [-R] USER[:GROUP] path...', fidelity: 'functional',
    run(ctx) {
      const args = ctx.args.slice();
      let recursive = false;
      while (args.length && /^-[Rvhc]+$/.test(args[0])) recursive ||= args.shift().includes('R');
      if (args.length < 2) return fail(ctx, 'missing operand');
      const spec = args.shift();
      const [uPart, gPart] = spec.split(/[:.]/);
      const sys = ctx.sys;
      let uid = null, gid = null;
      if (uPart) { const u = userByName(sys, uPart) || sys.users.find(x => String(x.uid) === uPart); if (!u) return fail(ctx, `invalid user: '${spec}'`); uid = u.uid; if (spec.endsWith(':')) gid = u.gid; }
      if (gPart) { const g = groupByName(sys, gPart) || sys.groups.find(x => String(x.gid) === gPart); if (!g) return fail(ctx, `invalid group: '${spec}'`); gid = g.gid; }
      let code = 0;
      for (const p of args) {
        try {
          const r = ctx.fs.resolve(p, ctx.cwd, { user: ctx.user });
          const visit = (node, path) => {
            if (ctx.user.uid !== 0) {
              if (uid !== null && uid !== node.uid) throw new FsError('EPERM', path);
              if (node.uid !== ctx.user.uid || (gid !== null && ![ctx.user.gid, ...ctx.user.groups].includes(gid))) throw new FsError('EPERM', path);
            }
            if (uid !== null) node.uid = uid;
            if (gid !== null) node.gid = gid;
            node.ctime = sys.clock();
            if (recursive && node.type === S_IFDIR) for (const name of ctx.fs.list(node)) visit(ctx.fs.child(node, name), `${path}/${name}`);
          };
          visit(r.node, p);
        } catch (e) { ctx.error(`chown: changing ownership of '${e.path || p}': ${FsError.text(e.code)}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'chgrp', cat: 'Permissions', summary: 'Change group ownership', usage: 'chgrp [-R] GROUP path...', fidelity: 'functional',
    run(ctx) {
      const args = ctx.args.slice();
      const flags = [];
      while (args.length && /^-[Rv]+$/.test(args[0])) flags.push(args.shift());
      if (args.length < 2) return fail(ctx, 'missing operand');
      const [group, ...paths] = args;
      return ctx.shell.registry.get('chown').run({ ...ctx, name: 'chgrp', args: [...flags, `:${group}`, ...paths] });
    }
  },
  {
    name: 'getfacl', cat: 'Permissions', summary: 'Show POSIX ACLs', usage: 'getfacl path...', fidelity: 'partial',
    run(ctx) {
      let code = 0;
      for (const p of ctx.args.filter(a => !a.startsWith('-'))) {
        const r = ctx.fs.tryResolve(p, ctx.cwd);
        if (!r) { ctx.error(`getfacl: ${p}: No such file or directory`); code = 1; continue; }
        const n = r.node, sys = ctx.sys;
        const rwx = (b) => (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-');
        ctx.print(`# file: ${r.path.replace(/^\//, '')}\n# owner: ${uname(sys, n.uid)}\n# group: ${gname(sys, n.gid)}`);
        if (n.mode & 0o7000) ctx.print(`# flags: ${n.mode & 0o4000 ? 's' : '-'}${n.mode & 0o2000 ? 's' : '-'}${n.mode & 0o1000 ? 't' : '-'}`);
        ctx.print(`user::${rwx(n.mode >> 6)}`);
        for (const [uid, b] of Object.entries(n.acl?.users || {})) ctx.print(`user:${uname(sys, Number(uid))}:${rwx(b)}`);
        ctx.print(`group::${rwx(n.mode >> 3)}`);
        for (const [gid, b] of Object.entries(n.acl?.groups || {})) ctx.print(`group:${gname(sys, Number(gid))}:${rwx(b)}`);
        if (n.acl) ctx.print(`mask::${rwx(n.acl.mask ?? 7)}`);
        ctx.print(`other::${rwx(n.mode)}`);
        if (n.defaultAcl) {
          for (const [uid, b] of Object.entries(n.defaultAcl.users || {})) ctx.print(`default:user:${uname(sys, Number(uid))}:${rwx(b)}`);
          for (const [gid, b] of Object.entries(n.defaultAcl.groups || {})) ctx.print(`default:group:${gname(sys, Number(gid))}:${rwx(b)}`);
        }
        ctx.print('');
      }
      return code;
    }
  },
  {
    name: 'setfacl', cat: 'Permissions', summary: 'Set POSIX ACL entries (u:/g: entries, -x, -b, -d)', usage: 'setfacl [-R] [-d] -m u:USER:rwx|g:GROUP:rx path | -x u:USER path | -b path', fidelity: 'partial',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'bRd', 'mx', { modify: '=m', remove: '=x', 'remove-all': 'b', default: 'd' });
      if (!rest.length) return fail(ctx, 'no files specified');
      const sys = ctx.sys;
      const perm = (s) => (s.includes('r') ? 4 : 0) | (s.includes('w') ? 2 : 0) | (s.includes('x') || s.includes('X') ? 1 : 0);
      let code = 0;
      for (const p of rest) {
        try {
          const r = ctx.fs.resolve(p, ctx.cwd, { user: ctx.user });
          const apply = (n) => {
            if (ctx.user.uid !== 0 && n.uid !== ctx.user.uid) throw new FsError('EPERM', p);
            if (o.b) { delete n.acl; delete n.defaultAcl; return; }
            const target = o.d ? (n.defaultAcl ||= { users: {}, groups: {}, mask: 7 }) : (n.acl ||= { users: {}, groups: {}, mask: 7 });
            for (const spec of String(o.m || o.x || '').split(',').filter(Boolean)) {
              const [kind, name, ps] = spec.split(':');
              const k = kind.startsWith('u') ? 'users' : kind.startsWith('g') ? 'groups' : kind.startsWith('m') ? 'mask' : null;
              if (!k) throw new Error(`Option -m: Invalid argument near character 1`);
              if (k === 'mask') { target.mask = perm(name || ps || ''); continue; }
              const id = k === 'users' ? userByName(sys, name)?.uid : groupByName(sys, name)?.gid;
              if (id === undefined) throw new Error(`Option -${o.m ? 'm' : 'x'}: Invalid argument near character 3`);
              if (o.x) delete target[k][id]; else target[k][id] = perm(ps || '');
            }
            if (n.acl && !Object.keys(n.acl.users).length && !Object.keys(n.acl.groups).length) delete n.acl;
          };
          apply(r.node);
          if (o.R && r.node.type === S_IFDIR) ctx.fs.walk(r.path, '/', (n) => { if (n && n !== r.node) apply(n); });
        } catch (e) { ctx.error(`setfacl: ${p}: ${e.code ? FsError.text(e.code) : e.message}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'find', cat: 'Files', summary: 'Search for files by name, type, owner, permission, size', usage: 'find [path...] [-maxdepth N] [-name P] [-type f|d|l] [-user U] [-perm MODE] [-size N] [-exec CMD {} \\;] [-delete]', fidelity: 'partial',
    run(ctx) { return findCommand(ctx); }
  },
  {
    name: 'du', cat: 'Storage', summary: 'Estimate file space usage', usage: 'du [-s] [-h] [-a] [-c] [-d N] path...', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'shacxkm', 'd', { summarize: 's', 'human-readable': 'h', 'max-depth': '=d', all: 'a', total: 'c' });
      const paths = rest.length ? rest : ['.'];
      const fmt = (bytes) => o.h ? human(bytes) : String(Math.ceil(bytes / 1024));
      let grand = 0, code = 0;
      for (const p of paths) {
        const r = ctx.fs.tryResolve(p, ctx.cwd);
        if (!r) { ctx.error(`du: cannot access '${p}': No such file or directory`); code = 1; continue; }
        const maxDepth = o.s ? 0 : o.d !== undefined ? Number(o.d) : Infinity;
        const sizeOf = (node, path, depth) => {
          if (node.type !== S_IFDIR) {
            const b = Math.ceil(ctx.fs.usage(node) / 4096) * 4096;
            if (o.a && depth <= maxDepth) ctx.print(`${fmt(b)}\t${path}`);
            return b;
          }
          if (ctx.user.uid !== 0 && (!ctx.fs.can(node, 'r', ctx.user) || !ctx.fs.can(node, 'x', ctx.user))) { ctx.error(`du: cannot read directory '${path}': Permission denied`); code = 1; return 4096; }
          let total = 4096;
          for (const name of ctx.fs.list(node)) total += sizeOf(ctx.fs.child(node, name), path === '/' ? `/${name}` : `${path}/${name}`, depth + 1);
          if (depth <= maxDepth) ctx.print(`${fmt(total)}\t${path}`);
          return total;
        };
        grand += sizeOf(r.node, p.replace(/\/$/, '') || '/', 0);
      }
      if (o.c) ctx.print(`${fmt(grand)}\ttotal`);
      return code;
    }
  },
  {
    name: 'which', cat: 'Shell', summary: 'Locate a command in PATH', usage: 'which command...', fidelity: 'functional',
    run(ctx) {
      let code = 0;
      for (const n of ctx.args) {
        const p = ctx.shell.registry.pathOf(n, ctx.sys);
        if (p && ctx.shell.inPath(n)) ctx.print(p);
        else { ctx.error(`/usr/bin/which: no ${n} in (${ctx.shell.getVar('PATH')})`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'whereis', cat: 'Shell', summary: 'Locate binary and manual page', usage: 'whereis command', fidelity: 'partial',
    run(ctx) {
      for (const n of ctx.args) {
        const p = ctx.shell.registry.pathOf(n, ctx.sys);
        ctx.print(p ? `${n}: ${p} /usr/share/man/man1/${n}.1.gz` : `${n}:`);
      }
      return 0;
    }
  },
  {
    name: 'basename', cat: 'Text', summary: 'Strip directory (and suffix) from a path', usage: 'basename path [suffix]', fidelity: 'functional',
    run(ctx) { const [p, suf] = ctx.args; if (!p) return fail(ctx, 'missing operand'); let b = basename(p); if (suf && b.endsWith(suf) && b !== suf) b = b.slice(0, -suf.length); ctx.print(b); return 0; }
  },
  {
    name: 'dirname', cat: 'Text', summary: 'Strip last path component', usage: 'dirname path', fidelity: 'functional',
    run(ctx) { const p = ctx.args[0]; if (!p) return fail(ctx, 'missing operand'); ctx.print(p.includes('/') ? (dirname(p.startsWith('/') ? p : '/' + p).replace(/^\//, p.startsWith('/') ? '/' : '') || '.') : '.'); return 0; }
  },
  {
    name: 'tar', cat: 'Files', summary: 'Create, list and extract archives (gzip/bzip2 flags accepted)', usage: 'tar -c|-x|-t [-v] [-z|-j|-J] -f archive [-C dir] [paths...]', fidelity: 'partial',
    run(ctx) { return tarCommand(ctx); }
  },
  ...['gzip', 'bzip2', 'xz'].map(name => ({
    name, cat: 'Files', summary: `Compress files (${name} format is simulated)`, usage: `${name} [-d] [-k] file...`, fidelity: 'partial',
    run(ctx) { return compressCommand(ctx, name, false); }
  })),
  ...[['gunzip', 'gzip'], ['bunzip2', 'bzip2'], ['unxz', 'xz']].map(([name, base]) => ({
    name, cat: 'Files', summary: `Decompress ${base} files`, usage: `${name} file...`, fidelity: 'partial',
    run(ctx) { return compressCommand(ctx, base, true); }
  })),
  {
    name: 'locate', cat: 'Files', summary: 'Find files by name using the updatedb database', usage: 'locate PATTERN (run updatedb first)', fidelity: 'partial',
    run(ctx) {
      const db = ctx.sys.locateDb;
      if (!db) { ctx.error("locate: can not stat () `/var/lib/plocate/plocate.db': No such file or directory\n(run 'updatedb' as root first)"); return 1; }
      const pat = ctx.args.find(a => !a.startsWith('-')) || '';
      const hits = db.filter(p => p.includes(pat));
      hits.forEach(h => ctx.print(h));
      return hits.length ? 0 : 1;
    }
  },
  {
    name: 'updatedb', cat: 'Files', summary: 'Build the locate database', usage: 'updatedb', fidelity: 'partial', bin: '/usr/sbin/updatedb',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      const all = [];
      ctx.fs.walk('/', '/', (n, p) => { if (n && !p.startsWith('/proc') && !p.startsWith('/sys')) all.push(p); });
      ctx.sys.locateDb = all;
      return 0;
    }
  }
];

function sortEntries(fs, items, o) {
  const arr = items.slice();
  if (o.t) arr.sort((a, b) => b.node.mtime - a.node.mtime || a.name.localeCompare(b.name));
  else if (o.S) arr.sort((a, b) => fs.usage(b.node) - fs.usage(a.node) || a.name.localeCompare(b.name));
  else arr.sort((a, b) => (a.name === '.' ? -2 : a.name === '..' ? -1 : 0) - (b.name === '.' ? -2 : b.name === '..' ? -1 : 0) || a.name.replace(/^\./, '').localeCompare(b.name.replace(/^\./, '')));
  if (o.r) arr.reverse();
  return arr;
}

function stickyCheck(ctx, dir, node, path) {
  const u = ctx.user;
  if (u.uid !== 0 && (dir.mode & 0o1000) && node.uid !== u.uid && dir.uid !== u.uid) throw new FsError('EPERM', path);
}

function removeTree(ctx, res, display, o) {
  const fs = ctx.fs;
  fs.checkWritableDir(res.parent, res.path, ctx.user);
  stickyCheck(ctx, res.parent, res.node, display);
  if (res.node.type === S_IFDIR) {
    if (ctx.user.uid !== 0 && (!fs.can(res.node, 'w', ctx.user) || !fs.can(res.node, 'x', ctx.user)) && fs.list(res.node).length) throw new FsError('EACCES', `${display}`);
    for (const name of fs.list(res.node)) {
      const child = fs.resolve(`${res.path}/${name}`, '/', { follow: false });
      removeTree(ctx, child, `${display.replace(/\/$/, '')}/${name}`, o);
    }
    for (const [mp] of fs.mounts) if (mp === res.path) throw new FsError('EBUSY', display);
  }
  fs.unlink(res.parent, res.name);
  if (o.v) ctx.print(`removed ${res.node.type === S_IFDIR ? 'directory ' : ''}'${display}'`);
}

// ---------- find ----------
function findCommand(ctx) {
  const args = ctx.args.slice();
  const paths = [];
  while (args.length && !args[0].startsWith('-') && args[0] !== '!' && args[0] !== '(') paths.push(args.shift());
  if (!paths.length) paths.push('.');
  let maxDepth = Infinity, minDepth = 0;
  // Parse expression into a predicate tree with implicit -a, -o, ! and ( ).
  let pos = 0;
  let hasAction = false;
  const sys = ctx.sys;
  const toks = args;
  const parsePrimary = () => {
    const t = toks[pos++];
    if (t === '!' || t === '-not') { const p = parsePrimary(); return (n, path) => !p(n, path); }
    if (t === '(') { const e = parseOr(); pos++; return e; }
    const val = () => { const v = toks[pos++]; if (v === undefined) throw new Error(`missing argument to \`${t}'`); return v; };
    switch (t) {
      case '-name': { const re = globRe(val(), false); return (n, path) => re.test(basename(path)); }
      case '-iname': { const re = globRe(val(), true); return (n, path) => re.test(basename(path)); }
      case '-path': case '-wholename': { const re = globRe(val(), false); return (n, path) => re.test(path); }
      case '-type': { const ty = val(); return (n) => n.type === ty; }
      case '-user': { const u = val(); const uid = sys.users.find(x => x.name === u || String(x.uid) === u)?.uid; if (uid === undefined) throw new Error(`'${u}' is not the name of a known user`); return (n) => n.uid === uid; }
      case '-group': { const g = val(); const gid = sys.groups.find(x => x.name === g || String(x.gid) === g)?.gid; if (gid === undefined) throw new Error(`'${g}' is not the name of an existing group`); return (n) => n.gid === gid; }
      case '-nouser': return (n) => !sys.users.some(u => u.uid === n.uid);
      case '-nogroup': return (n) => !sys.groups.some(g => g.gid === n.gid);
      case '-uid': { const v = Number(val()); return (n) => n.uid === v; }
      case '-inum': { const v = Number(val()); return (n) => n.ino === v; }
      case '-links': { const v = Number(val()); return (n) => n.nlink === v; }
      case '-empty': return (n) => (n.type === S_IFDIR ? ctx.fs.list(n).length === 0 : n.type === S_IFREG && ctx.fs.usage(n) === 0);
      case '-perm': {
        const v = val();
        const mode = v.replace(/^[-/]/, '');
        const bits = /^[0-7]+$/.test(mode) ? parseInt(mode, 8) : applyChmod(mode, 0, false);
        if (v.startsWith('-')) return (n) => (n.mode & bits) === bits;
        if (v.startsWith('/')) return (n) => (n.mode & bits) !== 0 || bits === 0;
        return (n) => (n.mode & 0o7777) === bits;
      }
      case '-size': {
        const v = val();
        const m = /^([+-]?)(\d+)([ckMG]?)$/.exec(v);
        if (!m) throw new Error(`invalid -size argument '${v}'`);
        const unit = { c: 1, k: 1024, M: 1048576, G: 1073741824, '': 512 }[m[3]];
        const want = Number(m[2]);
        return (n) => {
          if (n.type === S_IFDIR) return false;
          const size = Math.ceil(ctx.fs.usage(n) / unit);
          return m[1] === '+' ? size > want : m[1] === '-' ? size < want : size === want;
        };
      }
      case '-mtime': case '-mmin': case '-atime': case '-ctime': {
        const v = val();
        const m = /^([+-]?)(\d+)$/.exec(v);
        const per = t === '-mmin' ? 60000 : 86400000;
        return (n) => {
          const age = Math.floor((sys.clock() - (t === '-atime' ? n.atime : t === '-ctime' ? n.ctime : n.mtime)) / per);
          return m[1] === '+' ? age > Number(m[2]) : m[1] === '-' ? age < Number(m[2]) : age === Number(m[2]);
        };
      }
      case '-newer': { const ref = ctx.fs.resolve(val(), ctx.cwd).node; return (n) => n.mtime > ref.mtime; }
      case '-maxdepth': maxDepth = Number(val()); return () => true;
      case '-mindepth': minDepth = Number(val()); return () => true;
      case '-xdev': case '-mount': return () => true;
      case '-print': hasAction = true; return (n, path) => { ctx.print(path); return true; };
      case '-ls': hasAction = true; return (n, path) => { ctx.print(`${String(n.ino).padStart(9)} ${String(Math.ceil(ctx.fs.usage(n) / 1024)).padStart(6)} ${modeString(n)} ${String(n.nlink).padStart(3)} ${uname(sys, n.uid).padEnd(8)} ${gname(sys, n.gid).padEnd(8)} ${String(ctx.fs.usage(n)).padStart(8)} ${fmtDate(n.mtime)} ${path}`); return true; };
      case '-delete': hasAction = true; return (n, path) => {
        try { const r = ctx.fs.resolve(path, '/', { follow: false }); if (r.node.type === S_IFDIR && ctx.fs.list(r.node).length) throw new FsError('ENOTEMPTY', path); removeTree(ctx, r, path, {}); } catch (e) { ctx.error(`find: cannot delete '${path}': ${FsError.text(e.code)}`); }
        return true;
      };
      case '-exec': case '-ok': {
        hasAction = true;
        const cmd = [];
        while (pos < toks.length && toks[pos] !== ';' && toks[pos] !== '+') cmd.push(toks[pos++]);
        const term = toks[pos++];
        if (!term) throw new Error("missing argument to `-exec'");
        if (term === '+') {
          const batch = [];
          deferred.push(() => { if (batch.length) runExec(ctx, cmd.flatMap(c => (c === '{}' ? batch : [c]))); });
          return (n, path) => { batch.push(path); return true; };
        }
        return (n, path) => runExec(ctx, cmd.map(c => c.replaceAll('{}', path))) === 0;
      }
      default: throw new Error(`unknown predicate \`${t}'`);
    }
  };
  const deferred = [];
  const parseAnd = () => {
    let left = parsePrimary();
    while (pos < toks.length && toks[pos] !== '-o' && toks[pos] !== '-or' && toks[pos] !== ')') {
      if (toks[pos] === '-a' || toks[pos] === '-and') pos++;
      const l = left, r = parsePrimary();
      left = (n, p) => l(n, p) && r(n, p);
    }
    return left;
  };
  const parseOr = () => {
    let left = parseAnd();
    while (toks[pos] === '-o' || toks[pos] === '-or') { pos++; const l = left, r = parseAnd(); left = (n, p) => l(n, p) || r(n, p); }
    return left;
  };
  let pred;
  try { pred = toks.length ? parseOr() : () => true; } catch (e) { ctx.error(`find: ${e.message}`); return 1; }
  let code = 0;
  for (const start of paths) {
    const r = ctx.fs.tryResolve(start, ctx.cwd);
    if (!r) { ctx.error(`find: '${start}': No such file or directory`); code = 1; continue; }
    const results = [];
    const walk = (node, path, depth) => {
      results.push([node, path, depth]);
      if (node.type !== S_IFDIR || depth >= maxDepth) return;
      if (ctx.user.uid !== 0 && (!ctx.fs.can(node, 'r', ctx.user) || !ctx.fs.can(node, 'x', ctx.user))) { ctx.error(`find: '${path}': Permission denied`); code = 1; return; }
      for (const name of ctx.fs.list(node)) {
        if (path === '/' && (name === 'proc' || name === 'sys')) { results.push([ctx.fs.child(node, name), `/${name}`, depth + 1]); continue; }
        walk(ctx.fs.child(node, name), path === '/' ? `/${name}` : `${path.replace(/\/$/, '')}/${name}`, depth + 1);
      }
    };
    walk(r.node, start, 0);
    for (const [node, path, depth] of results) {
      if (depth < minDepth || !ctx.fs.inodes.has(node.ino)) continue;
      const ok = pred(node, path);
      if (ok && !hasAction) ctx.print(path);
    }
  }
  deferred.forEach(fn => fn());
  return code;
}

function runExec(ctx, argv) {
  const shell = ctx.shell;
  let out = '';
  const sub = shell.makeCtx(argv, null, (s) => { out += s; }, (s) => ctx.error(s.replace(/\n$/, '')));
  const code = shell.dispatch(argv, sub);
  if (out) ctx.write(out);
  return code;
}

function globRe(g, icase) {
  let re = '^';
  for (const c of g) re += c === '*' ? '.*' : c === '?' ? '.' : c.replace(/[.+^${}()|\\[\]]/g, '\\$&');
  return new RegExp(re + '$', icase ? 'i' : '');
}

// ---------- tar / compression ----------
function tarCommand(ctx) {
  const args = ctx.args.slice();
  if (args[0] && !args[0].startsWith('-')) args[0] = '-' + args[0]; // "tar czf" old-style
  const { o, rest } = getopt(args, 'cxtvzjJp', 'fC', { create: 'c', extract: 'x', list: 't', verbose: 'v', gzip: 'z', file: '=f', directory: '=C' });
  const fs = ctx.fs;
  if (!o.f) { ctx.error('tar: Refusing to read/write archive from/to the terminal (use -f FILE)'); return 2; }
  const modes = [o.c, o.x, o.t].filter(Boolean).length;
  if (modes !== 1) { ctx.error("tar: You must specify one of the '-Acdtrux', '--delete' or '--test-label' options"); return 2; }
  if (o.c) {
    if (!rest.length) { ctx.error('tar: Cowardly refusing to create an empty archive'); return 2; }
    const entries = [];
    const base = o.C ? ctx.abs(o.C) : ctx.cwd;
    for (const p of rest) {
      const start = fs.tryResolve(p, base);
      if (!start) { ctx.error(`tar: ${p}: Cannot stat: No such file or directory`); continue; }
      const rel = p.replace(/^\/+/, '');
      if (p.startsWith('/')) ctx.error("tar: Removing leading `/' from member names");
      fs.walk(start.path, '/', (node, path) => {
        if (!node) return;
        const name = rel + path.slice(start.path.length);
        if (!fs.can(node, 'r', ctx.user)) { ctx.error(`tar: ${name}: Cannot open: Permission denied`); return; }
        entries.push({ name: name + (node.type === S_IFDIR ? '/' : ''), type: node.type, mode: node.mode, uid: node.uid, gid: node.gid, data: node.type === S_IFREG ? (node.data || '') : undefined, target: node.target });
        if (o.v) ctx.print(name + (node.type === S_IFDIR ? '/' : ''));
      });
    }
    fs.writeFile(o.f, ctx.cwd, 'SIMTAR1\n' + JSON.stringify({ compression: o.z ? 'gzip' : o.j ? 'bzip2' : o.J ? 'xz' : 'none', entries }), { user: ctx.user, umask: ctx.sys.session.umask });
    return 0;
  }
  let raw;
  try { raw = fs.readFile(o.f, ctx.cwd, ctx.user); } catch (e) { ctx.error(`tar: ${o.f}: Cannot open: ${FsError.text(e.code)}`); return 2; }
  if (!raw.startsWith('SIMTAR1\n')) { ctx.error('tar: This does not look like a tar archive'); return 2; }
  const arc = JSON.parse(raw.slice(8));
  if (o.t) {
    for (const e of arc.entries) ctx.print(o.v ? `${modeString({ type: e.type, mode: e.mode })} ${uname(ctx.sys, e.uid)}/${gname(ctx.sys, e.gid)} ${String((e.data || '').length).padStart(8)} 2026-10-09 09:00 ${e.name}` : e.name);
    return 0;
  }
  const dest = o.C ? ctx.abs(o.C) : ctx.cwd;
  for (const e of arc.entries) {
    const target = normalizePath(e.name, dest);
    try {
      if (e.type === S_IFDIR) { if (!fs.tryResolve(target)) fs.create(target, '/', S_IFDIR, { user: ctx.user, umask: 0, mode: e.mode & 0o7777 }); }
      else if (e.type === S_IFLNK) { if (!fs.tryResolve(target, '/', { follow: false })) fs.create(target, '/', S_IFLNK, { user: ctx.user, target: e.target }); }
      else {
        const n = fs.writeFile(target, '/', e.data || '', { user: ctx.user, umask: 0 });
        n.mode = o.p || ctx.user.uid === 0 ? e.mode : e.mode & ~ctx.sys.session.umask;
        if (ctx.user.uid === 0) { n.uid = e.uid; n.gid = e.gid; }
      }
      if (o.v) ctx.print(e.name);
    } catch (err) { ctx.error(`tar: ${e.name}: Cannot open: ${FsError.text(err.code)}`); }
  }
  return 0;
}

function compressCommand(ctx, kind, decompress) {
  const { o, rest } = getopt(ctx.args, 'dkvfc9l1');
  const ext = { gzip: '.gz', bzip2: '.bz2', xz: '.xz' }[kind];
  const magic = `SIM${kind.toUpperCase()}\n`;
  let code = 0;
  for (const p of rest) {
    try {
      const r = ctx.fs.resolve(p, ctx.cwd, { user: ctx.user });
      const data = ctx.fs.readFile(p, ctx.cwd, ctx.user);
      if (decompress || o.d) {
        if (!p.endsWith(ext)) { ctx.error(`${kind}: ${p}: unknown suffix -- ignored`); code = 1; continue; }
        if (!data.startsWith(magic)) { ctx.error(`${kind}: ${p}: not in ${kind} format`); code = 1; continue; }
        ctx.fs.writeFile(p.slice(0, -ext.length), ctx.cwd, data.slice(magic.length), { user: ctx.user });
      } else {
        if (p.endsWith(ext)) { ctx.error(`${kind}: ${p} already has ${ext} suffix -- unchanged`); code = 1; continue; }
        const n = ctx.fs.writeFile(p + ext, ctx.cwd, magic + data, { user: ctx.user });
        n.mode = r.node.mode;
        if (o.v) ctx.print(`${p}:\t ${Math.round(40 + Math.random() * 40)}.0% -- replaced with ${p}${ext}`);
      }
      if (!o.k && !o.c) { const rr = ctx.fs.resolve(p, ctx.cwd); ctx.fs.unlink(rr.parent, rr.name); }
    } catch (e) { ctx.error(`${kind}: ${p}: ${FsError.text(e.code) || e.message}`); code = 1; }
  }
  return code;
}

export { supplementaryGids };
