// Helpers shared by simulator commands.

/**
 * Minimal getopt. `flags`: string of boolean short options; `valued`: short options taking a value;
 * `long`: { name: 'x' (alias of short x) | '=key' (long option taking a value) | 'key' (boolean) }.
 * Returns { o: {key: true|value}, rest: [operands], bad: 'unknown option' | null }.
 */
export function getopt(args, flags = '', valued = '', long = {}) {
  const o = {};
  const rest = [];
  let bad = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { rest.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--') && a.length > 2) {
      const [name, val] = a.slice(2).split(/=(.*)/s);
      if (!(name in long)) { bad ||= `unrecognized option '--${name}'`; continue; }
      const spec = long[name];
      if (spec.startsWith('=')) o[spec.slice(1)] = val !== undefined ? val : args[++i];
      else o[spec] = val !== undefined ? val : true;
      continue;
    }
    if (a.startsWith('-') && a.length > 1 && !/^-\d+$/.test(a)) {
      for (let j = 1; j < a.length; j++) {
        const c = a[j];
        if (valued.includes(c)) {
          o[c] = a.slice(j + 1) || args[++i];
          break;
        }
        if (flags.includes(c)) o[c] = true;
        else { bad ||= `invalid option -- '${c}'`; }
      }
      continue;
    }
    rest.push(a);
  }
  return { o, rest, bad };
}

export function human(bytes, { si = false, suffixB = false } = {}) {
  const unit = si ? 1000 : 1024;
  if (bytes < unit) return `${bytes}${suffixB ? 'B' : ''}`;
  const units = ['K', 'M', 'G', 'T', 'P'];
  let v = bytes, i = -1;
  do { v /= unit; i++; } while (v >= unit && i < units.length - 1);
  const s = v >= 10 ? Math.ceil(v).toString() : (Math.ceil(v * 10) / 10).toFixed(1);
  return s + units[i];
}

export function fmtDate(ms, full = false) {
  const d = new Date(ms);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  if (full) {
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${hh}:${mm}:${ss}.000000000 +0000`;
  }
  return `${mon} ${String(d.getUTCDate()).padStart(2, ' ')} ${hh}:${mm}`;
}

export function syslogDate(ms) {
  const d = new Date(ms);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return `${mon} ${String(d.getUTCDate()).padStart(2, ' ')} ${d.toISOString().slice(11, 19)}`;
}

export function columns(rows, { align = [] } = {}) {
  const widths = [];
  for (const r of rows) r.forEach((c, i) => { widths[i] = Math.max(widths[i] || 0, String(c).length); });
  return rows.map(r => r.map((c, i) => {
    const s = String(c);
    if (i === r.length - 1) return s;
    return align[i] === 'r' ? s.padStart(widths[i]) : s.padEnd(widths[i]);
  }).join(' ')).join('\n');
}

export function parseSize(spec) {
  // "10G", "+5G", "500M", "1024" (MiB default)
  const m = /^([+-]?)(\d+(?:\.\d+)?)([KkMmGgTt]?)(i?B)?$/.exec(spec || '');
  if (!m) return null;
  const mult = { '': 1, K: 1 / 1024, M: 1, G: 1024, T: 1024 * 1024 }[m[3].toUpperCase()];
  return { sign: m[1], mib: Math.round(parseFloat(m[2]) * mult) };
}

export function mibHuman(mib) {
  if (mib >= 1024 * 1024) return `${(mib / 1024 / 1024).toFixed(1)}T`;
  if (mib >= 1024) { const g = mib / 1024; return `${g >= 10 ? Math.round(g) : g.toFixed(1)}G`; }
  return `${Math.round(mib)}M`;
}
