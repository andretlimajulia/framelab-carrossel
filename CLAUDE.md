# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — run the Express server (`node server.js`) on `http://localhost:3001`.
- `npm run dev` — same, with `node --watch` for auto-restart on `server.js` changes.
- `npm install` — install deps (`express`, `cors` only).

There is no build, no bundler, no linter, no test suite. The frontend is plain HTML/CSS/JS served statically.

## Architecture

FrameLab Desktop is a local-first template editor for Instagram carousels/posts. A thin Express server hosts a vanilla-JS single-page editor and persists user data to JSON files on disk.

### Backend — [server.js](server.js)

One file, ~200 lines. Express with `cors` and `express.json({ limit: '50mb' })` (templates routinely embed base64 images and inline SVGs, so the large limit is intentional — don't lower it).

Persistence is plain JSON files in [data/](data/), auto-created on first write via `ensureDataDir()`. There is no database, no migrations, no schema validation beyond a couple of `if (!nome)` guards.

Three independent resources, each with its own DB file and read/write helpers:

| Resource | File | Endpoints |
|---|---|---|
| Templates | `data/templates.json` | `GET/POST /api/templates`, `GET/PUT/DELETE /api/templates/:id` |
| Palettes  | `data/palettes.json`  | `GET /api/palettes`, `POST /api/palettes` (replaces the whole list) |
| Stickers  | `data/stickers.json`  | `GET/POST /api/stickers`, `DELETE /api/stickers/:id` |

Plus `GET /api/health` (used by the frontend to detect whether the server is up) and a catch-all `app.get('*')` that serves `public/index.html` for any non-API route.

Note: `POST /api/palettes` overwrites the entire palettes array with the request body — it is a bulk replace, not an append. `POST /api/templates` is an upsert keyed on `id` (creates if missing, updates if present and preserves original `criadoEm`).

### Frontend — [public/](public/)

Two pages, no framework, no build step:

- [public/index.html](public/index.html) — launcher. Lists saved templates from `/api/templates`, links to the editor.
- [public/creator.html](public/creator.html) — the editor itself. ~5200 lines, all CSS and JS inline. This is where 99% of the application logic lives (rendering slides, drag/drop, text editing, palette swapping, stickers, ZIP export via the JSZip CDN, server sync).

`creator.html` works both online and offline: if `/api/health` responds it uses the server; otherwise it falls back to `localStorage['framelab_templates']`. The `_serverAvailable` flag in [public/creator.html:3128](public/creator.html#L3128) gates this behavior, and several save/load paths branch on it — keep both paths working when touching persistence code.

`API_BASE` is hardcoded as `'http://localhost:3001'` in [public/creator.html:3127](public/creator.html#L3127) and `'http://localhost:3001'` in [public/index.html:214](public/index.html#L214). The README documents that deploying elsewhere requires editing these constants by hand.

### Template data model

A template stored under `dados` looks roughly like:

```
{ nome, w, h, slides: [ { name, w, h, bg, elementos: [ { campo, tipo, x, y, largura, altura, ... } ] } ] }
```

Templates are typically imported from a Figma JSON export (the "Importar JSON" flow in the editor). Saved templates have images **stripped** to keep the JSON small — the user re-uploads images after loading. The server stores `slides` as a count at the top level for cheap listing, plus the full `dados` object for full reads.

### Legacy file

[framelab-desktop.html](framelab-desktop.html) at the repo root is an older single-file version of the editor (referenced by the README's deploy instructions, which predate the split into `index.html` + `creator.html`). New work should go in `public/creator.html`; treat the root file as historical unless a task explicitly targets it.
