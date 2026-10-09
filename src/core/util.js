// Shared, DOM-free helpers. Safe to import from Node tests.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Inline markdown: `code`, **bold**, *italic*, [text](#/route). Input is escaped first.
export function inlineMd(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  html = html.replace(/\[([^\]]+)\]\((#\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
  return html;
}

// Block markdown subset: paragraphs, "- " / "1. " lists, ``` fenced code, "### " headings, "> " callouts.
export function renderMd(text) {
  if (!text) return '';
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];
  let list = null;
  let code = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${inlineMd(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (code) {
      if (line.trim().startsWith('```')) { out.push(`<pre class="code-block"><code>${escapeHtml(code.join('\n'))}</code></pre>`); code = null; }
      else code.push(raw);
      continue;
    }
    if (line.trim().startsWith('```')) { flushPara(); flushList(); code = []; continue; }
    const t = line.trim();
    if (!t) { flushPara(); flushList(); continue; }
    let m;
    if ((m = t.match(/^#{2,4}\s+(.*)$/))) { flushPara(); flushList(); out.push(`<h4>${inlineMd(m[1])}</h4>`); continue; }
    if ((m = t.match(/^>\s?(.*)$/))) { flushPara(); flushList(); out.push(`<div class="callout">${inlineMd(m[1])}</div>`); continue; }
    if ((m = t.match(/^[-•]\s+(.*)$/))) {
      flushPara();
      if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = t.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara();
      if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
      list.items.push(m[1]); continue;
    }
    if (list) { list.items[list.items.length - 1] += ' ' + t; continue; }
    para.push(t);
  }
  if (code) out.push(`<pre class="code-block"><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  flushPara(); flushList();
  return out.join('\n');
}

// Deterministic PRNG (mulberry32) so randomized exams are reproducible in tests.
export function createRng(seed = Date.now()) {
  let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

export function formatDuration(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
}

export function normalizeText(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Token-set Jaccard similarity, used to flag near-duplicate questions.
export function similarity(a, b) {
  const A = new Set(normalizeText(a).split(' ').filter(w => w.length > 2));
  const B = new Set(normalizeText(b).split(' ').filter(w => w.length > 2));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
