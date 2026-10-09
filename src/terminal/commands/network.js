// Networking: a small but consistent model of interfaces, routes, DNS, sockets and firewalld.
import { S_IFDIR, normalizePath } from '../vfs.js';
import { userByName, ctxType, HOSTNAME } from '../system.js';
import { getopt, columns } from './util.js';
import { listeningSockets } from './proc.js';
import { avc } from './services.js';

const fail = (ctx, msg, code = 1) => { ctx.error(`${ctx.name}: ${msg}`); return code; };

export const FW_SERVICES = {
  ssh: [['tcp', 22]], http: [['tcp', 80]], https: [['tcp', 443]], cockpit: [['tcp', 9090]], 'dhcpv6-client': [['udp', 546]],
  mysql: [['tcp', 3306]], postgresql: [['tcp', 5432]], nfs: [['tcp', 2049]], mountd: [['tcp', 20048], ['udp', 20048]], 'rpc-bind': [['tcp', 111], ['udp', 111]],
  dns: [['tcp', 53], ['udp', 53]], ntp: [['udp', 123]], samba: [['tcp', 139], ['tcp', 445]], mdns: [['udp', 5353]], 'samba-client': [['udp', 137], ['udp', 138]], smtp: [['tcp', 25]],
  'http3': [['udp', 443]], ftp: [['tcp', 21]], 'prometheus-node-exporter': [['tcp', 9100]]
};

const ipToInt = (ip) => ip.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
export function inSubnet(ip, cidr) {
  const [net, bits] = cidr.split('/');
  const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(net) & mask);
}
const isIPv4 = (s) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s);

function localAddrs(sys) {
  return ['127.0.0.1', ...sys.net.interfaces.filter(i => i.up).flatMap(i => i.ipv4.map(a => a.split('/')[0]))];
}

/** Resolve a hostname like glibc would: /etc/hosts first (nsswitch "files dns"), then DNS. */
export function resolveName(sys, name) {
  if (isIPv4(name)) return { ip: name, via: 'literal' };
  if (name === 'localhost') return { ip: '127.0.0.1', via: 'files' };
  try {
    const hosts = sys.fs.readFile('/etc/hosts', '/');
    for (const l of hosts.split('\n')) {
      const parts = l.replace(/#.*/, '').trim().split(/\s+/);
      if (parts.length > 1 && parts.slice(1).includes(name)) return { ip: parts[0], via: 'files' };
    }
  } catch { /* no hosts file */ }
  const dns = dnsQuery(sys, name);
  if (dns.status === 'NOERROR') return { ip: dns.ip, via: 'dns', server: dns.server };
  return { ip: null, error: dns.status, server: dns.server };
}

export function nameservers(sys) {
  try { return sys.fs.readFile('/etc/resolv.conf', '/').split('\n').map(l => /^\s*nameserver\s+(\S+)/.exec(l)).filter(Boolean).map(m => m[1]); } catch { return []; }
}

export function dnsQuery(sys, name, server) {
  const servers = server ? [server] : nameservers(sys);
  if (!servers.length) return { status: 'NOSERVERS' };
  for (const s of servers) {
    if (s === '10.10.40.2' && !sys.net.dnsServerUp) continue;
    if (!routeTo(sys, s).ok || !sys.net.reachable.includes(s)) continue;
    const fq = sys.net.dns[name] ? name : sys.net.dns[`${name}.lab.example.com`] ? `${name}.lab.example.com` : null;
    if (fq) return { status: 'NOERROR', ip: sys.net.dns[fq], server: s, fqdn: fq };
    return { status: 'NXDOMAIN', server: s };
  }
  return { status: 'TIMEOUT', server: servers[0] };
}

/** Is there a usable route to the destination? */
export function routeTo(sys, ip) {
  if (localAddrs(sys).includes(ip) || ip.startsWith('127.')) return { ok: true, dev: 'lo', local: true };
  const ifaces = sys.net.interfaces.filter(i => i.up);
  for (const r of sys.net.routes) {
    if (r.dest === 'default') continue;
    const iface = ifaces.find(i => i.name === r.dev);
    if (iface && inSubnet(ip, r.dest)) return { ok: true, dev: r.dev, direct: true };
  }
  const def = sys.net.routes.find(r => r.dest === 'default' && ifaces.some(i => i.name === r.dev));
  if (!def) return { ok: false, reason: 'Network is unreachable' };
  const gwOk = sys.net.reachable.includes(def.via) && sys.net.routes.some(r => r.dest !== 'default' && r.dev === def.dev && inSubnet(def.via, r.dest));
  return { ok: gwOk, dev: def.dev, via: def.via, reason: gwOk ? null : 'gateway unreachable' };
}

function hostReachable(sys, ip) {
  const r = routeTo(sys, ip);
  if (!r.ok) return { ok: false, reason: r.reason };
  if (r.local) return { ok: true };
  return { ok: sys.net.reachable.includes(ip), reason: 'timeout' };
}

/** Evaluate whether an inbound TCP/UDP connection from `src` to local `port` passes firewalld. */
export function firewallAllows(sys, port, proto = 'tcp', src = '10.10.40.50') {
  if (!sys.firewall.running) return true;
  const zoneName = Object.entries(sys.firewall.runtime).find(([, z]) => z.sources.some(s => (s.includes('/') ? inSubnet(src, s) : s === src)))?.[0]
    || Object.entries(sys.firewall.runtime).find(([, z]) => z.interfaces.includes('ens192'))?.[0] || sys.firewall.defaultZone;
  const z = sys.firewall.runtime[zoneName];
  if (z.target === 'ACCEPT') return true;
  for (const rule of z.richRules) {
    const m = /source address="([^"]+)".*port port="(\d+)" protocol="(\w+)"\s+(accept|reject|drop)/.exec(rule) || /source address="([^"]+)".*service name="([\w-]+)"\s+(accept|reject|drop)/.exec(rule);
    if (!m) continue;
    const addrOk = m[1].includes('/') ? inSubnet(src, m[1]) : m[1] === src;
    const portOk = m.length === 5 ? Number(m[2]) === port && m[3] === proto : (FW_SERVICES[m[2]] || []).some(([p, n]) => p === proto && n === port);
    if (addrOk && portOk) return m[m.length - 1] === 'accept';
  }
  if (z.ports.some(p => p === `${port}/${proto}` || (p.includes('-') && p.endsWith('/' + proto) && (() => { const [a, b] = p.split('/')[0].split('-').map(Number); return port >= a && port <= b; })()))) return true;
  if (z.services.some(s => (FW_SERVICES[s] || []).some(([p, n]) => p === proto && n === port))) return true;
  return false;
}

/** Simulate an HTTP request to this host (curl from localhost or from the lab client). */
export function localHttp(sys, port, path) {
  const sock = listeningSockets(sys).find(s => s.port === port && s.proto === 'tcp');
  if (!sock) return { refused: true };
  const httpd = sys.services.httpd;
  if (sock.pid === httpd.pid || sock.proc === 'httpd') {
    let conf = '';
    try { conf = sys.fs.readFile('/etc/httpd/conf/httpd.conf', '/'); } catch { /* ignore */ }
    const docRoot = (/^\s*DocumentRoot\s+"?([^"\s]+)"?/m.exec(conf) || [])[1] || '/var/www/html';
    const proxy = /^\s*ProxyPass\s+(\S+)\s+http:\/\/127\.0\.0\.1:(\d+)/m.exec(conf);
    if (proxy && path.startsWith(proxy[1])) {
      if (sys.selinux.mode === 'enforcing' && !sys.selinux.booleans.httpd_can_network_connect) {
        avc(sys, 'name_connect', 'httpd', `dest=${proxy[2]} scontext=system_u:system_r:httpd_t:s0 tcontext=system_u:object_r:unreserved_port_t:s0 tclass=tcp_socket`);
        return { status: 503, body: '<h1>Service Unavailable</h1>', reason: 'SELinux blocked httpd from connecting to the backend port (httpd_can_network_connect is off)' };
      }
      const backend = listeningSockets(sys).find(s => s.port === Number(proxy[2]));
      if (!backend) return { status: 503, body: '<h1>Service Unavailable</h1>' };
      return { status: 200, body: '{"status":"ok","backend":"app"}' };
    }
    let file = normalizePath(path === '/' ? '/index.html' : path, '/');
    const full = normalizePath(docRoot + file, '/');
    const r = sys.fs.tryResolve(full);
    const dr = sys.fs.tryResolve(docRoot);
    if (!dr) return { status: 404, body: '<h1>Not Found</h1>' };
    if (!r) return { status: path === '/' ? 403 : 404, body: path === '/' ? '<h1>Forbidden (no index.html; directory listing disabled)</h1>' : '<h1>Not Found</h1>' };
    const apache = { uid: 48, gid: 48, groups: [] };
    // DAC: every directory needs x for apache, the file needs r.
    let p = '/';
    for (const part of full.split('/').filter(Boolean)) {
      const d = sys.fs.resolve(p).node;
      if (!sys.fs.can(d, 'x', apache)) return { status: 403, body: '<h1>Forbidden</h1>', reason: `apache lacks execute (search) permission on ${p}` };
      p = normalizePath(part, p);
    }
    if (!sys.fs.can(r.node, 'r', apache)) return { status: 403, body: '<h1>Forbidden</h1>', reason: `apache cannot read ${full} (DAC permissions)` };
    const okTypes = ['httpd_sys_content_t', 'httpd_sys_rw_content_t', 'public_content_t', 'httpd_sys_script_exec_t'];
    if (sys.selinux.mode === 'enforcing' && !okTypes.includes(ctxType(r.node.ctx))) {
      avc(sys, 'read', 'httpd', `name="${full.split('/').pop()}" dev="dm-0" ino=${r.node.ino} scontext=system_u:system_r:httpd_t:s0 tcontext=${r.node.ctx} tclass=file`);
      return { status: 403, body: '<h1>Forbidden</h1>', reason: `SELinux: file type ${ctxType(r.node.ctx)} is not readable by httpd_t` };
    }
    return { status: 200, body: r.node.data || '' };
  }
  return { status: 200, body: `(simulated response from ${sock.proc} on port ${port})` };
}

