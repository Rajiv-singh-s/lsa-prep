// Storage: disks, GPT partitions, filesystems with their own directory trees, fstab, LVM, swap, NFS.
// Sizes are tracked in MiB. Destructive commands still require the usual "force" flags.
import { S_IFDIR, S_IFBLK, normalizePath } from '../vfs.js';
import { getopt, columns, parseSize, mibHuman } from './util.js';
import { resolveName } from './network.js';

const fail = (ctx, msg, code = 1) => { ctx.error(`${ctx.name}: ${msg}`); return code; };
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

/** Canonical device path: /dev/vg/lv and /dev/mapper/vg-lv both map to the mapper name. */
export function canonDev(sys, dev) {
  if (!dev) return dev;
  let m = /^\/dev\/mapper\/([\w.+]+)-([\w.+]+)$/.exec(dev);
  if (m) return dev;
  m = /^\/dev\/([\w.+]+)\/([\w.+]+)$/.exec(dev);
  if (m && sys.storage.lvs[`${m[1]}/${m[2]}`]) return `/dev/mapper/${m[1]}-${m[2]}`;
  return dev;
}

export function deviceExists(sys, dev) {
  const st = sys.storage;
  const d = canonDev(sys, dev);
  const name = d.replace('/dev/', '');
  if (st.disks[name]) return { kind: 'disk', size: st.disks[name].size };
  for (const [dn, disk] of Object.entries(st.disks)) { const p = disk.partitions.find(x => x.name === name); if (p) return { kind: 'part', size: p.size, disk: dn, part: p }; }
  const m = /^\/dev\/mapper\/([\w.+]+)-([\w.+]+)$/.exec(d);
  if (m && st.lvs[`${m[1]}/${m[2]}`]) return { kind: 'lvm', size: st.lvs[`${m[1]}/${m[2]}`].size, lv: st.lvs[`${m[1]}/${m[2]}`] };
  return null;
}

