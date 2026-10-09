# Implementation status (work in progress, NOT complete)

The original app (`index.html`, `app.js`, `data.js`, `style.css`) is untouched and still the live entry point.
The new modular platform is being built under `src/` and is **not wired into `index.html` yet**.

## Done (code written, not yet run or tested)
- `package.json` (ESM, eslint dev dependency, scripts: start/test/lint/validate/report/check), `.vercelignore`, `eslint.config.js`, `scripts/serve.mjs`, `.claude/launch.json`
- Core: `src/core/util.js`, `schema.js` (question/curriculum/lab/incident/project validation and stats), `assessment.js` (11 modes, stratified selection, option shuffling, negative marking, idempotent submit), `srs.js` (SM-2), `store.js` (versioned localStorage, legacy migration, corruption quarantine, export/import), `mastery.js` (topic states, readiness, weak topics), `incidents.js` (scenario engine and scoring)
- Content pipeline: `src/data/index.js` (lazy per-level loader), `scripts/validate-content.mjs` (report and validation), `docs/CONTENT_SPEC.md`
- Terminal simulator: `src/terminal/vfs.js`, `system.js`, `shell.js`, `commands/{util,files,text,users,proc,services,network,storage,security}.js`

## Content status (counted from the files; check with `node scripts/validate-content.mjs`)
The content agents stopped at a usage limit. What actually exists:
- Lessons complete (10/10, pass lesson validation): **L06, L08, L18**
- Lessons partial: **L02** (modules M1-M3 written; M4, M5 and the final `export default` still missing, so the file does not load yet), **L04** (M1-M3 written; file closed after M3 so it is valid JS, but M4 and M5 are missing)
- Lessons not started: L00, L01, L03, L05, L07, L09-L17, L19
- MCQ question files: **none written yet** (0 of the 2,000 minimum)
- Projects: **complete**: 13 projects (PRJ-01..13) with 0 validation issues
- Incidents: **2 of 20** (INC-01, INC-02); the file was closed after INC-02 so it is valid JS

## Remaining work
1. `src/terminal/commands/packages.js` (dnf/yum/rpm/flatpak, with repos parsed from /etc/yum.repos.d) and `src/terminal/commands/index.js` (registry: get/names/pathOf/requiresBinary/knownUnsupported, plus help/man/apropos/clear)
2. Shell: handle `{editor}` return values from commands in `execSimple`; set `sys.lastDaemonReload` in daemon-reload; call `applyAutofs` when autofs starts; compute swap total in `memory()` from `storage.swaps`; add lsof/wget/traceroute/net-tools to the seeded package lists
3. `src/data/labs.js`: terminal labs with `check(sys)` validators, linked to lessons, tagged `rhcsa`
4. UI (`src/ui/*`, new `index.html`, `src/main.js`): hash router, dashboard, curriculum and lesson renderer, practice/exam runner and results review, terminal page and editor overlay, incidents, projects, progress page (export/import/reset/settings), search, bank report, about/limitations. Keep the existing `style.css` look. Remove `user-scalable=no`.
5. Tests in `tests/` (node:test): assessment, srs, store (migration/corruption/import), mastery, terminal (fs ops, permissions, pipes, systemctl, LVM, firewall), incidents, content integrity
6. Run `npm run lint`, `npm run validate`, `npm test`; verify in the browser via `npm start`
7. Then retire `app.js`/`data.js`, write the README, and regenerate `docs/QUESTION_BANK_REPORT.md`