function curlLike(ctx, wget) {
  const sys = ctx.sys;
  const { o, rest } = getopt(ctx.args, 'IivskLfSqO', 'oXHmw', { head: 'I', include: 'i', verbose: 'v', silent: 's', insecure: 'k', location: 'L', output: '=o', fail: 'f', 'max-time': '=m', 'connect-timeout': '=m' });
  const url = rest[0];
  if (!url) return fail(ctx, wget ? 'missing URL' : 'no URL specified', 2);
  const m = /^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url);
  if (!m) return fail(ctx, `(3) URL rejected: Malformed input to a URL function`, 3);
  const scheme = m[1] || 'http', host = m[2], port = Number(m[3] || (scheme === 'https' ? 443 : 80)), path = m[4] || '/';
  const res = resolveName(sys, host);
  if (!res.ip) { ctx.error(wget ? `wget: unable to resolve host address '${host}'` : `curl: (6) Could not resolve host: ${host}`); return wget ? 4 : 6; }
  if (o.v) ctx.error(`*   Trying ${res.ip}:${port}...`);
  const local = localAddrs(sys).includes(res.ip) || res.ip.startsWith('127.');
  let resp;
  if (local) {
    resp = localHttp(sys, port, path);
    if (resp.refused) { ctx.error(wget ? `Connecting to ${host} (${host})|${res.ip}|:${port}... failed: Connection refused.` : `curl: (7) Failed to connect to ${host} port ${port} after 0 ms: Couldn't connect to server`); return wget ? 4 : 7; }
    if (scheme === 'https' && sys.certExpired) { ctx.error('curl: (60) SSL certificate problem: certificate has expired\nMore details here: https://curl.se/docs/sslcerts.html'); return 60; }
  } else {
    const reach = hostReachable(sys, res.ip);
    if (!reach.ok) { ctx.error(wget ? `Connecting to ${host}|${res.ip}|:${port}... failed: ${reach.reason === 'Network is unreachable' ? 'Network is unreachable' : 'Connection timed out'}.` : reach.reason === 'Network is unreachable' ? `curl: (7) Failed to connect to ${host} port ${port}: Network is unreachable` : `curl: (28) Failed to connect to ${host} port ${port} after 10001 ms: Timeout was reached`); return wget ? 4 : reach.reason === 'Network is unreachable' ? 7 : 28; }
    const ports = sys.net.remotePorts[res.ip] || [];
    if (!ports.includes(port)) { ctx.error(`curl: (7) Failed to connect to ${host} port ${port} after 2 ms: Connection refused`); return 7; }
    resp = { status: 200, body: `<html><body>${host} OK</body></html>` };
  }
  const reasonText = { 200: 'OK', 403: 'Forbidden', 404: 'Not Found', 503: 'Service Unavailable' }[resp.status];
  const headers = `HTTP/1.1 ${resp.status} ${reasonText}\nDate: ${new Date(sys.clock()).toUTCString()}\nServer: ${local ? 'Apache/2.4.63 (Red Hat Enterprise Linux)' : 'nginx'}\nContent-Length: ${resp.body.length}\nContent-Type: text/html; charset=UTF-8`;
  if (o.v) ctx.error(`* Connected to ${host} (${res.ip}) port ${port}\n> GET ${path} HTTP/1.1\n> Host: ${host}\n> User-Agent: curl/8.9.1\n>\n< ${headers.split('\n').join('\n< ')}\n<`);
  if (wget) {
    ctx.error(`--${new Date(sys.clock()).toISOString().slice(0, 19).replace('T', ' ')}--  ${url}\nConnecting to ${host} (${host})|${res.ip}|:${port}... connected.\nHTTP request sent, awaiting response... ${resp.status} ${reasonText}`);
    if (resp.status >= 400) { ctx.error(`${new Date(sys.clock()).toISOString().slice(0, 19).replace('T', ' ')} ERROR ${resp.status}: ${reasonText}.`); return 8; }
    const out = o.O && typeof o.O === 'string' ? o.O : (path.split('/').pop() || 'index.html');
    sys.fs.writeFile(out, ctx.cwd, resp.body, { user: ctx.user, umask: sys.session.umask });
    ctx.error(`Saving to: '${out}'\n\n'${out}' saved [${resp.body.length}/${resp.body.length}]`);
    return 0;
  }
  if (o.f && resp.status >= 400) { ctx.error(`curl: (22) The requested URL returned error: ${resp.status}`); return 22; }
  if (o.I) { ctx.print(headers); return 0; }
  const body = (o.i ? headers + '\n\n' : '') + resp.body;
  if (o.o) { sys.fs.writeFile(o.o, ctx.cwd, resp.body, { user: ctx.user, umask: sys.session.umask }); return 0; }
  ctx.write(body.endsWith('\n') ? body : body + '\n');
  return 0;
}