export function deviceBySpec(sys, spec) {
  const st = sys.storage;
  if (/^UUID=/.test(spec)) { const u = spec.slice(5).replace(/"/g, ''); return Object.entries(st.filesystems).find(([, f]) => f.uuid === u)?.[0] || null; }
  if (/^LABEL=/.test(spec)) { const l = spec.slice(6).replace(/"/g, ''); return Object.entries(st.filesystems).find(([, f]) => f.label === l)?.[0] || null; }
  const d = canonDev(sys, spec);
  return deviceExists(sys, d) ? d : null;
}

function mountedAt(sys, dev) {
  for (const [mp, m] of sys.fs.mounts) if (canonDev(sys, m.source) === dev) return mp;
  return null;
}

function vgFree(sys, vg) {
  const st = sys.storage;
  const size = st.vgs[vg].pvs.reduce((s, p) => s + st.pvs[p].size, 0);
  const used = Object.values(st.lvs).filter(l => l.vg === vg).reduce((s, l) => s + l.size, 0);
  return { size, free: size - used };
}

const lvmSize = (mib) => { const g = mib / 1024; return g >= 1 ? `${Number.isInteger(g) ? g.toFixed(2) : '<' + (Math.ceil(g * 100) / 100).toFixed(2)}g` : `${mib.toFixed(2)}m`; };

/** Walk a filesystem's own tree (not crossing into other mounts) to compute dynamic usage. */
function treeUsage(sys, rootIno) {
  let bytes = 0, inodes = 0;
  const seen = new Set();
  const visit = (ino) => {
    if (seen.has(ino)) return;
    seen.add(ino);
    const n = sys.fs.get(ino);
    if (!n) return;
    inodes++;
    if (n.type === 'f') bytes += sys.fs.usage(n);
    if (n.type === S_IFDIR) for (const [name, c] of n.entries) if (name !== '.' && name !== '..') visit(c);
  };
  visit(rootIno);
  for (const n of sys.fs.inodes.values()) if (n.nlink <= 0 && n.openBy?.length && n.fsRoot === rootIno) bytes += sys.fs.usage(n);
  return { mib: bytes / 1048576, inodes };
}

export function fsUsage(sys, mp) {
  const m = sys.fs.mounts.get(mp);
  if (!m) return null;
  if (m.virtual) return { size: mp === '/dev' ? 4096 : 8024, used: mp === '/run' ? 18 : 0, inodes: 2048000, iused: 600, fstype: m.fstype, source: m.source };
  if (m.fstype === 'nfs' || m.fstype === 'nfs4') return { size: 512000, used: 123400, inodes: 33554432, iused: 412000, fstype: m.fstype, source: m.source };
  const dev = canonDev(sys, m.source);
  const f = sys.storage.filesystems[dev];
  if (!f) return null;
  const rootIno = mp === '/' ? sys.fs.rootIno : f.rootIno;
  const dyn = rootIno ? treeUsage(sys, rootIno) : { mib: 0, inodes: 0 };
  const size = f.fsSize ?? f.size;
  return { size, used: Math.min(size, Math.round(f.used + dyn.mib)), inodes: f.inodes, iused: Math.min(f.inodes, f.iused + dyn.inodes), fstype: f.fstype, source: m.source };
}

function mkfs(ctx, fstype) {
  const sys = ctx.sys;
  const { o, rest } = getopt(ctx.args, 'fFqv', 'Lnbt', {});
  const dev = canonDev(sys, rest[0]);
  if (!dev) return fail(ctx, 'no device specified');
  const d = deviceExists(sys, dev);
  if (!d) { ctx.error(`${ctx.name}: cannot open ${rest[0]}: No such file or directory`); return 1; }
  if (!ctx.requireRoot()) return 1;
  if (mountedAt(sys, dev)) { ctx.error(`${ctx.name}: ${dev} contains a mounted filesystem`); return 1; }
  if (d.kind === 'disk' && sys.storage.disks[dev.replace('/dev/', '')].partitions.length && !o.f && !o.F) { ctx.error(`${ctx.name}: ${dev} appears to contain a partition table (gpt).\n${ctx.name}: Use the -f option to force overwrite.`); return 1; }
  const existing = sys.storage.filesystems[dev] || (sys.storage.pvs[dev] ? { fstype: 'LVM2_member' } : null);
  if (existing && !o.f && !o.F) {
    ctx.error(fstype === 'xfs' ? `mkfs.xfs: ${dev} appears to contain an existing filesystem (${existing.fstype}).\nmkfs.xfs: Use the -f option to force overwrite.` : `${dev} contains a ${existing.fstype} file system\n(simulator: re-run with -F to confirm — this destroys existing data)`);
    return 1;
  }
  if (sys.storage.pvs[dev]) { ctx.error(`${ctx.name}: ${dev} is an LVM physical volume in use`); return 1; }
  const root = sys.fs.newInode(S_IFDIR, 0o755, 0, 0, 'system_u:object_r:default_t:s0');
  root.entries.set('.', root.ino);
  root.nlink = 2;
  if (fstype === 'ext4') {
    const lf = sys.fs.newInode(S_IFDIR, 0o700, 0, 0, 'system_u:object_r:lost_found_t:s0');
    lf.entries.set('.', lf.ino); lf.entries.set('..', root.ino); lf.nlink = 2;
    root.entries.set('lost+found', lf.ino); root.nlink++;
  }
  const size = d.size;
  const inodes = fstype === 'xfs' ? Math.round(size * 256) : fstype === 'vfat' ? 0 : Math.round(size * 64);
  sys.storage.filesystems[dev] = { fstype, uuid: fstype === 'vfat' ? `${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}` : uuid(), label: o.L || o.n || '', size, fsSize: size, used: fstype === 'xfs' ? Math.max(32, Math.round(size * 0.007)) : Math.round(size * 0.02) + 24, inodes, iused: fstype === 'ext4' ? 11 : 3, rootIno: root.ino };
  if (d.part) d.part.fstype = fstype;
  if (fstype === 'xfs') ctx.print(`meta-data=${dev}        isize=512    agcount=4, agsize=${Math.round(size * 64)} blks\n         =                       sectsz=512   attr=2, projid32bit=1\n         =                       crc=1        finobt=1, sparse=1, rmapbt=1\ndata     =                       bsize=4096   blocks=${size * 256}, imaxpct=25\nnaming   =version 2              bsize=4096   ascii-ci=0, ftype=1\nlog      =internal log           bsize=4096   blocks=16384, version=2\nrealtime =none                   extsz=4096   blocks=0, rtextents=0`);
  else if (fstype === 'ext4') ctx.print(`mke2fs 1.47.1 (20-May-2024)\nCreating filesystem with ${size * 256} 4k blocks and ${inodes} inodes\nFilesystem UUID: ${sys.storage.filesystems[dev].uuid}\nAllocating group tables: done\nWriting inode tables: done\nCreating journal (16384 blocks): done\nWriting superblocks and filesystem accounting information: done`);
  else ctx.print(`mkfs.fat 4.2 (2021-01-31)`);
  return 0;
}

export function doMount(ctx, devSpec, mp, { fstype, options = 'defaults', quiet = false } = {}) {
  const sys = ctx.sys;
  const fs = sys.fs;
  const abs = normalizePath(mp, ctx.cwd);
  const r = fs.tryResolve(abs);
  if (!r) { ctx.error(`mount: ${abs}: mount point does not exist.`); return 32; }
  if (r.node.type !== S_IFDIR) { ctx.error(`mount: ${abs}: mount point is not a directory.`); return 32; }
  if (/^[\w.-]+:\//.test(devSpec)) return mountNfs(ctx, devSpec, abs, options);
  const dev = deviceBySpec(sys, devSpec);
  if (!dev) { ctx.error(/^(UUID|LABEL)=/.test(devSpec) ? `mount: ${abs}: can't find ${devSpec}.` : `mount: ${abs}: special device ${devSpec} does not exist.`); return 32; }
  const f = sys.storage.filesystems[dev];
  if (!f || f.fstype === 'swap') { ctx.error(`mount: ${abs}: wrong fs type, bad option, bad superblock on ${dev}, missing codepage or helper program, or other error.\n       dmesg(1) may have more information after failed mount system call.`); return 32; }
  if (fstype && fstype !== 'auto' && fstype !== f.fstype) { ctx.error(`mount: ${abs}: wrong fs type, bad option, bad superblock on ${dev}, missing codepage or helper program, or other error.`); return 32; }
  const already = mountedAt(sys, dev);
  if (already === abs) { if (!quiet) ctx.error(`mount: ${abs}: ${dev} already mounted on ${abs}.`); return quiet ? 0 : 32; }
  if (fs.mounts.has(abs)) { ctx.error(`mount: ${abs}: ${fs.mounts.get(abs).source} already mounted on ${abs}.`); return 32; }
  const parent = fs.resolve(abs === '/' ? '/' : abs.slice(0, abs.lastIndexOf('/')) || '/').node;
  const root = fs.get(f.rootIno);
  root.entries.set('..', parent.ino);
  fs.mountRoots.set(r.node.ino, f.rootIno);
  fs.mounts.set(abs, { source: dev, fstype: f.fstype, options: options === 'defaults' ? 'seclabel,relatime' : options, readonly: /(^|,)ro(,|$)/.test(options) });
  return 0;
}

function mountNfs(ctx, spec, abs, options) {
  const sys = ctx.sys;
  if (!sys.packages.installed['nfs-utils']) { ctx.error(`mount: ${abs}: bad option; for several filesystems (e.g. nfs, cifs) you might need a /sbin/mount.<type> helper program.`); return 32; }
  const [host, path] = spec.split(':');
  const res = resolveName(sys, host);
  if (!res.ip) { ctx.error(`mount.nfs: Failed to resolve server ${host}: Name or service not known`); return 32; }
  const exp = sys.storage.nfsExports[`${host}:${path}`] || sys.storage.nfsExports[`${host.replace('.lab.example.com', '')}.lab.example.com:${path}`];
  if (!sys.net.reachable.includes(res.ip) || (exp && !exp.reachable)) { ctx.error('mount.nfs: Connection timed out'); return 32; }
  if (!exp) { ctx.error(`mount.nfs: access denied by server while mounting ${spec}`); return 32; }
  if (sys.fs.mounts.has(abs)) { ctx.error(`mount.nfs: ${abs} is busy or already mounted`); return 32; }
  if (!exp.rootIno) {
    const root = sys.fs.newInode(S_IFDIR, 0o755, 0, 0, 'system_u:object_r:nfs_t:s0');
    root.entries.set('.', root.ino); root.nlink = 2;
    exp.rootIno = root.ino;
    const readme = sys.fs.newInode('f', 0o644, 0, 0, 'system_u:object_r:nfs_t:s0');
    readme.data = `Shared files exported by ${host}:${path}\n`;
    readme.nlink = 1;
    root.entries.set('README.txt', readme.ino);
  }
  const r = sys.fs.resolve(abs);
  sys.fs.get(exp.rootIno).entries.set('..', sys.fs.resolve(abs.slice(0, abs.lastIndexOf('/')) || '/').node.ino);
  sys.fs.mountRoots.set(r.node.ino, exp.rootIno);
  sys.fs.mounts.set(abs, { source: spec, fstype: 'nfs4', options: (options === 'defaults' ? '' : options + ',') + 'vers=4.2,rsize=1048576,wsize=1048576,hard,proto=tcp,sec=sys', readonly: /(^|,)ro(,|$)/.test(options) });
  return 0;
}

export function parseFstab(sys) {
  let text = '';
  try { text = sys.fs.readFile('/etc/fstab', '/'); } catch { return []; }
  return text.split('\n').map((l, i) => ({ l: l.trim(), line: i + 1 })).filter(x => x.l && !x.l.startsWith('#')).map(x => {
    const [spec, mp, type, opts = 'defaults', dump = '0', pass = '0'] = x.l.split(/\s+/);
    return { spec, mp, type, opts, dump, pass, line: x.line, fields: x.l.split(/\s+/).length };
  });
}

function mountAll(ctx) {
  const sys = ctx.sys;
  let code = 0;
  if (sys.fstabReloadHint && sys.fs.resolve('/etc/fstab').node.mtime > (sys.lastDaemonReload || 0)) ctx.error("mount: (hint) your fstab has been modified, but systemd still uses\n       the old version; use 'systemctl daemon-reload' to reload.");
  for (const e of parseFstab(sys)) {
    if (e.fields < 4) { ctx.error(`mount: /etc/fstab: parse error at line ${e.line} -- ignored`); code = 64; continue; }
    if (e.type === 'swap' || e.mp === 'none' || /(^|,)noauto(,|$)/.test(e.opts)) continue;
    if (sys.fs.mounts.has(normalizePath(e.mp))) continue;
    const r = doMount(ctx, e.spec, e.mp, { fstype: e.type, options: e.opts, quiet: true });
    if (r) code = r;
  }
  return code;
}

function lsblk(ctx) {
  const sys = ctx.sys;
  const st = sys.storage;
  const showFs = ctx.args.includes('-f') || ctx.args.includes('--fs');
  const filter = ctx.args.find(a => a.startsWith('/dev/'));
  const rows = [showFs ? ['NAME', 'FSTYPE', 'FSVER', 'LABEL', 'UUID', 'FSAVAIL', 'FSUSE%', 'MOUNTPOINTS'] : ['NAME', 'MAJ:MIN', 'RM', 'SIZE', 'RO', 'TYPE', 'MOUNTPOINTS']];
  const mpOf = (dev) => (st.swaps.includes(dev) ? '[SWAP]' : mountedAt(sys, dev) || '');
  const row = (prefix, name, dev, size, type, majmin) => {
    const f = st.filesystems[dev];
    if (showFs) {
      const mp = mpOf(dev);
      const u = mp && mp !== '[SWAP]' ? fsUsage(sys, mp) : null;
      const fsType = f?.fstype || (st.pvs[dev] ? 'LVM2_member' : '');
      return [prefix + name, fsType, f ? (f.fstype === 'xfs' ? '' : f.fstype === 'ext4' ? '1.0' : f.fstype === 'swap' ? '1' : 'FAT32') : st.pvs[dev] ? 'LVM2 001' : '', f?.label || '', f?.uuid || st.pvs[dev]?.uuid || '', u ? mibHuman(u.size - u.used) : '', u ? `${Math.round(u.used / u.size * 100)}%` : '', mp];
    }
    return [prefix + name, majmin, 0, mibHuman(size), 0, type, mpOf(dev)];
  };
  let minor = 0;
  for (const [dn, disk] of Object.entries(st.disks)) {
    if (filter && filter !== `/dev/${dn}`) continue;
    const base = minor;
    rows.push(row('', dn, `/dev/${dn}`, disk.size, 'disk', `8:${base}`));
    disk.partitions.forEach((p, i) => {
      const lastP = i === disk.partitions.length - 1;
      rows.push(row(lastP ? '└─' : '├─', p.name, `/dev/${p.name}`, p.size, 'part', `8:${base + i + 1}`));
      const lvs = Object.values(st.lvs).filter(l => st.vgs[l.vg]?.pvs.includes(`/dev/${p.name}`));
      lvs.forEach((l, k) => rows.push(row(`${lastP ? '  ' : '│ '}${k === lvs.length - 1 ? '└─' : '├─'}`, `${l.vg}-${l.name}`, `/dev/mapper/${l.vg}-${l.name}`, l.size, 'lvm', `253:${k}`)));
    });
    const wholeLvs = Object.values(st.lvs).filter(l => st.vgs[l.vg]?.pvs.includes(`/dev/${dn}`));
    wholeLvs.forEach((l, k) => rows.push(row(k === wholeLvs.length - 1 ? '└─' : '├─', `${l.vg}-${l.name}`, `/dev/mapper/${l.vg}-${l.name}`, l.size, 'lvm', `253:${k + 2}`)));
    minor += 16;
  }
  rows.push(row('', 'sr0', '/dev/sr0', 1024, 'rom', '11:0'));
  ctx.print(columns(rows));
  return 0;
}

function lvmReport(ctx, kind) {
  const st = ctx.sys.storage;
  if (!ctx.requireRoot()) return 5;
  if (kind === 'pvs') ctx.print(columns([['  PV', 'VG', 'Fmt', 'Attr', 'PSize', 'PFree'], ...Object.entries(st.pvs).map(([d, p]) => { const used = p.vg ? Object.values(st.lvs).filter(l => l.vg === p.vg).reduce((s, l) => s + l.size, 0) : 0; const vgsz = p.vg ? vgFree(ctx.sys, p.vg) : null; const free = p.vg ? Math.max(0, p.size - Math.max(0, used - (vgsz.size - p.size))) : p.size; return [`  ${d}`, p.vg || '', 'lvm2', p.vg ? 'a--' : '---', lvmSize(p.size), lvmSize(Math.min(p.size, free))]; })]));
  if (kind === 'vgs') ctx.print(columns([['  VG', '#PV', '#LV', '#SN', 'Attr', 'VSize', 'VFree'], ...Object.entries(st.vgs).map(([n, v]) => { const f = vgFree(ctx.sys, n); return [`  ${n}`, v.pvs.length, Object.values(st.lvs).filter(l => l.vg === n).length, 0, 'wz--n-', lvmSize(f.size), lvmSize(f.free)]; })]));
  if (kind === 'lvs') ctx.print(columns([['  LV', 'VG', 'Attr', 'LSize', 'Pool', 'Origin', 'Data%'], ...Object.values(st.lvs).map(l => [`  ${l.name}`, l.vg, `-wi-${mountedAt(ctx.sys, `/dev/mapper/${l.vg}-${l.name}`) || st.swaps.includes(`/dev/mapper/${l.vg}-${l.name}`) ? 'ao' : 'a-'}----`, lvmSize(l.size), '', '', ''])]));
  return 0;
}

function addDevNode(sys, path) {
  if (!sys.fs.exists(path)) { const n = sys.fs.create(path, '/', S_IFBLK, { mode: 0o660, umask: 0 }); n.gid = 6; }
}

function parsePartedSize(spec, diskSize) {
  if (spec.endsWith('%')) return Math.round(diskSize * Number(spec.slice(0, -1)) / 100);
  const m = /^(\d+(?:\.\d+)?)(MiB|GiB|MB|GB|M|G|s)?$/i.exec(spec);
  if (!m) return null;
  const unit = (m[2] || 'MB').toLowerCase();
  const v = Number(m[1]);
  return Math.round(unit.startsWith('g') ? v * 1024 : unit === 's' ? v / 2048 : v);
}

function parted(ctx) {
  const sys = ctx.sys;
  const args = ctx.args.filter(a => a !== '-s' && a !== '--script' && a !== '-a' && a !== 'optimal');
  const dev = args.shift();
  const name = (dev || '').replace('/dev/', '');
  const disk = sys.storage.disks[name];
  if (!disk) { ctx.error(`Error: Could not stat device ${dev} - No such file or directory.`); return 1; }
  if (!ctx.args.includes('-s') && !ctx.args.includes('--script') && args.length && args[0] !== 'print') ctx.error('(simulator: interactive parted is not simulated — commands are applied as if -s was given)');
  const print = () => {
    ctx.print(`Model: VMware Virtual disk (scsi)\nDisk ${dev}: ${(disk.size / 1024 * 1.074).toFixed(1)}GB\nSector size (logical/physical): 512B/512B\nPartition Table: ${disk.label || 'unknown'}\nDisk Flags: \n\nNumber  Start   End     Size    File system     Name     Flags`);
    disk.partitions.forEach((p, i) => ctx.print(` ${i + 1}      ${p.start}MiB  ${p.start + p.size}MiB  ${p.size}MiB  ${(p.fstype && p.fstype !== 'LVM2_member' ? p.fstype : '').padEnd(15)} ${p.label || 'primary'}  ${p.type === 'lvm' ? 'lvm' : p.type === 'swap' ? 'swap' : ''}`));
    return 0;
  };
  if (!args.length || args[0] === 'print') return print();
  if (!ctx.requireRoot('parted')) return 1;
  while (args.length) {
    const cmd = args.shift();
    if (cmd === 'mklabel') {
      const label = args.shift();
      if (!['gpt', 'msdos'].includes(label)) { ctx.error(`Error: Invalid label type ${label}`); return 1; }
      if (disk.partitions.some(p => mountedAt(sys, `/dev/${p.name}`) || sys.storage.pvs[`/dev/${p.name}`])) { ctx.error(`Error: Partition(s) on ${dev} are being used.`); return 1; }
      disk.label = label; disk.partitions = [];
    } else if (cmd === 'mkpart') {
      if (!disk.label) { ctx.error(`Error: ${dev}: unrecognised disk label`); return 1; }
      const parts = [];
      while (args.length && !['mklabel', 'mkpart', 'set', 'rm', 'print', 'name'].includes(args[0])) parts.push(args.shift());
      const nums = parts.filter(p => /^\d|%$/.test(p));
      const label = parts.find(p => !/^\d|%$/.test(p) && !['xfs', 'ext4', 'linux-swap', 'fat32', 'primary', 'logical', 'extended'].includes(p)) || (parts.includes('primary') ? 'primary' : 'primary');
      const fsHint = parts.find(p => ['xfs', 'ext4', 'linux-swap', 'fat32'].includes(p));
      const start = parsePartedSize(nums[0] || '1MiB', disk.size), end = parsePartedSize(nums[1] || '100%', disk.size);
      if (start === null || end === null || end <= start) { ctx.error('Error: Invalid start/end.'); return 1; }
      if (end > disk.size) { ctx.error('Error: The location is outside of the device.'); return 1; }
      if (disk.partitions.some(p => start < p.start + p.size && end > p.start)) { ctx.error("Error: You requested a partition from the overlapping region. The closest location we can manage is free space."); return 1; }
      if (disk.label === 'msdos' && disk.partitions.length >= 4) { ctx.error('Error: Too many primary partitions.'); return 1; }
      const n = disk.partitions.length + 1;
      disk.partitions.push({ name: `${name}${n}`, start, size: end - start, type: fsHint === 'linux-swap' ? 'swap' : 'linux', label, fstype: '' });
      addDevNode(sys, `/dev/${name}${n}`);
    } else if (cmd === 'set') {
      const num = Number(args.shift()), flag = args.shift(); args.shift();
      const p = disk.partitions[num - 1];
      if (p && flag === 'lvm') p.type = 'lvm';
      if (p && flag === 'swap') p.type = 'swap';
    } else if (cmd === 'rm') {
      const num = Number(args.shift());
      const p = disk.partitions[num - 1];
      if (!p) { ctx.error(`Error: Partition doesn't exist.`); return 1; }
      if (mountedAt(sys, `/dev/${p.name}`) || sys.storage.pvs[`/dev/${p.name}`] || sys.storage.swaps.includes(`/dev/${p.name}`)) { ctx.error(`Error: Partition ${dev}${num} is being used. You must unmount it before you modify it with Parted.`); return 1; }
      disk.partitions.splice(num - 1, 1);
      delete sys.storage.filesystems[`/dev/${p.name}`];
    } else if (cmd === 'name') { args.shift(); args.shift(); }
    else { ctx.error(`parted: invalid token: ${cmd}`); return 1; }
  }
  ctx.error('Information: You may need to update /etc/fstab.');
  return 0;
}

export const storageCommands = [
  { name: 'lsblk', cat: 'Storage', summary: 'List block devices (-f for filesystems/UUIDs)', usage: 'lsblk [-f] [/dev/X]', fidelity: 'functional', run: lsblk },
  {
    name: 'blkid', cat: 'Storage', summary: 'Show filesystem UUIDs, labels and types', usage: 'blkid [DEVICE]', fidelity: 'functional', bin: '/usr/sbin/blkid',
    run(ctx) {
      const sys = ctx.sys;
      const want = ctx.args.find(a => a.startsWith('/dev/'));
      const entries = [...Object.entries(sys.storage.filesystems).map(([d, f]) => [d, `${f.label ? `LABEL="${f.label}" ` : ''}UUID="${f.uuid}" ${f.fstype === 'xfs' || f.fstype === 'ext4' ? 'BLOCK_SIZE="4096" ' : ''}TYPE="${f.fstype}"`]), ...Object.entries(sys.storage.pvs).map(([d, p]) => [d, `UUID="${p.uuid}" TYPE="LVM2_member"`])];
      let shown = 0;
      for (const [d, s] of entries.sort()) { if (want && canonDev(sys, want) !== d) continue; ctx.print(`${d}: ${s}`); shown++; }
      return shown ? 0 : 2;
    }
  },
  {
    name: 'fdisk', cat: 'Storage', summary: 'List partition tables (fdisk -l); interactive editing is not simulated — use parted -s', usage: 'fdisk -l [DEVICE]', fidelity: 'partial', bin: '/usr/sbin/fdisk',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 1;
      if (!ctx.args.includes('-l')) { ctx.error('fdisk: (simulator) interactive mode is not simulated. Use: parted -s /dev/sdX mklabel gpt mkpart NAME 1MiB 2GiB'); return 1; }
      const want = ctx.args.find(a => a.startsWith('/dev/'));
      for (const [dn, disk] of Object.entries(sys.storage.disks)) {
        if (want && want !== `/dev/${dn}`) continue;
        ctx.print(`Disk /dev/${dn}: ${(disk.size / 1024).toFixed(0)} GiB, ${disk.size * 1048576} bytes, ${disk.size * 2048} sectors\nDisk model: Virtual disk\nUnits: sectors of 1 * 512 = 512 bytes\nSector size (logical/physical): 512 bytes / 512 bytes${disk.label ? `\nDisklabel type: ${disk.label === 'msdos' ? 'dos' : 'gpt'}` : ''}`);
        if (disk.partitions.length) {
          ctx.print('\nDevice     Start      End  Sectors Size Type');
          for (const p of disk.partitions) ctx.print(`/dev/${p.name.padEnd(5)} ${String(p.start * 2048).padStart(6)} ${String((p.start + p.size) * 2048 - 1).padStart(8)} ${String(p.size * 2048).padStart(8)} ${mibHuman(p.size).padStart(4)} ${p.type === 'lvm' ? 'Linux LVM' : p.type === 'swap' ? 'Linux swap' : 'Linux filesystem'}`);
        }
        ctx.print('');
      }
      return 0;
    }
  },
  { name: 'parted', cat: 'Storage', summary: 'Partition editor (script mode): mklabel gpt|msdos, mkpart, set N lvm on, rm, print', usage: 'parted -s /dev/sdb mklabel gpt mkpart data xfs 1MiB 2GiB', fidelity: 'partial', bin: '/usr/sbin/parted', run: parted },
  { name: 'partprobe', cat: 'Storage', summary: 'Inform the kernel of partition table changes', usage: 'partprobe [DEVICE]', fidelity: 'static', bin: '/usr/sbin/partprobe', run() { return 0; } },
  { name: 'udevadm', cat: 'Storage', summary: 'udev management (settle is a no-op here)', usage: 'udevadm settle', fidelity: 'static', bin: '/usr/sbin/udevadm', run() { return 0; } },
  { name: 'mkfs.xfs', cat: 'Storage', summary: 'Create an XFS filesystem (destroys data)', usage: 'mkfs.xfs [-f] [-L LABEL] DEVICE', fidelity: 'functional', run: (ctx) => mkfs(ctx, 'xfs') },
  { name: 'mkfs.ext4', cat: 'Storage', summary: 'Create an ext4 filesystem (destroys data)', usage: 'mkfs.ext4 [-F] [-L LABEL] DEVICE', fidelity: 'functional', bin: '/usr/sbin/mkfs.ext4', run: (ctx) => mkfs(ctx, 'ext4') },
  { name: 'mkfs.vfat', cat: 'Storage', summary: 'Create a VFAT filesystem', usage: 'mkfs.vfat [-n LABEL] DEVICE', fidelity: 'functional', bin: '/usr/sbin/mkfs.vfat', run: (ctx) => mkfs(ctx, 'vfat') },
  {
    name: 'mkfs', cat: 'Storage', summary: 'Front-end: mkfs -t xfs|ext4|vfat DEVICE', usage: 'mkfs -t TYPE DEVICE', fidelity: 'functional', bin: '/usr/sbin/mkfs',
    run(ctx) { const i = ctx.args.indexOf('-t'); const t = i >= 0 ? ctx.args[i + 1] : 'ext2'; const rest = ctx.args.filter((_, k) => k !== i && k !== i + 1); if (!['xfs', 'ext4', 'vfat'].includes(t)) return fail(ctx, `simulator supports -t xfs|ext4|vfat (got ${t})`); return mkfs({ ...ctx, name: `mkfs.${t}`, args: rest }, t); }
  },
  {
    name: 'mkswap', cat: 'Storage', summary: 'Initialise a swap area', usage: 'mkswap [-L LABEL] DEVICE', fidelity: 'functional', bin: '/usr/sbin/mkswap',
    run(ctx) {
      const sys = ctx.sys;
      const { o, rest } = getopt(ctx.args, 'f', 'L');
      const dev = canonDev(sys, rest[0] || '');
      const d = deviceExists(sys, dev);
      if (!d) return fail(ctx, `cannot open ${rest[0]}: No such file or directory`);
      if (!ctx.requireRoot()) return 1;
      if (mountedAt(sys, dev)) return fail(ctx, `${dev}: contains a mounted filesystem`);
      const u = uuid();
      sys.storage.filesystems[dev] = { fstype: 'swap', uuid: u, label: o.L || '', size: d.size, used: 0 };
      if (d.part) d.part.fstype = 'swap';
      ctx.print(`Setting up swapspace version 1, size = ${mibHuman(d.size)}iB (${d.size * 1048576 - 4096} bytes)\nno label, UUID=${u}`);
      return 0;
    }
  },
  {
    name: 'swapon', cat: 'Storage', summary: 'Enable swap (-a from fstab, --show)', usage: 'swapon [-a] [--show] [DEVICE]', fidelity: 'functional', bin: '/usr/sbin/swapon',
    run(ctx) {
      const sys = ctx.sys;
      const st = sys.storage;
      if (!ctx.args.length || ctx.args.includes('--show') || ctx.args.includes('-s')) {
        ctx.print(columns([['NAME', 'TYPE', 'SIZE', 'USED', 'PRIO'], ...st.swaps.map((d, i) => [d.replace('/dev/mapper/rhel-swap', '/dev/dm-1'), 'partition', mibHuman(st.filesystems[d]?.size || 0), '0B', -2 - i])]));
        return 0;
      }
      if (!ctx.requireRoot()) return 1;
      const targets = ctx.args.includes('-a') ? parseFstab(sys).filter(e => e.type === 'swap').map(e => deviceBySpec(sys, e.spec) || e.spec) : ctx.args.filter(a => !a.startsWith('-')).map(a => deviceBySpec(sys, a) || a);
      let code = 0;
      for (const d of targets) {
        if (st.swaps.includes(d)) { if (!ctx.args.includes('-a')) { ctx.error(`swapon: ${d}: swapon failed: Device or resource busy`); code = 1; } continue; }
        if (st.filesystems[d]?.fstype !== 'swap') { ctx.error(`swapon: ${d}: read swap header failed${deviceExists(sys, d) ? '' : ': No such file or directory'}`); code = 255; continue; }
        st.swaps.push(d);
      }
      return code;
    }
  },
  {
    name: 'swapoff', cat: 'Storage', summary: 'Disable swap', usage: 'swapoff DEVICE|-a', fidelity: 'functional', bin: '/usr/sbin/swapoff',
    run(ctx) { if (!ctx.requireRoot()) return 1; const st = ctx.sys.storage; if (ctx.args.includes('-a')) st.swaps = []; else for (const a of ctx.args) st.swaps = st.swaps.filter(d => d !== (deviceBySpec(ctx.sys, a) || a)); return 0; }
  },
  {
    name: 'mount', cat: 'Storage', summary: 'Mount filesystems (device, UUID=, LABEL=, NFS host:/path, -a from fstab, -o remount)', usage: 'mount [-t TYPE] [-o OPTS] DEVICE DIR | mount -a | mount', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const { o, rest } = getopt(ctx.args, 'avlr', 'to', { all: 'a' });
      if (!rest.length && !o.a) {
        for (const [mp, m] of sys.fs.mounts) ctx.print(`${m.source} on ${mp} type ${m.fstype} (${m.readonly ? 'ro' : 'rw'},${m.options})`);
        return 0;
      }
      if (!ctx.requireRoot()) return 1;
      if (o.a) return mountAll(ctx);
      if (o.o && /remount/.test(o.o)) {
        const mp = normalizePath(rest[0], ctx.cwd);
        const m = sys.fs.mounts.get(mp);
        if (!m) { ctx.error(`mount: ${mp}: mount point not mounted or bad option.`); return 32; }
        m.readonly = /(^|,)ro(,|$)/.test(o.o);
        return 0;
      }
      if (rest.length === 1) {
        const e = parseFstab(sys).find(x => normalizePath(x.mp) === normalizePath(rest[0], ctx.cwd) || x.spec === rest[0]);
        if (!e) { ctx.error(`mount: ${rest[0]}: can't find in /etc/fstab.`); return 1; }
        return doMount(ctx, e.spec, e.mp, { fstype: e.type, options: e.opts });
      }
      return doMount(ctx, rest[0], rest[1], { fstype: o.t, options: o.o || 'defaults' });
    }
  },
  {
    name: 'umount', cat: 'Storage', summary: 'Unmount filesystems (refuses busy mounts)', usage: 'umount DIR|DEVICE', fidelity: 'functional',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 1;
      const target = ctx.args.find(a => !a.startsWith('-'));
      if (!target) return fail(ctx, 'bad usage');
      let mp = normalizePath(target, ctx.cwd);
      if (!sys.fs.mounts.has(mp)) { const byDev = mountedAt(sys, canonDev(sys, target)); if (byDev) mp = byDev; else { ctx.error(`umount: ${target}: not mounted.`); return 32; } }
      if (['/', '/boot', '/proc', '/sys', '/dev', '/run'].includes(mp)) { ctx.error(`umount: ${mp}: target is busy.`); return 32; }
      if ((sys.session.cwd + '/').startsWith(mp + '/') || (sys.mountUsers?.[mp]?.length && !ctx.args.includes('-l'))) { ctx.error(`umount: ${mp}: target is busy.\n(hint: a shell's working directory or an open file is inside the mount — check with fuser -vm ${mp} or lsof +f -- ${mp})`); return 32; }
      const r = sys.fs.resolve(mp.slice(0, mp.lastIndexOf('/')) || '/');
      const mpNode = sys.fs.get(r.node.entries.get(mp.split('/').pop()));
      sys.fs.mountRoots.delete(mpNode.ino);
      sys.fs.mounts.delete(mp);
      return 0;
    }
  },
  {
    name: 'findmnt', cat: 'Storage', summary: 'Show mounts as a tree; --verify checks /etc/fstab', usage: 'findmnt [TARGET] [--verify]', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      if (ctx.args.includes('--verify')) {
        let errors = 0, warnings = 0;
        for (const e of parseFstab(sys)) {
          ctx.print(e.mp);
          if (e.fields < 4) { ctx.print(`   [E] line ${e.line}: parse error`); errors++; continue; }
          const dev = deviceBySpec(sys, e.spec);
          if (e.mp !== 'none' && !sys.fs.exists(e.mp)) { ctx.print(`   [E] ${e.mp}: target does not exist`); errors++; }
          if (!dev && !/^[\w.-]+:\//.test(e.spec)) { ctx.print(`   [E] ${e.spec} does not exist`); errors++; }
          else if (dev) { const f = sys.storage.filesystems[dev]; if (f && e.type !== 'auto' && f.fstype !== e.type && !(e.type === 'swap' && f.fstype === 'swap')) { ctx.print(`   [E] ${e.type} does not match with on-disk ${f.fstype}`); errors++; } }
          if (/^\/dev\/sd/.test(e.spec)) { ctx.print(`   [W] ${e.spec}: non-persistent device name — prefer UUID= or LABEL=`); warnings++; }
        }
        ctx.print(`\n${errors ? errors + ' parse errors, ' : '0 parse errors, '}${errors} errors, ${warnings} warnings`);
        return errors ? 1 : 0;
      }
      const target = ctx.args.find(a => !a.startsWith('-'));
      const rows = [['TARGET', 'SOURCE', 'FSTYPE', 'OPTIONS']];
      for (const [mp, m] of [...sys.fs.mounts].sort()) {
        if (target && normalizePath(target, ctx.cwd) !== mp && canonDev(sys, target) !== canonDev(sys, m.source)) continue;
        rows.push([target ? mp : mp === '/' ? '/' : `${'  '.repeat(Math.max(0, mp.split('/').length - 2))}├─${mp}`, m.source, m.fstype, `${m.readonly ? 'ro' : 'rw'},${m.options}`]);
      }
      if (rows.length === 1) return 1;
      ctx.print(columns(rows));
      return 0;
    }
  },
  {
    name: 'df', cat: 'Storage', summary: 'Filesystem space or inode usage (-h, -T, -i)', usage: 'df [-h] [-T] [-i] [PATH]', fidelity: 'functional',
    run(ctx) {
      const sys = ctx.sys;
      const { o, rest } = getopt(ctx.args, 'hTiPxkm', 't', { 'human-readable': 'h', 'print-type': 'T', inodes: 'i' });
      let mounts = [...sys.fs.mounts.keys()];
      if (rest.length) {
        const sel = new Set();
        for (const p of rest) {
          const abs = normalizePath(p, ctx.cwd);
          if (!sys.fs.exists(abs) && !deviceExists(sys, p)) { ctx.error(`df: ${p}: No such file or directory`); continue; }
          const dev = deviceExists(sys, p) ? mountedAt(sys, canonDev(sys, p)) : null;
          sel.add(dev || mounts.filter(mp => abs === mp || abs.startsWith(mp === '/' ? '/' : mp + '/')).sort((a, b) => b.length - a.length)[0]);
        }
        mounts = [...sel].filter(Boolean);
      }
      const fmt = (mib) => (o.h ? mibHuman(mib) : String(Math.round(mib * 1024)));
      const rows = [o.i ? ['Filesystem', ...(o.T ? ['Type'] : []), 'Inodes', 'IUsed', 'IFree', 'IUse%', 'Mounted on'] : ['Filesystem', ...(o.T ? ['Type'] : []), o.h ? 'Size' : '1K-blocks', 'Used', o.h ? 'Avail' : 'Available', 'Use%', 'Mounted on']];
      for (const mp of mounts.sort()) {
        const u = fsUsage(sys, mp);
        if (!u) continue;
        if (o.t && u.fstype !== o.t) continue;
        if (o.i) rows.push([u.source, ...(o.T ? [u.fstype] : []), u.inodes, u.iused, u.inodes - u.iused, u.inodes ? `${Math.ceil(u.iused / u.inodes * 100)}%` : '-', mp]);
        else rows.push([u.source, ...(o.T ? [u.fstype] : []), fmt(u.size), fmt(u.used), fmt(Math.max(0, u.size - u.used)), `${Math.ceil(u.used / u.size * 100)}%`, mp]);
      }
      ctx.print(columns(rows, { align: ['', ...(o.T ? [''] : []), 'r', 'r', 'r', 'r'] }));
      return 0;
    }
  },
  {
    name: 'pvcreate', cat: 'LVM', summary: 'Initialise a physical volume', usage: 'pvcreate DEVICE...', fidelity: 'functional', bin: '/usr/sbin/pvcreate',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 5;
      let code = 0;
      for (const d of ctx.args.filter(a => !a.startsWith('-'))) {
        const dev = canonDev(sys, d);
        const info = deviceExists(sys, dev);
        if (!info) { ctx.error(`  No device found for ${d}.`); code = 5; continue; }
        if (info.kind === 'disk' && sys.storage.disks[dev.replace('/dev/', '')].partitions.length) { ctx.error(`  Cannot use ${d}: device is partitioned`); code = 5; continue; }
        if (sys.storage.pvs[dev]) { ctx.error(`  Can't initialize physical volume "${d}" of volume group "${sys.storage.pvs[dev].vg}" without -ff\n  ${d}: physical volume not initialized.`); code = 5; continue; }
        if (sys.storage.filesystems[dev] && !ctx.args.includes('-f') && !ctx.args.includes('-y')) { ctx.error(`WARNING: ${sys.storage.filesystems[dev].fstype} signature detected on ${d}. Wipe it? [y/n]: [n]\n  Aborted wiping of ${sys.storage.filesystems[dev].fstype}.\n  1 existing signature left on the device.\n(simulator: add -f to confirm)`); code = 5; continue; }
        if (mountedAt(sys, dev)) { ctx.error(`  Can't open ${d} exclusively.  Mounted filesystem?`); code = 5; continue; }
        delete sys.storage.filesystems[dev];
        sys.storage.pvs[dev] = { vg: null, size: info.size - 4, uuid: Math.random().toString(36).slice(2, 8) + '-' + Math.random().toString(36).slice(2, 6) };
        if (info.part) { info.part.fstype = 'LVM2_member'; info.part.type = 'lvm'; }
        ctx.print(`  Physical volume "${d}" successfully created.`);
      }
      return code;
    }
  },
  {
    name: 'vgcreate', cat: 'LVM', summary: 'Create a volume group', usage: 'vgcreate [-s EXTENT] VG PV...', fidelity: 'functional', bin: '/usr/sbin/vgcreate',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 5;
      const { o, rest } = getopt(ctx.args, 'y', 's');
      const [vg, ...pvs] = rest;
      if (!vg || !pvs.length) return fail(ctx, 'Please provide volume group name and physical volumes', 3);
      if (sys.storage.vgs[vg]) { ctx.error(`  A volume group called ${vg} already exists.`); return 5; }
      for (const p of pvs) {
        const dev = canonDev(sys, p);
        if (!sys.storage.pvs[dev]) {
          if (!deviceExists(sys, dev)) { ctx.error(`  No device found for ${p}.`); return 5; }
          sys.storage.pvs[dev] = { vg: null, size: deviceExists(sys, dev).size - 4, uuid: Math.random().toString(36).slice(2, 10) };
          ctx.print(`  Physical volume "${p}" successfully created.`);
        }
        if (sys.storage.pvs[dev].vg) { ctx.error(`  Physical volume '${p}' is already in volume group '${sys.storage.pvs[dev].vg}'`); return 5; }
      }
      for (const p of pvs) sys.storage.pvs[canonDev(sys, p)].vg = vg;
      sys.storage.vgs[vg] = { pvs: pvs.map(p => canonDev(sys, p)), extent: parseSize(o.s || '4M')?.mib || 4 };
      if (!sys.fs.exists(`/dev/${vg}`)) sys.fs.create(`/dev/${vg}`, '/', S_IFDIR, { mode: 0o755, umask: 0 });
      ctx.print(`  Volume group "${vg}" successfully created`);
      return 0;
    }
  },
  {
    name: 'vgextend', cat: 'LVM', summary: 'Add physical volumes to a volume group', usage: 'vgextend VG PV...', fidelity: 'functional', bin: '/usr/sbin/vgextend',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 5;
      const [vg, ...pvs] = ctx.args.filter(a => !a.startsWith('-'));
      if (!sys.storage.vgs[vg]) { ctx.error(`  Volume group "${vg}" not found`); return 5; }
      for (const p of pvs) {
        const dev = canonDev(sys, p);
        if (!deviceExists(sys, dev)) { ctx.error(`  No device found for ${p}.`); return 5; }
        if (sys.storage.pvs[dev]?.vg) { ctx.error(`  Physical volume '${p}' is already in volume group '${sys.storage.pvs[dev].vg}'`); return 5; }
        if (!sys.storage.pvs[dev]) { sys.storage.pvs[dev] = { size: deviceExists(sys, dev).size - 4, uuid: Math.random().toString(36).slice(2, 10) }; ctx.print(`  Physical volume "${p}" successfully created.`); }
        sys.storage.pvs[dev].vg = vg;
        sys.storage.vgs[vg].pvs.push(dev);
      }
      ctx.print(`  Volume group "${vg}" successfully extended`);
      return 0;
    }
  },
  {
    name: 'lvcreate', cat: 'LVM', summary: 'Create a logical volume (-L size | -l extents|%FREE, -n name)', usage: 'lvcreate -n NAME -L 2G|-l 100%FREE VG', fidelity: 'functional', bin: '/usr/sbin/lvcreate',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 5;
      const { o, rest } = getopt(ctx.args, 'y', 'nLl', { name: '=n', size: '=L', extents: '=l' });
      const vg = rest[0];
      if (!vg || !sys.storage.vgs[vg]) { ctx.error(`  Volume group "${vg || ''}" not found`); return 5; }
      if (!o.n) return fail(ctx, 'please specify a name with -n (simulator requires explicit names)', 3);
      if (sys.storage.lvs[`${vg}/${o.n}`]) { ctx.error(`  Logical Volume "${o.n}" already exists in volume group "${vg}"`); return 5; }
      const free = vgFree(sys, vg).free;
      const ext = sys.storage.vgs[vg].extent;
      let size;
      if (o.L) { const s = parseSize(o.L); if (!s) return fail(ctx, `Invalid argument for --size: ${o.L}`, 3); size = Math.ceil(s.mib / ext) * ext; }
      else if (o.l) { const m = /^(\d+)%(FREE|VG)$/.exec(o.l); size = m ? Math.floor((m[2] === 'FREE' ? free : vgFree(sys, vg).size) * Number(m[1]) / 100 / ext) * ext : Number(o.l) * ext; }
      else return fail(ctx, 'Please specify either size or extents', 3);
      if (size > free) { ctx.error(`  Volume group "${vg}" has insufficient free space (${Math.floor(free / ext)} extents): ${Math.ceil(size / ext)} required.`); return 5; }
      sys.storage.lvs[`${vg}/${o.n}`] = { vg, name: o.n, size };
      addDevNode(sys, `/dev/mapper/${vg}-${o.n}`);
      if (!sys.fs.exists(`/dev/${vg}/${o.n}`)) sys.fs.create(`/dev/${vg}/${o.n}`, '/', 'l', { target: `../mapper/${vg}-${o.n}` });
      ctx.print(`  Logical volume "${o.n}" created.`);
      return 0;
    }
  },
  ...['lvextend', 'lvresize', 'lvreduce'].map(name => ({
    name, cat: 'LVM', summary: name === 'lvreduce' ? 'Shrink a logical volume (XFS cannot shrink!)' : 'Grow a logical volume (-r also grows the filesystem)', usage: `${name} -L [+|-]SIZE|-l [+]EXTENTS|+100%FREE [-r] /dev/VG/LV`, fidelity: 'functional', bin: `/usr/sbin/${name}`,
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 5;
      const { o, rest } = getopt(ctx.args, 'rfy', 'Ll', { resizefs: 'r', size: '=L', extents: '=l' });
      const dev = canonDev(sys, rest[0] || '');
      const m = /^\/dev\/mapper\/([\w.+]+)-([\w.+]+)$/.exec(dev);
      const lv = m && sys.storage.lvs[`${m[1]}/${m[2]}`];
      if (!lv) { ctx.error(`  Failed to find logical volume "${rest[0]}"`); return 5; }
      const ext = sys.storage.vgs[lv.vg].extent;
      const free = vgFree(sys, lv.vg).free;
      let newSize;
      if (o.L) { const s = parseSize(o.L); newSize = s.sign === '+' ? lv.size + s.mib : s.sign === '-' ? lv.size - s.mib : s.mib; }
      else if (o.l) { const mm = /^([+-]?)(\d+)%(FREE|VG)$/.exec(o.l); if (mm) newSize = lv.size + Math.floor((mm[3] === 'FREE' ? free : vgFree(sys, lv.vg).size) * Number(mm[2]) / 100 / ext) * ext; else { const n = Number(o.l.replace(/^[+-]/, '')) * ext; newSize = o.l.startsWith('+') ? lv.size + n : o.l.startsWith('-') ? lv.size - n : n; } }
      else return fail(ctx, 'Please specify either size or extents', 3);
      newSize = Math.ceil(newSize / ext) * ext;
      const f = sys.storage.filesystems[dev];
      if (newSize < lv.size) {
        if (name === 'lvextend') { ctx.error(`  New size given (${Math.round(newSize / ext)} extents) not larger than existing size (${Math.round(lv.size / ext)} extents)`); return 5; }
        if (f?.fstype === 'xfs') { ctx.error(`  File system xfs found on ${lv.vg}/${lv.name}.\n  File system size (${lvmSize(lv.size)}) is larger than the requested size (${lvmSize(newSize)}).\n  File system reduce is required and not supported (xfs).`); return 5; }
        if (f?.fstype === 'ext4' && !o.r) { ctx.error(`  File system ext4 found on ${lv.vg}/${lv.name}.\n  File system size (${lvmSize(lv.size)}) is larger than the requested size (${lvmSize(newSize)}).\n  File system reduce is required (see resize2fs or --resizefs.)`); return 5; }
        if (f?.fstype === 'ext4' && mountedAt(sys, dev)) { ctx.error(`  File system reduce of mounted ext4 requires unmounting first (simulator: umount, then lvreduce -r).`); return 5; }
      }
      if (newSize - lv.size > free) { ctx.error(`  Insufficient free space: ${Math.ceil((newSize - lv.size) / ext)} extents needed, but only ${Math.floor(free / ext)} available`); return 5; }
      const old = lv.size;
      lv.size = newSize;
      if (f) f.size = newSize;
      ctx.print(`  Size of logical volume ${lv.vg}/${lv.name} changed from ${lvmSize(old)} (${old / ext} extents) to ${lvmSize(newSize)} (${newSize / ext} extents).\n  Logical volume ${lv.vg}/${lv.name} successfully resized.`);
      if (o.r && f) {
        if (f.fstype === 'xfs') { if (!mountedAt(sys, dev)) { ctx.error('  xfs_growfs requires a mounted filesystem'); return 5; } f.fsSize = newSize; ctx.print(`meta-data=${dev}  isize=512 agcount=4\ndata blocks changed from ${old * 256} to ${newSize * 256}`); }
        else if (f.fstype === 'ext4') { f.fsSize = newSize; ctx.print(`resize2fs 1.47.1 (20-May-2024)\nFilesystem at ${dev} is mounted on ${mountedAt(sys, dev) || '(unmounted)'}; on-line resizing required\nThe filesystem on ${dev} is now ${newSize * 256} (4k) blocks long.`); }
      } else if (f && newSize > old) ctx.error(`(note) The filesystem was NOT resized: df will still show ${mibHuman(f.fsSize ?? old)}. Run ${f.fstype === 'xfs' ? 'xfs_growfs MOUNTPOINT' : `resize2fs ${dev}`} or use lvextend -r next time.`);
      return 0;
    }
  })),
  {
    name: 'xfs_growfs', cat: 'Storage', summary: 'Grow a mounted XFS filesystem to fill its device', usage: 'xfs_growfs MOUNTPOINT', fidelity: 'functional', bin: '/usr/sbin/xfs_growfs',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 1;
      const mp = normalizePath(ctx.args.find(a => !a.startsWith('-')) || '', ctx.cwd);
      const m = sys.fs.mounts.get(mp);
      if (!m) { ctx.error(`xfs_growfs: ${mp} is not a mounted XFS filesystem`); return 1; }
      const f = sys.storage.filesystems[canonDev(sys, m.source)];
      if (f.fstype !== 'xfs') { ctx.error(`xfs_growfs: ${mp} is not a mounted XFS filesystem`); return 1; }
      const old = f.fsSize ?? f.size;
      const d = deviceExists(sys, canonDev(sys, m.source));
      f.fsSize = d.size; f.size = d.size;
      ctx.print(`meta-data=${m.source}  isize=512    agcount=4, agsize=${old * 64} blks\ndata     =                       bsize=4096   blocks=${old * 256}, imaxpct=25\n${old === d.size ? '' : `data blocks changed from ${old * 256} to ${d.size * 256}`}`);
      return 0;
    }
  },
  {
    name: 'resize2fs', cat: 'Storage', summary: 'Resize an ext2/3/4 filesystem', usage: 'resize2fs DEVICE [SIZE]', fidelity: 'functional', bin: '/usr/sbin/resize2fs',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 1;
      const dev = canonDev(sys, ctx.args.find(a => !a.startsWith('-')) || '');
      const f = sys.storage.filesystems[dev];
      if (!f || f.fstype !== 'ext4') { ctx.error(`resize2fs: Bad magic number in super-block while trying to open ${dev}`); return 1; }
      const d = deviceExists(sys, dev);
      f.fsSize = d.size;
      ctx.print(`resize2fs 1.47.1 (20-May-2024)\n${mountedAt(sys, dev) ? `Filesystem at ${dev} is mounted on ${mountedAt(sys, dev)}; on-line resizing required\n` : ''}The filesystem on ${dev} is now ${d.size * 256} (4k) blocks long.`);
      return 0;
    }
  },
  {
    name: 'xfs_info', cat: 'Storage', summary: 'Show XFS geometry', usage: 'xfs_info MOUNTPOINT|DEVICE', fidelity: 'partial', bin: '/usr/sbin/xfs_info',
    run(ctx) { const sys = ctx.sys; const t = ctx.args[0] || ''; const mp = sys.fs.mounts.get(normalizePath(t, ctx.cwd)); const dev = mp ? canonDev(sys, mp.source) : canonDev(sys, t); const f = sys.storage.filesystems[dev]; if (!f || f.fstype !== 'xfs') return fail(ctx, `${t} is not an XFS filesystem`); ctx.print(`meta-data=${dev}  isize=512    agcount=4, agsize=${(f.fsSize ?? f.size) * 64} blks\ndata     =                       bsize=4096   blocks=${(f.fsSize ?? f.size) * 256}, imaxpct=25\nnaming   =version 2              bsize=4096   ascii-ci=0, ftype=1\nlog      =internal log           bsize=4096   blocks=16384, version=2`); return 0; }
  },
  ...['pvs', 'vgs', 'lvs'].map(kind => ({ name: kind, cat: 'LVM', summary: `LVM ${kind.slice(0, 2).toUpperCase()} report`, usage: kind, fidelity: 'functional', bin: `/usr/sbin/${kind}`, run: (ctx) => lvmReport(ctx, kind) })),
  ...['pvdisplay', 'vgdisplay', 'lvdisplay'].map(name => ({
    name, cat: 'LVM', summary: 'Detailed LVM attributes', usage: name, fidelity: 'partial', bin: `/usr/sbin/${name}`,
    run(ctx) {
      const st = ctx.sys.storage;
      if (!ctx.requireRoot()) return 5;
      if (name === 'pvdisplay') for (const [d, p] of Object.entries(st.pvs)) ctx.print(`  --- Physical volume ---\n  PV Name               ${d}\n  VG Name               ${p.vg || ''}\n  PV Size               ${lvmSize(p.size)}\n  Allocatable           ${p.vg ? 'yes' : 'NO'}\n  PE Size               4.00 MiB\n  PV UUID               ${p.uuid}\n`);
      if (name === 'vgdisplay') for (const [n, v] of Object.entries(st.vgs)) { const f = vgFree(ctx.sys, n); ctx.print(`  --- Volume group ---\n  VG Name               ${n}\n  Format                lvm2\n  VG Status             resizable\n  Cur LV                ${Object.values(st.lvs).filter(l => l.vg === n).length}\n  Cur PV                ${v.pvs.length}\n  VG Size               ${lvmSize(f.size)}\n  PE Size               ${v.extent}.00 MiB\n  Total PE              ${Math.floor(f.size / v.extent)}\n  Alloc PE / Size       ${Math.floor((f.size - f.free) / v.extent)} / ${lvmSize(f.size - f.free)}\n  Free  PE / Size       ${Math.floor(f.free / v.extent)} / ${lvmSize(f.free)}\n`); }
      if (name === 'lvdisplay') for (const l of Object.values(st.lvs)) ctx.print(`  --- Logical volume ---\n  LV Path                /dev/${l.vg}/${l.name}\n  LV Name                ${l.name}\n  VG Name                ${l.vg}\n  LV Write Access        read/write\n  LV Status              available\n  LV Size                ${lvmSize(l.size)}\n  Current LE             ${l.size / 4}\n  Block device           253:${Object.values(st.lvs).indexOf(l)}\n`);
      return 0;
    }
  })),
  {
    name: 'lvremove', cat: 'LVM', summary: 'Remove a logical volume (destroys data)', usage: 'lvremove [-y] /dev/VG/LV', fidelity: 'functional', bin: '/usr/sbin/lvremove',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 5;
      const dev = canonDev(sys, ctx.args.find(a => !a.startsWith('-')) || '');
      const m = /^\/dev\/mapper\/([\w.+]+)-([\w.+]+)$/.exec(dev);
      if (!m || !sys.storage.lvs[`${m[1]}/${m[2]}`]) { ctx.error(`  Failed to find logical volume "${dev}"`); return 5; }
      if (mountedAt(sys, dev) || sys.storage.swaps.includes(dev)) { ctx.error(`  Logical volume ${m[1]}/${m[2]} contains a filesystem in use.`); return 5; }
      if (!ctx.args.includes('-y') && !ctx.args.includes('-f')) { ctx.error(`Do you really want to remove active logical volume ${m[1]}/${m[2]}? [y/n]: n\n  Logical volume ${m[2]} not removed.\n(simulator: add -y to confirm)`); return 5; }
      delete sys.storage.lvs[`${m[1]}/${m[2]}`];
      delete sys.storage.filesystems[dev];
      ctx.print(`  Logical volume "${m[2]}" successfully removed.`);
      return 0;
    }
  },
  {
    name: 'vgremove', cat: 'LVM', summary: 'Remove an empty volume group', usage: 'vgremove VG', fidelity: 'functional', bin: '/usr/sbin/vgremove',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 5;
      const vg = ctx.args.find(a => !a.startsWith('-'));
      if (!sys.storage.vgs[vg]) { ctx.error(`  Volume group "${vg}" not found`); return 5; }
      if (Object.values(sys.storage.lvs).some(l => l.vg === vg)) { ctx.error(`  Volume group "${vg}" still contains logical volumes (remove them first)`); return 5; }
      for (const p of sys.storage.vgs[vg].pvs) sys.storage.pvs[p].vg = null;
      delete sys.storage.vgs[vg];
      ctx.print(`  Volume group "${vg}" successfully removed`);
      return 0;
    }
  },
  {
    name: 'pvremove', cat: 'LVM', summary: 'Remove the LVM label from a device', usage: 'pvremove DEVICE', fidelity: 'functional', bin: '/usr/sbin/pvremove',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 5;
      const dev = canonDev(sys, ctx.args.find(a => !a.startsWith('-')) || '');
      const pv = sys.storage.pvs[dev];
      if (!pv) { ctx.error(`  No PV found on device ${dev}.`); return 5; }
      if (pv.vg) { ctx.error(`  PV ${dev} is used by VG ${pv.vg} so please use vgreduce first.`); return 5; }
      delete sys.storage.pvs[dev];
      ctx.print(`  Labels on physical volume "${dev}" successfully wiped.`);
      return 0;
    }
  },
  {
    name: 'showmount', cat: 'Storage', summary: 'List NFS exports of a server (nfs-utils)', usage: 'showmount -e SERVER', fidelity: 'partial', pkg: 'nfs-utils',
    run(ctx) {
      const sys = ctx.sys;
      const host = ctx.args.find(a => !a.startsWith('-'));
      const res = host && resolveName(sys, host);
      if (!res?.ip) { ctx.error(`clnt_create: RPC: Unknown host`); return 1; }
      if (!sys.net.reachable.includes(res.ip)) { ctx.error(`clnt_create: RPC: Timed out`); return 1; }
      const exports = Object.keys(sys.storage.nfsExports).filter(k => k.startsWith(host) || k.startsWith(`${host}.lab.example.com`));
      ctx.print(`Export list for ${host}:\n${exports.map(e => `${e.split(':')[1]} 10.10.40.0/24`).join('\n')}`);
      return 0;
    }
  }
];

/** autofs: when the service (re)starts, configured indirect maps are mounted (on-demand triggering is approximated). */
export function applyAutofs(sys, ctx) {
  const masterFiles = ['/etc/auto.master'];
  const dd = sys.fs.tryResolve('/etc/auto.master.d');
  if (dd) for (const f of sys.fs.list(dd.node)) if (f.endsWith('.autofs')) masterFiles.push(`/etc/auto.master.d/${f}`);
  const results = [];
  for (const mf of masterFiles) {
    let text = '';
    try { text = sys.fs.readFile(mf, '/'); } catch { continue; }
    for (const l of text.split('\n')) {
      const [base, map] = l.trim().split(/\s+/);
      if (!base || base.startsWith('#') || base.startsWith('+') || !map?.startsWith('/etc/') || base === '/misc') continue;
      let mapText = '';
      try { mapText = sys.fs.readFile(map, '/'); } catch { results.push(`autofs: map ${map} not found`); continue; }
      if (!sys.fs.exists(base)) sys.fs.create(base, '/', S_IFDIR, { mode: 0o755, umask: 0 });
      for (const ml of mapText.split('\n')) {
        const parts = ml.trim().split(/\s+/);
        if (parts.length < 2 || parts[0].startsWith('#')) continue;
        const key = parts[0];
        const source = parts[parts.length - 1].replace(/^:/, '');
        const opts = parts.length === 3 ? parts[1].replace(/^-/, '').replace(/fstype=\w+,?/, '') || 'defaults' : 'defaults';
        const mp = `${base}/${key}`;
        if (sys.fs.mounts.has(mp)) continue;
        if (!sys.fs.exists(mp)) sys.fs.create(mp, '/', S_IFDIR, { mode: 0o755, umask: 0 });
        const code = doMount(ctx, source, mp, { options: opts, quiet: true });
        results.push(code ? `autofs: failed to mount ${mp} from ${source}` : `autofs: mounted ${mp} from ${source}`);
      }
    }
  }
  return results;
}