function ipCommand(ctx) {
  const sys = ctx.sys;
  const args = ctx.args.slice();
  const brief = args[0] === '-br' || args[0] === '-brief';
  const stats = args[0] === '-s';
  if (brief || stats || args[0] === '-4' || args[0] === '-6') args.shift();
  const obj = args.shift() || 'help';
  const verb = args[0] || 'show';
  const devArg = args.includes('dev') ? args[args.indexOf('dev') + 1] : args.find(a => sys.net.interfaces.some(i => i.name === a));
  const ifaces = sys.net.interfaces.filter(i => !devArg || i.name === devArg);
  if (devArg && !ifaces.length) { ctx.error(`Device "${devArg}" does not exist.`); return 1; }
  const flags = (i) => (i.name === 'lo' ? 'LOOPBACK,UP,LOWER_UP' : i.up ? 'BROADCAST,MULTICAST,UP,LOWER_UP' : 'BROADCAST,MULTICAST');
  if (['a', 'addr', 'address'].includes(obj)) {
    if (verb === 'add' || verb === 'del') {
      if (!ctx.requireRoot('ip')) return 1;
      const iface = sys.net.interfaces.find(i => i.name === devArg);
      const addr = args[1];
      if (!iface || !/\/\d+$/.test(addr)) return fail(ctx, 'usage: ip addr add|del ADDR/PREFIX dev IFACE');
      const list = addr.includes(':') ? iface.ipv6 : iface.ipv4;
      if (verb === 'add') { if (list.includes(addr)) { ctx.error('RTNETLINK answers: File exists'); return 2; } list.push(addr); }
      else { const i = list.indexOf(addr); if (i < 0) { ctx.error('RTNETLINK answers: Cannot assign requested address'); return 2; } list.splice(i, 1); }
      return 0;
    }
    ifaces.forEach((i, n) => {
      if (brief) { ctx.print(`${i.name.padEnd(16)} ${(i.up ? (i.name === 'lo' ? 'UNKNOWN' : 'UP') : 'DOWN').padEnd(14)} ${[...i.ipv4, ...i.ipv6].join(' ')}`); return; }
      ctx.print(`${sys.net.interfaces.indexOf(i) + 1}: ${i.name}: <${flags(i)}> mtu ${i.mtu} qdisc ${i.name === 'lo' ? 'noqueue' : 'mq'} state ${i.name === 'lo' ? 'UNKNOWN' : i.up ? 'UP' : 'DOWN'} group default qlen 1000`);
      ctx.print(`    link/${i.name === 'lo' ? 'loopback' : 'ether'} ${i.mac} brd ${i.name === 'lo' ? '00:00:00:00:00:00' : 'ff:ff:ff:ff:ff:ff'}`);
      for (const a of i.ipv4) ctx.print(`    inet ${a} ${i.name === 'lo' ? 'scope host lo' : `brd ${a.split('/')[0].split('.').slice(0, 3).join('.')}.255 scope global noprefixroute ${i.name}`}\n       valid_lft forever preferred_lft forever`);
      for (const a of i.ipv6) ctx.print(`    inet6 ${a} scope ${a.startsWith('fe80') ? 'link' : a === '::1/128' ? 'host' : 'global'} noprefixroute \n       valid_lft forever preferred_lft forever`);
      void n;
    });
    return 0;
  }
  if (obj === 'link' || obj === 'l') {
    if (verb === 'set') {
      if (!ctx.requireRoot('ip')) return 1;
      const iface = sys.net.interfaces.find(i => i.name === devArg);
      if (!iface) return fail(ctx, 'Cannot find device');
      if (args.includes('up')) { iface.up = true; iface.state = 'UP'; }
      if (args.includes('down')) { iface.up = false; iface.state = 'DOWN'; }
      if (args.includes('mtu')) iface.mtu = Number(args[args.indexOf('mtu') + 1]);
      return 0;
    }
    for (const i of ifaces) {
      if (brief) { ctx.print(`${i.name.padEnd(16)} ${(i.up ? 'UP' : 'DOWN').padEnd(14)} ${i.mac} <${flags(i)}>`); continue; }
      ctx.print(`${sys.net.interfaces.indexOf(i) + 1}: ${i.name}: <${flags(i)}> mtu ${i.mtu} qdisc mq state ${i.up ? 'UP' : 'DOWN'} mode DEFAULT group default qlen 1000\n    link/ether ${i.mac} brd ff:ff:ff:ff:ff:ff`);
      if (stats) ctx.print(`    RX:  bytes packets errors dropped  missed   mcast\n    ${String(i.rx * 1000).padStart(10)} ${String(i.rx).padStart(7)} ${String(i.rxErrors || 0).padStart(6)} ${String(i.rxDropped || 0).padStart(7)}       0       0\n    TX:  bytes packets errors dropped carrier collsns\n    ${String(i.tx * 1000).padStart(10)} ${String(i.tx).padStart(7)}      0       0       0       0`);
    }
    return 0;
  }
  if (['r', 'route', 'ro'].includes(obj)) {
    if (verb === 'get') {
      const ip = args[1];
      const r = routeTo(sys, ip);
      if (!r.ok && r.reason === 'Network is unreachable') { ctx.error('RTNETLINK answers: Network is unreachable'); return 2; }
      ctx.print(`${ip} ${r.via ? `via ${r.via} ` : ''}dev ${r.dev} src ${sys.net.interfaces.find(i => i.name === r.dev)?.ipv4[0]?.split('/')[0] || '127.0.0.1'} uid 0\n    cache`);
      return 0;
    }
    if (verb === 'add' || verb === 'del') {
      if (!ctx.requireRoot('ip')) return 1;
      const dest = args[1];
      const via = args.includes('via') ? args[args.indexOf('via') + 1] : undefined;
      if (verb === 'add') {
        if (sys.net.routes.some(r => r.dest === dest)) { ctx.error('RTNETLINK answers: File exists'); return 2; }
        const dev = devArg || sys.net.routes.find(r => r.dest !== 'default' && via && inSubnet(via, r.dest))?.dev || 'ens192';
        sys.net.routes.push({ dest, via, dev, proto: 'static', metric: 100 });
      } else {
        const i = sys.net.routes.findIndex(r => r.dest === dest);
        if (i < 0) { ctx.error('RTNETLINK answers: No such process'); return 2; }
        sys.net.routes.splice(i, 1);
      }
      return 0;
    }
    for (const r of sys.net.routes) ctx.print(`${r.dest}${r.via ? ` via ${r.via}` : ''} dev ${r.dev} proto ${r.proto}${r.scope ? ` scope ${r.scope}` : ''}${r.src ? ` src ${r.src}` : ''} metric ${r.metric}`);
    return 0;
  }
  if (obj === 'neigh' || obj === 'n') {
    ctx.print(`10.10.40.1 dev ens192 lladdr 00:1c:73:aa:01:01 REACHABLE\n10.10.40.2 dev ens192 lladdr 00:50:56:a1:00:02 STALE\n10.10.40.50 dev ens192 lladdr 00:50:56:a1:00:50 REACHABLE`);
    return 0;
  }
  ctx.error(`Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\nwhere  OBJECT := { address | link | route | neigh }\n(simulator supports: ip [-br] addr|link|route|neigh, ip route get, ip addr add/del, ip link set, ip route add/del)`);
  return obj === 'help' ? 0 : 1;
}

function writeKeyfile(sys, c) {
  const path = `/etc/NetworkManager/system-connections/${c.name}.nmconnection`;
  const text = `[connection]\nid=${c.name}\nuuid=${c.uuid}\ntype=${c.type}\ninterface-name=${c.device}\nautoconnect=${c.autoconnect === 'no' ? 'false' : 'true'}\n\n[ipv4]\nmethod=${c.method}\n${c.addresses.map((a, i) => `address${i + 1}=${a}${i === 0 && c.gateway ? ',' + c.gateway : ''}`).join('\n')}\n${c.dns.length ? `dns=${c.dns.join(';')};\n` : ''}\n[ipv6]\nmethod=${c.ipv6method || 'auto'}\n${(c.ipv6addresses || []).map((a, i) => `address${i + 1}=${a}${i === 0 && c.ipv6gateway ? ',' + c.ipv6gateway : ''}`).join('\n')}\n`;
  if (!sys.fs.exists('/etc/NetworkManager/system-connections')) sys.fs.create('/etc/NetworkManager/system-connections', '/', S_IFDIR, { mode: 0o700, umask: 0 });
  const n = sys.fs.writeFile(path, '/', text, {});
  n.mode = 0o600;
}

function nmcli(ctx) {
  const sys = ctx.sys;
  const args = ctx.args.filter(a => a !== '-p' && a !== '--pretty');
  const terse = args[0] === '-t' ? args.shift() : null;
  void terse;
  const obj = args.shift() || '';
  const verb = args.shift() || 'show';
  const conns = sys.net.connections;
  const devState = (i) => (i.name === 'lo' ? 'connected (externally)' : i.up && i.connection ? 'connected' : 'disconnected');
  if (!obj) {
    for (const i of sys.net.interfaces.filter(x => x.name !== 'lo')) ctx.print(`${i.name}: ${devState(i)}${i.connection ? ` to ${i.connection}` : ''}\n        ethernet (vmxnet3), ${i.mac.toUpperCase()}, hw, mtu ${i.mtu}\n${i.ipv4.map(a => `        inet4 ${a}`).join('\n')}\n`);
    ctx.print(`DNS configuration:\n        servers: ${nameservers(sys).join(' ')}\n        domains: lab.example.com\n        interface: ens192`);
    return 0;
  }
  if (obj.startsWith('d')) {
    if (verb === 'status' || verb === 'show' || verb === 's') {
      ctx.print(columns([['DEVICE', 'TYPE', 'STATE', 'CONNECTION'], ...sys.net.interfaces.map(i => [i.name, i.name === 'lo' ? 'loopback' : 'ethernet', devState(i), i.name === 'lo' ? 'lo' : i.connection || '--'])]));
      return 0;
    }
    if (verb === 'connect' || verb === 'disconnect') { if (!ctx.requireRoot('nmcli')) return 1; const i = sys.net.interfaces.find(x => x.name === args[0]); if (!i) return fail(ctx, `Error: Device '${args[0]}' not found.`, 10); i.up = verb === 'connect'; ctx.print(`Device '${i.name}' successfully ${verb === 'connect' ? 'activated' : 'disconnected'}.`); return 0; }
  }
  if (obj.startsWith('c')) {
    const name = args[0];
    if (verb === 'show' || verb === 's') {
      if (name) {
        const c = conns[name];
        if (!c) return fail(ctx, `Error: ${name} - no such connection profile.`, 10);
        ctx.print(`connection.id:                          ${c.name}\nconnection.uuid:                        ${c.uuid}\nconnection.type:                        802-3-ethernet\nconnection.interface-name:              ${c.device}\nconnection.autoconnect:                 ${c.autoconnect}\nipv4.method:                            ${c.method}\nipv4.dns:                               ${c.dns.join(',')}\nipv4.addresses:                         ${c.addresses.join(', ')}\nipv4.gateway:                           ${c.gateway || '--'}\nipv6.method:                            ${c.ipv6method || 'auto'}\nipv6.addresses:                         ${(c.ipv6addresses || []).join(', ') || '--'}\nipv6.gateway:                           ${c.ipv6gateway || '--'}\nGENERAL.STATE:                          ${sys.net.interfaces.find(i => i.connection === c.name && i.up) ? 'activated' : '--'}`);
        return 0;
      }
      ctx.print(columns([['NAME', 'UUID', 'TYPE', 'DEVICE'], ...Object.values(conns).map(c => [c.name, c.uuid, 'ethernet', sys.net.interfaces.find(i => i.connection === c.name && i.up) ? c.device : '--']), ['lo', 'b1a7e1f0-3b1c-4c7e-8a1a-0a2f2e5e4d11', 'loopback', 'lo']]));
      return 0;
    }
    if (!ctx.requireRoot('nmcli')) return 1;
    if (verb === 'reload') return 0;
    if (verb === 'add') {
      const kv = parseKv(args);
      const cname = kv['con-name'] || `${kv.type || 'ethernet'}-${kv.ifname}`;
      if (conns[cname]) return fail(ctx, `Error: Connection '${cname}' already exists.`, 2);
      const c = { name: cname, uuid: crypto.randomUUID?.() || 'a1b2c3d4-0000-4000-8000-' + Date.now().toString(16).slice(-12), type: 'ethernet', device: kv.ifname, method: kv['ipv4.method'] || 'auto', addresses: (kv['ipv4.addresses'] || kv.ip4 || '').split(',').filter(Boolean), gateway: kv['ipv4.gateway'] || kv.gw4 || '', dns: (kv['ipv4.dns'] || '').split(/[ ,]/).filter(Boolean), autoconnect: kv.autoconnect || 'yes', ipv6method: kv['ipv6.method'] || 'auto', ipv6addresses: (kv['ipv6.addresses'] || '').split(',').filter(Boolean), ipv6gateway: kv['ipv6.gateway'] || '' };
      if (c.addresses.length && !kv['ipv4.method']) c.method = 'manual';
      conns[cname] = c;
      writeKeyfile(sys, c);
      ctx.print(`Connection '${cname}' (${c.uuid}) successfully added.`);
      return 0;
    }
    const c = conns[name];
    if (!c) return fail(ctx, `Error: unknown connection '${name}'.`, 10);
    if (verb === 'modify' || verb === 'mod' || verb === 'm') {
      const pairs = args.slice(1);
      for (let i = 0; i < pairs.length; i += 2) {
        let key = pairs[i];
        const val = pairs[i + 1] ?? '';
        const add = key.startsWith('+'), del = key.startsWith('-');
        key = key.replace(/^[+-]/, '');
        const listSet = (field, v) => { const items = v.split(/[ ,]+/).filter(Boolean); if (add) c[field] = [...new Set([...(c[field] || []), ...items])]; else if (del) c[field] = (c[field] || []).filter(x => !items.includes(x)); else c[field] = items; };
        switch (key) {
          case 'ipv4.addresses': case 'ip4': listSet('addresses', val); break;
          case 'ipv4.gateway': case 'gw4': c.gateway = val; break;
          case 'ipv4.dns': listSet('dns', val); break;
          case 'ipv4.method': if (!['auto', 'manual', 'disabled', 'link-local', 'shared'].includes(val)) return fail(ctx, `Error: failed to modify ipv4.method: '${val}' not among [auto, link-local, manual, shared, disabled].`, 2); c.method = val; break;
          case 'ipv6.addresses': case 'ip6': listSet('ipv6addresses', val); break;
          case 'ipv6.gateway': case 'gw6': c.ipv6gateway = val; break;
          case 'ipv6.method': c.ipv6method = val; break;
          case 'connection.autoconnect': case 'autoconnect': c.autoconnect = val; break;
          case 'ipv4.dns-search': break;
          default: return fail(ctx, `Error: invalid <setting>.<property> '${key}'.`, 2);
        }
      }
      if (c.method === 'manual' && !c.addresses.length) return fail(ctx, 'Error: Failed to modify connection: ipv4.addresses: this property cannot be empty for \'method=manual\'', 2);
      writeKeyfile(sys, c);
      return 0;
    }
    if (verb === 'up') {
      const iface = sys.net.interfaces.find(i => i.name === c.device);
      if (!iface) return fail(ctx, `Error: Connection activation failed: No suitable device found for this connection (device ${c.device} not available).`, 4);
      iface.up = true; iface.state = 'UP'; iface.connection = c.name;
      iface.ipv4 = c.method === 'manual' ? c.addresses.slice() : iface.ipv4;
      iface.ipv6 = [...(c.ipv6addresses || []), ...iface.ipv6.filter(a => a.startsWith('fe80'))];
      sys.net.routes = sys.net.routes.filter(r => r.dev !== iface.name);
      for (const a of iface.ipv4) {
        const [ip, bits] = a.split('/');
        const mask = (~0 << (32 - Number(bits))) >>> 0;
        const net = [24, 16, 8, 0].map(s => ((ipToInt(ip) & mask) >>> s) & 255).join('.');
        sys.net.routes.push({ dest: `${net}/${bits}`, dev: iface.name, proto: 'kernel', scope: 'link', src: ip, metric: 100 });
      }
      if (c.gateway) sys.net.routes.unshift({ dest: 'default', via: c.gateway, dev: iface.name, proto: 'static', metric: 100 });
      if (c.dns.length) sys.fs.writeFile('/etc/resolv.conf', '/', `# Generated by NetworkManager\nsearch lab.example.com\n${c.dns.map(d => `nameserver ${d}`).join('\n')}\n`, {});
      ctx.print(`Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/${Object.keys(conns).indexOf(c.name) + 3})`);
      return 0;
    }
    if (verb === 'down') { const iface = sys.net.interfaces.find(i => i.connection === c.name); if (iface) { iface.up = false; sys.net.routes = sys.net.routes.filter(r => r.dev !== iface.name); } ctx.print(`Connection '${c.name}' successfully deactivated.`); return 0; }
    if (verb === 'delete' || verb === 'del') { delete conns[c.name]; const r = sys.fs.tryResolve(`/etc/NetworkManager/system-connections/${c.name}.nmconnection`); if (r) sys.fs.unlink(r.parent, r.name); ctx.print(`Connection '${c.name}' (${c.uuid}) successfully deleted.`); return 0; }
  }
  if (obj.startsWith('g')) {
    if (verb === 'hostname') { if (args[0]) { if (!ctx.requireRoot('nmcli')) return 1; sys.hostname = args[0]; sys.fs.writeFile('/etc/hostname', '/', args[0] + '\n'); } else ctx.print(sys.hostname); return 0; }
    ctx.print('STATE      CONNECTIVITY  WIFI-HW  WIFI     WWAN-HW  WWAN\nconnected  full          missing  enabled  missing  enabled');
    return 0;
  }
  return fail(ctx, `Error: argument '${obj}' not understood. Try passing --help instead.`, 2);
}

function parseKv(args) {
  const kv = {};
  for (let i = 0; i < args.length; i += 2) kv[args[i]] = args[i + 1];
  return kv;
}

function firewallCmd(ctx) {
  const sys = ctx.sys;
  const fw = sys.firewall;
  const args = ctx.args;
  if (args.includes('--state')) { ctx.print(fw.running && sys.services.firewalld.active === 'active' ? 'running' : 'not running'); return fw.running ? 0 : 252; }
  if (sys.services.firewalld.active !== 'active') { ctx.print('FirewallD is not running'); return 252; }
  const permanent = args.includes('--permanent');
  const zoneArg = (args.find(a => a.startsWith('--zone=')) || '').split('=')[1];
  const store = permanent ? fw.permanent : fw.runtime;
  const zoneName = zoneArg || fw.defaultZone;
  const zone = store[zoneName];
  const readOnly = ['--list-all', '--list-services', '--list-ports', '--list-rich-rules', '--get-default-zone', '--get-active-zones', '--get-zones', '--get-services', '--list-all-zones', '--list-sources', '--list-interfaces'];
  const mutating = args.some(a => /^--(add|remove|set|change|reload|runtime-to-permanent|complete-reload|new-zone)/.test(a));
  if (mutating && !ctx.isRoot()) { ctx.error('Authorization failed.\n    Make sure polkit agent is running or run the application as superuser.'); return 252; }
  if (zoneArg && !zone) { ctx.error(`Error: INVALID_ZONE: ${zoneArg}`); return 112; }
  let code = 0;
  let printedSuccess = false;
  const ok = () => { if (!printedSuccess) { ctx.print('success'); printedSuccess = true; } };
  for (const a of args) {
    const [flag, value] = a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, undefined];
    switch (flag) {
      case '--reload': case '--complete-reload': fw.runtime = structuredClone(fw.permanent); ok(); break;
      case '--runtime-to-permanent': fw.permanent = structuredClone(fw.runtime); ok(); break;
      case '--get-default-zone': ctx.print(fw.defaultZone); break;
      case '--set-default-zone': if (!fw.runtime[value]) { ctx.error(`Error: INVALID_ZONE: ${value}`); code = 112; break; } { const iface = 'ens192'; for (const s of [fw.runtime, fw.permanent]) for (const z of Object.values(s)) z.interfaces = z.interfaces.filter(i => i !== iface); fw.runtime[value].interfaces.push(iface); fw.permanent[value].interfaces.push(iface); fw.defaultZone = value; } ok(); break;
      case '--get-zones': ctx.print(Object.keys(store).join(' ')); break;
      case '--get-active-zones': for (const [n, z] of Object.entries(fw.runtime)) if (z.interfaces.length || z.sources.length) ctx.print(`${n}${n === fw.defaultZone ? ' (default)' : ''}\n${z.interfaces.length ? `  interfaces: ${z.interfaces.join(' ')}\n` : ''}${z.sources.length ? `  sources: ${z.sources.join(' ')}` : ''}`.trimEnd()); break;
      case '--get-services': ctx.print(Object.keys(FW_SERVICES).sort().join(' ')); break;
      case '--list-services': ctx.print(zone.services.join(' ')); break;
      case '--list-ports': ctx.print(zone.ports.join(' ')); break;
      case '--list-rich-rules': ctx.print(zone.richRules.join('\n')); break;
      case '--list-sources': ctx.print(zone.sources.join(' ')); break;
      case '--list-interfaces': ctx.print(zone.interfaces.join(' ')); break;
      case '--list-all': case '--list-all-zones': {
        const zones = flag === '--list-all' ? [[zoneName, zone]] : Object.entries(store);
        for (const [n, z] of zones) ctx.print(`${n}${(z.interfaces.length || z.sources.length) && !permanent ? ' (active)' : ''}\n  target: ${z.target}\n  icmp-block-inversion: no\n  interfaces: ${z.interfaces.join(' ')}\n  sources: ${z.sources.join(' ')}\n  services: ${z.services.join(' ')}\n  ports: ${z.ports.join(' ')}\n  protocols: \n  forward: yes\n  masquerade: no\n  forward-ports: \n  source-ports: \n  icmp-blocks: \n  rich rules: \n${z.richRules.map(r => `\t${r}`).join('\n')}`.trimEnd());
        break;
      }
      case '--add-service': case '--remove-service': {
        for (const s of value.split(',')) {
          if (!FW_SERVICES[s]) { ctx.error(`Error: INVALID_SERVICE: '${s}' not among existing services`); code = 101; continue; }
          if (flag === '--add-service') { if (zone.services.includes(s)) ctx.error(`Warning: ALREADY_ENABLED: '${s}' already in '${zoneName}'`); else zone.services.push(s); }
          else { if (!zone.services.includes(s)) ctx.error(`Warning: NOT_ENABLED: '${s}' not in '${zoneName}'`); zone.services = zone.services.filter(x => x !== s); }
        }
        if (!code) ok();
        break;
      }
      case '--add-port': case '--remove-port': {
        for (const p of value.split(',')) {
          if (!/^\d+(-\d+)?\/(tcp|udp|sctp|dccp)$/.test(p)) { ctx.error(`Error: INVALID_PORT: ${p}`); code = 102; continue; }
          if (flag === '--add-port') { if (!zone.ports.includes(p)) zone.ports.push(p); else ctx.error(`Warning: ALREADY_ENABLED: '${p}' already in '${zoneName}'`); }
          else zone.ports = zone.ports.filter(x => x !== p);
        }
        if (!code) ok();
        break;
      }
      case '--add-rich-rule': case '--remove-rich-rule': {
        if (!/^rule\s/.test(value || '')) { ctx.error(`Error: INVALID_RULE: ${value}`); code = 104; break; }
        if (flag === '--add-rich-rule') { if (!zone.richRules.includes(value)) zone.richRules.push(value); } else zone.richRules = zone.richRules.filter(r => r !== value);
        ok();
        break;
      }
      case '--add-source': case '--remove-source': if (flag === '--add-source') zone.sources.push(value); else zone.sources = zone.sources.filter(s => s !== value); ok(); break;
      case '--add-interface': case '--change-interface': case '--remove-interface': for (const z of Object.values(store)) z.interfaces = z.interfaces.filter(i => i !== value); if (flag !== '--remove-interface') zone.interfaces.push(value); ok(); break;
      case '--query-service': ctx.print(zone.services.includes(value) ? 'yes' : 'no'); code = zone.services.includes(value) ? 0 : 1; break;
      case '--query-port': ctx.print(zone.ports.includes(value) ? 'yes' : 'no'); code = zone.ports.includes(value) ? 0 : 1; break;
      case '--permanent': case '--zone': break;
      default: if (!readOnly.includes(flag)) { ctx.error(`firewall-cmd: error: unrecognized arguments: ${a}`); code = 2; }
    }
  }
  if (!args.length) ctx.print('usage: see firewall-cmd --help (simulator supports --state, --list-*, --get-*, --add/--remove-service|port|rich-rule|source, --permanent, --reload, --runtime-to-permanent, --zone=)');
  return code;
}

export const networkCommands = [
  { name: 'ip', cat: 'Network', summary: 'Show/modify addresses, links, routes, neighbours (runtime only)', usage: 'ip [-br] addr|link|route|neigh [show|add|del|get|set] ...', fidelity: 'partial', bin: '/usr/sbin/ip', run: ipCommand },
  { name: 'nmcli', cat: 'Network', summary: 'NetworkManager CLI: device/connection show, con mod/add/up/down/del (persists keyfiles)', usage: 'nmcli device status | nmcli con mod NAME ipv4.addresses A/P ipv4.gateway G ipv4.dns D ipv4.method manual | nmcli con up NAME', fidelity: 'partial', run: nmcli },
  {
    name: 'ss', cat: 'Network', summary: 'Socket statistics (-t -u -l -n -p -a)', usage: 'ss -tulnp', fidelity: 'functional', bin: '/usr/sbin/ss',
    run(ctx) {
      const sys = ctx.sys;
      const flags = ctx.args.filter(a => a.startsWith('-')).join('').replace(/-/g, '');
      const showT = flags.includes('t') || (!flags.includes('u') && !flags.includes('x'));
      const showU = flags.includes('u');
      const listenOnly = flags.includes('l');
      const all = flags.includes('a');
      const filter = ctx.args.find(a => /sport|dport|:\d+/.test(a));
      const rows = [['Netid', 'State', 'Recv-Q', 'Send-Q', 'Local Address:Port', 'Peer Address:Port', ...(flags.includes('p') ? ['Process'] : [])]];
      const socks = listeningSockets(sys).filter(s => (s.proto === 'tcp' && showT) || (s.proto === 'udp' && showU));
      for (const s of socks) {
        if (filter && !filter.includes(String(s.port))) continue;
        rows.push([s.proto, s.proto === 'udp' ? 'UNCONN' : 'LISTEN', 0, s.proto === 'udp' ? 0 : 128, `${s.addr}:${s.port}`, '0.0.0.0:*', ...(flags.includes('p') ? [ctx.isRoot() ? `users:(("${s.proc}",pid=${s.pid},fd=${3 + (s.port % 5)}))` : ''] : [])]);
      }
      if ((!listenOnly || all) && showT && sys.services.sshd.active === 'active' && (!filter || filter.includes('22'))) rows.push(['tcp', 'ESTAB', 0, 0, '10.10.40.15:22', '10.10.40.50:51822', ...(flags.includes('p') ? [ctx.isRoot() ? 'users:(("sshd-session",pid=3301,fd=4))' : ''] : [])]);
      ctx.print(columns(rows));
      return 0;
    }
  },
  {
    name: 'netstat', cat: 'Network', summary: 'Deprecated (net-tools not installed by default) — use ss', usage: 'netstat -tulnp', fidelity: 'static', pkg: 'net-tools',
    run(ctx) { ctx.error('netstat is not installed by default on RHEL 9/10 (package net-tools). Use: ss -tulnp'); return 127; }
  },
  {
    name: 'ping', cat: 'Network', summary: 'ICMP echo test (always use -c in scripts)', usage: 'ping [-c COUNT] [-W SEC] host', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const { o, rest } = getopt(ctx.args, 'nq46', 'cWiIs');
      const host = rest[0];
      if (!host) return fail(ctx, 'usage error: Destination address required', 2);
      const res = resolveName(sys, host);
      if (!res.ip) { ctx.error(`ping: ${host}: ${res.error === 'NXDOMAIN' ? 'Name or service not known' : 'Temporary failure in name resolution'}`); return 2; }
      const count = Number(o.c || 4);
      const route = routeTo(sys, res.ip);
      if (!route.ok && route.reason === 'Network is unreachable') { ctx.error('ping: connect: Network is unreachable'); return 2; }
      ctx.print(`PING ${host} (${res.ip}) 56(84) bytes of data.`);
      const reach = hostReachable(sys, res.ip);
      const lossy = sys.net.lossy?.[res.ip];
      let received = 0;
      for (let i = 1; i <= Math.min(count, 10); i++) {
        if (!reach.ok || (lossy && i % 3 === 0)) continue;
        received++;
        const t = res.ip.startsWith('127.') || localAddrs(sys).includes(res.ip) ? 0.03 : inSubnet(res.ip, '10.10.40.0/24') ? 0.3 : 11.8;
        if (!o.q) ctx.print(`64 bytes from ${res.ip === host ? host : `${host} (${res.ip})`}: icmp_seq=${i} ttl=${t > 5 ? 54 : 64} time=${(t + (i % 3) * 0.041).toFixed(3)} ms`);
      }
      if (count > 10) ctx.error('(simulator: capped at 10 packets)');
      const sent = Math.min(count, 10);
      ctx.print(`\n--- ${host} ping statistics ---\n${sent} packets transmitted, ${received} received, ${Math.round((1 - received / sent) * 100)}% packet loss, time ${sent * 1001}ms`);
      if (received) ctx.print('rtt min/avg/max/mdev = 0.281/0.322/0.364/0.041 ms');
      if (!o.c) ctx.error('(simulator: real ping runs until Ctrl+C without -c)');
      return received ? 0 : 1;
    }
  },
  ...['tracepath', 'traceroute'].map(name => ({
    name, cat: 'Network', summary: 'Show the hop-by-hop path to a host', usage: `${name} host`, fidelity: 'partial', pkg: name === 'traceroute' ? 'traceroute' : null,
    run(ctx) {
      const sys = ctx.sys;
      const host = ctx.args.find(a => !a.startsWith('-'));
      if (!host) return fail(ctx, 'missing host');
      const res = resolveName(sys, host);
      if (!res.ip) { ctx.error(`${name}: ${host}: Name or service not known`); return 2; }
      const route = routeTo(sys, res.ip);
      const hops = [];
      if (route.via) hops.push([route.via, sys.net.reachable.includes(route.via)]);
      if (route.via && !inSubnet(res.ip, '10.0.0.0/8')) hops.push(['198.51.100.1', true], ['203.0.113.9', true]);
      hops.push([res.ip, hostReachable(sys, res.ip).ok]);
      if (name === 'traceroute') ctx.print(`traceroute to ${host} (${res.ip}), 30 hops max, 60 byte packets`);
      hops.forEach(([ip, ok], i) => ctx.print(ok ? ` ${i + 1}  ${ip} (${ip})  ${(0.3 + i * 4.1).toFixed(3)} ms` : ` ${i + 1}  * * *`));
      return 0;
    }
  })),
  {
    name: 'dig', cat: 'Network', summary: 'DNS lookup (bind-utils)', usage: 'dig [@server] name [A|AAAA|MX] [+short]', fidelity: 'partial', pkg: 'bind-utils',
    run(ctx) {
      const sys = ctx.sys;
      const server = (ctx.args.find(a => a.startsWith('@')) || '').slice(1) || undefined;
      const short = ctx.args.includes('+short');
      const name = ctx.args.find(a => !a.startsWith('@') && !a.startsWith('+') && !/^(A|AAAA|MX|NS|TXT|PTR|-x)$/i.test(a));
      if (!name) return fail(ctx, 'usage: dig [@server] name');
      const r = dnsQuery(sys, name, server);
      if (r.status === 'TIMEOUT' || r.status === 'NOSERVERS') { ctx.print(`;; communications error to ${r.server || '(none)'}#53: timed out\n;; communications error to ${r.server || '(none)'}#53: timed out\n\n; <<>> DiG 9.18.33 <<>> ${name}\n;; global options: +cmd\n;; no servers could be reached`); return 9; }
      if (short) { if (r.ip) ctx.print(r.ip); return 0; }
      const fq = (r.fqdn || name) + '.';
      ctx.print(`\n; <<>> DiG 9.18.33 <<>> ${server ? '@' + server + ' ' : ''}${name}\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: ${r.status}, id: 4242\n;; flags: qr aa rd ra; QUERY: 1, ANSWER: ${r.ip ? 1 : 0}, AUTHORITY: ${r.ip ? 0 : 1}, ADDITIONAL: 1\n\n;; QUESTION SECTION:\n;${fq}\t\tIN\tA\n${r.ip ? `\n;; ANSWER SECTION:\n${fq}\t300\tIN\tA\t${r.ip}\n` : `\n;; AUTHORITY SECTION:\nlab.example.com.\t300\tIN\tSOA\tns1.lab.example.com. hostmaster.lab.example.com. 2026100901 3600 900 604800 300\n`}\n;; Query time: 1 msec\n;; SERVER: ${r.server}#53(${r.server}) (UDP)\n;; WHEN: ${new Date(sys.clock()).toUTCString()}\n;; MSG SIZE  rcvd: 65`);
      return 0;
    }
  },
  {
    name: 'host', cat: 'Network', summary: 'Simple DNS lookup (bind-utils)', usage: 'host name [server]', fidelity: 'partial', pkg: 'bind-utils',
    run(ctx) {
      const [name, server] = ctx.args;
      if (!name) return fail(ctx, 'usage: host name');
      const r = dnsQuery(ctx.sys, name, server);
      if (r.status === 'NOERROR') { ctx.print(`${r.fqdn || name} has address ${r.ip}`); return 0; }
      if (r.status === 'NXDOMAIN') { ctx.print(`Host ${name} not found: 3(NXDOMAIN)`); return 1; }
      ctx.print(`;; communications error to ${r.server}#53: timed out\n;; no servers could be reached`);
      return 1;
    }
  },
  {
    name: 'nslookup', cat: 'Network', summary: 'Legacy DNS lookup (bind-utils)', usage: 'nslookup name', fidelity: 'partial', pkg: 'bind-utils',
    run(ctx) {
      const name = ctx.args[0];
      const r = dnsQuery(ctx.sys, name);
      if (r.status === 'NOERROR') { ctx.print(`Server:\t\t${r.server}\nAddress:\t${r.server}#53\n\nName:\t${r.fqdn || name}\nAddress: ${r.ip}`); return 0; }
      ctx.print(r.status === 'NXDOMAIN' ? `Server:\t\t${r.server}\nAddress:\t${r.server}#53\n\n** server can't find ${name}: NXDOMAIN` : ';; connection timed out; no servers could be reached');
      return 1;
    }
  },
  { name: 'curl', cat: 'Network', summary: 'HTTP client (-I -i -v -o -f -k); local httpd honours DocumentRoot, permissions and SELinux', usage: 'curl [-I] [-v] [-o FILE] URL', fidelity: 'partial', run: (ctx) => curlLike(ctx, false) },
  { name: 'wget', cat: 'Network', summary: 'Download a URL to a file', usage: 'wget [-O FILE] URL', fidelity: 'partial', pkg: 'wget', run: (ctx) => curlLike(ctx, true) },
  {
    name: 'simclient', cat: 'Simulator', summary: 'SIMULATOR-ONLY helper: test a port on this host from the lab client 10.10.40.50 (applies firewalld runtime rules)', usage: 'simclient PORT [tcp|udp] [path]', fidelity: 'simulator',
    run(ctx) {
      const sys = ctx.sys;
      const port = Number(ctx.args[0]);
      const proto = ctx.args[1] === 'udp' ? 'udp' : 'tcp';
      if (!port) return fail(ctx, 'usage: simclient PORT [tcp|udp] [path]');
      ctx.print(`[client01 10.10.40.50] connecting to ${HOSTNAME} (10.10.40.15) port ${port}/${proto} ...`);
      if (!firewallAllows(sys, port, proto)) { ctx.print(`[client01] curl: (7) Failed to connect to 10.10.40.15 port ${port}: No route to host\n(firewalld rejected the packet with icmp-host-prohibited — the port is not allowed in the active zone's runtime configuration)`); return 7; }
      const sock = listeningSockets(sys).find(s => s.port === port && s.proto === proto && s.addr !== '127.0.0.1');
      if (!sock) { ctx.print(`[client01] curl: (7) Failed to connect to 10.10.40.15 port ${port}: Connection refused\n(the firewall allowed the packet but nothing is listening on 0.0.0.0:${port})`); return 7; }
      if (proto === 'tcp' && [80, 443, 8080, 8081, 82].includes(port) || sock.proc === 'httpd') {
        const r = localHttp(sys, port, ctx.args[2] || '/');
        ctx.print(`[client01] HTTP/1.1 ${r.status}${r.reason ? `   (${r.reason})` : ''}\n${r.body}`);
        return r.status < 400 ? 0 : 22;
      }
      ctx.print(`[client01] connected: ${sock.proc} (pid ${sock.pid}) accepted the connection`);
      return 0;
    }
  },
  {
    name: 'ssh', cat: 'Network', summary: 'Secure shell client (connection checks only; remote shells are not simulated)', usage: 'ssh [-i KEY] [-p PORT] user@host [command]', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const { o, rest } = getopt(ctx.args, 'vtTNq', 'ipolF');
      const target = rest[0];
      if (!target) return fail(ctx, 'usage: ssh [-p port] [user@]hostname [command]', 255);
      const [user, host] = target.includes('@') ? target.split('@') : [sys.session.user, target];
      const res = resolveName(sys, host);
      if (!res.ip) { ctx.error(`ssh: Could not resolve hostname ${host}: Name or service not known`); return 255; }
      const port = Number(o.p || 22);
      const local = localAddrs(sys).includes(res.ip);
      if (local) {
        const listening = listeningSockets(sys).some(s => s.port === port && s.proc.startsWith('sshd'));
        if (!listening) { ctx.error(`ssh: connect to host ${host} port ${port}: Connection refused`); return 255; }
        const u = userByName(sys, user);
        const keyPath = `${u?.home}/.ssh/authorized_keys`;
        const myKey = ['id_ed25519.pub', 'id_rsa.pub', 'id_ecdsa.pub'].map(k => `${userByName(sys, sys.session.user).home}/.ssh/${k}`).find(p => sys.fs.exists(p));
        let keyOk = false;
        if (u && myKey && sys.fs.exists(keyPath)) {
          const ak = sys.fs.resolve(keyPath).node, sshDir = sys.fs.resolve(`${u.home}/.ssh`).node, home = sys.fs.resolve(u.home).node;
          const pub = sys.fs.readFile(myKey, '/').trim();
          const strictOk = !(ak.mode & 0o022) && !(sshDir.mode & 0o022) && !(home.mode & 0o022) && ak.uid === u.uid;
          const ctxOk = sys.selinux.mode !== 'enforcing' || ctxType(ak.ctx) === 'ssh_home_t';
          keyOk = (ak.data || '').includes(pub) && strictOk && ctxOk;
          if ((ak.data || '').includes(pub) && !strictOk) sys.journal.push({ time: sys.clock(), unit: 'sshd.service', prio: 3, msg: `Authentication refused: bad ownership or modes for file ${keyPath}`, ident: 'sshd' });
          if ((ak.data || '').includes(pub) && !ctxOk) avc(sys, 'read', 'sshd', `name="authorized_keys" dev="dm-0" ino=${ak.ino} scontext=system_u:system_r:sshd_t:s0-s0:c0.c1023 tcontext=${ak.ctx} tclass=file`);
        }
        if (user === 'root' && /^\s*PermitRootLogin\s+no/m.test(sys.fs.readFile('/etc/ssh/sshd_config', '/'))) keyOk = false;
        if (keyOk) { ctx.print(`(simulator) Public-key authentication succeeded for ${user}@${host}. Remote interactive sessions are not simulated — you are still on ${sys.hostname}.`); return 0; }
        ctx.error(`${user}@${host}: Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password).\n(simulator: password authentication is not simulated; check keys, ~/.ssh modes, SELinux labels and journalctl -u sshd)`);
        return 255;
      }
      const reach = hostReachable(sys, res.ip);
      if (!reach.ok) { ctx.error(`ssh: connect to host ${host} port ${port}: Connection timed out`); return 255; }
      if (!(sys.net.remotePorts[res.ip] || []).includes(port)) { ctx.error(`ssh: connect to host ${host} port ${port}: Connection refused`); return 255; }
      ctx.print(`(simulator) TCP connection to ${host}:${port} succeeded and the server banner was received (SSH-2.0-OpenSSH_9.9). Remote sessions are not simulated.`);
      return 0;
    }
  },
  {
    name: 'ssh-keygen', cat: 'Security', summary: 'Generate an SSH key pair (simulated key material)', usage: 'ssh-keygen [-t ed25519|rsa] [-f FILE] [-N PASSPHRASE] [-C COMMENT]', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const { o } = getopt(ctx.args, 'qlL', 'tfNCb');
      const type = o.t || 'ed25519';
      const home = userByName(sys, sys.session.user).home;
      const file = o.f ? ctx.abs(o.f) : `${home}/.ssh/id_${type}`;
      const dir = file.slice(0, file.lastIndexOf('/'));
      const me = ctx.user;
      if (!sys.fs.exists(dir)) { const d = sys.fs.create(dir, '/', S_IFDIR, { user: me, mode: 0o700, umask: 0 }); d.ctx = 'unconfined_u:object_r:ssh_home_t:s0'; }
      if (sys.fs.exists(file)) { ctx.error(`${file} already exists.\n(simulator: refusing to overwrite)`); return 1; }
      const rand = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      const priv = sys.fs.writeFile(file, '/', `-----BEGIN OPENSSH PRIVATE KEY-----\nsimulated-${type}-${rand}\n-----END OPENSSH PRIVATE KEY-----\n`, { user: me, umask: 0o077 });
      priv.mode = 0o600;
      const pub = sys.fs.writeFile(file + '.pub', '/', `ssh-${type} AAAAC3NzaC1lZDI1NTE5AAAAI${rand} ${o.C || `${sys.session.user}@${sys.hostname.split('.')[0]}`}\n`, { user: me, umask: 0o022 });
      pub.mode = 0o644;
      ctx.print(`Generating public/private ${type} key pair.\nYour identification has been saved in ${file}\nYour public key has been saved in ${file}.pub\nThe key fingerprint is:\nSHA256:${btoaSafe(rand).slice(0, 43)} ${o.C || `${sys.session.user}@${sys.hostname.split('.')[0]}`}`);
      if (o.N === undefined) ctx.error('(simulator: passphrase prompt skipped — use -N "" or -N "passphrase" explicitly)');
      return 0;
    }
  },
  {
    name: 'ssh-copy-id', cat: 'Security', summary: 'Install your public key in a user\'s authorized_keys (local host only)', usage: 'ssh-copy-id [-i KEY.pub] user@host', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const { o, rest } = getopt(ctx.args, 'f', 'ip');
      const target = rest[0];
      if (!target) return fail(ctx, 'usage: ssh-copy-id [-i identity_file] [user@]hostname');
      const [user, host] = target.includes('@') ? target.split('@') : [sys.session.user, target];
      const res = resolveName(sys, host);
      if (!res.ip) { ctx.error(`ssh: Could not resolve hostname ${host}`); return 1; }
      const myHome = userByName(sys, sys.session.user).home;
      const keyFile = o.i ? ctx.abs(o.i.endsWith('.pub') ? o.i : o.i + '.pub') : ['id_ed25519.pub', 'id_rsa.pub', 'id_ecdsa.pub'].map(k => `${myHome}/.ssh/${k}`).find(p => sys.fs.exists(p));
      if (!keyFile || !sys.fs.exists(keyFile)) { ctx.error('/usr/bin/ssh-copy-id: ERROR: No identities found'); return 1; }
      if (!localAddrs(sys).includes(res.ip)) { ctx.print(`(simulator) Would append ${keyFile} to ${user}@${host}:~/.ssh/authorized_keys — remote hosts are not simulated.`); return 0; }
      const u = userByName(sys, user);
      if (!u) { ctx.error(`${user}@${host}: Permission denied (publickey).`); return 1; }
      if (!ctx.isRoot() && u.name !== sys.session.user) { ctx.error(`${user}@${host}: Permission denied (publickey,password).\n(simulator: password authentication to another account is not simulated)`); return 1; }
      const sshDir = `${u.home}/.ssh`;
      if (!sys.fs.exists(sshDir)) { const d = sys.fs.create(sshDir, '/', S_IFDIR, { mode: 0o700, umask: 0 }); d.uid = u.uid; d.gid = u.gid; d.ctx = 'unconfined_u:object_r:ssh_home_t:s0'; }
      const ak = `${sshDir}/authorized_keys`;
      const pub = sys.fs.readFile(keyFile, '/');
      const existing = sys.fs.exists(ak) ? sys.fs.readFile(ak, '/') : '';
      if (existing.includes(pub.trim())) { ctx.print('/usr/bin/ssh-copy-id: WARNING: All keys were skipped because they already exist on the remote system.'); return 0; }
      const n = sys.fs.writeFile(ak, '/', existing + pub, {});
      n.mode = 0o600; n.uid = u.uid; n.gid = u.gid; n.ctx = 'unconfined_u:object_r:ssh_home_t:s0';
      ctx.print(`Number of key(s) added: 1\n\nNow try logging into the machine, with: "ssh '${user}@${host}'"\nand check to make sure that only the key(s) you wanted were added.`);
      return 0;
    }
  },
  {
    name: 'scp', cat: 'Network', summary: 'Secure copy (local copies only; remote transfer is described, not performed)', usage: 'scp SRC DEST', fidelity: 'partial',
    run(ctx) {
      const files = ctx.args.filter(a => !a.startsWith('-'));
      if (files.length < 2) return fail(ctx, 'usage: scp [-r] source ... target');
      if (files.some(f => /^[^/]*:/.test(f))) { ctx.print(`(simulator) scp would encrypt the transfer over SSH (port 22). Remote hosts are not simulated; use cp for local practice.`); return 0; }
      return ctx.shell.registry.get('cp').run({ ...ctx, name: 'cp', args: ctx.args });
    }
  },
  {
    name: 'ethtool', cat: 'Network', summary: 'NIC link settings', usage: 'ethtool IFACE', fidelity: 'static', bin: '/usr/sbin/ethtool',
    run(ctx) { const i = ctx.sys.net.interfaces.find(x => x.name === ctx.args[ctx.args.length - 1]); if (!i) return fail(ctx, 'no such device', 75); ctx.print(`Settings for ${i.name}:\n\tSpeed: 10000Mb/s\n\tDuplex: Full\n\tAuto-negotiation: off\n\tPort: Twisted Pair\n\tLink detected: ${i.up ? 'yes' : 'no'}`); return 0; }
  },
  { name: 'firewall-cmd', cat: 'Security', summary: 'firewalld client: runtime vs --permanent, zones, services, ports, rich rules, --reload', usage: 'firewall-cmd [--permanent] [--zone=Z] --add-service=S | --add-port=P/tcp | --list-all | --reload', fidelity: 'partial', bin: '/usr/bin/firewall-cmd', run: firewallCmd }
];

function btoaSafe(s) {
  try { return btoa(s + s + s).replace(/=/g, ''); } catch { return s; }
}
