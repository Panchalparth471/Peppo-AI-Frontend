# Peppo AI — Frontend (React + Tailwind)

**Repository:** [https://github.com/Panchalparth471/Peppo-AI-Frontend](https://github.com/Panchalparth471/Peppo-AI-Frontend)

This is the frontend for **Peppo AI** — a minimal chat-like UI that sends short text prompts to your backend and plays back the generated \~5s video returned by the server.

This README shows how to run the frontend locally, connect it to a backend (Flask or any server that matches the API contract), build for production, and deploy. It assumes the backend exposes `/api/generate-video` and `/api/session` as described below.

---

## Features

* React + Tailwind UI (chat interface)
* Reads backend base URL from `REACT_APP_API_BASE_URL` (build-time env)
* Plays `video/mp4` blobs returned by backend via object URLs
* Small inline loading spinner next to the latest user message
* Suggestion buttons to quickly send example prompts

---

## Prerequisites

* Node.js 16+ (Node 18+ recommended)
* npm 8+ or 9+
* (Optional) A running backend that responds to `/api/generate-video` & `/api/session`.

  * Example backend: Flask app that returns binary `video/mp4` for `/api/generate-video`.

---

## Quickstart — Local development

### 1. Clone the repo

```bash
git clone https://github.com/Panchalparth471/Peppo-AI-Frontend.git
cd Peppo-AI-Frontend
```

### 2. Install dependencies

```bash
npm ci
# or
npm install
```

### 3. Configure backend base URL (optional)

Create a file named `.env.local` in the project root (this file should be in `.gitignore`):

```env
# If your backend runs at http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000
```

* If `REACT_APP_API_BASE_URL` is blank or missing, the app will use **relative** requests (e.g. `fetch('/api/generate-video')`), which is ideal when the frontend is served from the same origin as the backend.

**Alternative (proxy method)**: Add a `proxy` entry to `package.json` for dev-time convenience:

```json
"proxy": "http://localhost:8000"
```

This allows you to call `/api/...` without setting `REACT_APP_API_BASE_URL` during development.

### 4. Start the dev server

```bash
npm start
```

Open: `http://localhost:3000`

---

## API the frontend expects

The frontend sends requests to the backend. The simplest expected endpoints are:

### `POST /api/session`

* Response: `200` JSON

```json
{ "session_id": "<id>" }
```

### `POST /api/generate-video`

* Request body JSON:

```json
{ "prompt": "Some text prompt", "session_id": "<id>" }
```

* Response: binary `video/mp4` (Content-Type: `video/mp4`). The frontend will create an object URL from the blob and play it.

* Optional helpful response headers:

  * `X-Session-Id` — session id
  * `X-Video-Mock` — `"true"` if the server returned a sample/mock video
  * `X-Generation-Time` — seconds spent generating

If your backend uses different endpoints, either adapt the frontend fetch URLs or provide a small adapter in the backend.

---

## Build for production

1. Build the React app:

```bash
npm ci
npm run build
```

2. The production-ready static files will be in `build/`. Serve those files with any static server (nginx, Apache), or integrate them with your backend (serve `build/index.html` and static files).

---

## Deploying the frontend

You can deploy this frontend as a static site (Netlify, Vercel, GitHub Pages) or bundle it with your backend in a single host.

### Netlify / Vercel / Static hosts

* Build command: `npm ci && npm run build`
* Output directory: `build`
* Set environment variable `REACT_APP_API_BASE_URL` in the host to point to your deployed backend (or leave blank to use relative paths when frontend and backend are same-origin).

### If you serve frontend + backend from the same origin (monorepo)

Build the frontend and make `build/` available to the backend server to serve statically. For example, place `build/` under your backend's static directory or configure Flask to serve `build/index.html`.

### Render (monorepo note)

If you deploy a combined repo with backend + frontend on Render and Render runs `npm run build` from repo root and `react-scripts` cannot be found, use this **Build Command** in Render settings (adjust if your frontend folder is different):

```bash
cd client && npm ci && npm run build && cd .. && pip install -r requirements.txt
```

> Only relevant when React is in a `client/` subfolder. If React is at repo root you can use `npm ci && npm run build`.

---

## Troubleshooting

### `react-scripts: not found` in CI / deploy

* Ensure `npm ci` or `npm install` runs before `npm run build`.
* Verify `react-scripts` is present in `dependencies` in `package.json`.
* If the CI/build runs from the repo root but the React app is inside `client/`, make sure the build command changes the working directory (see Render note above).

### Tailwind / build errors in CI

* Tailwind and build tools must be installed during build. If CI skips `devDependencies`, either move build-time tools to `dependencies` or ensure CI installs dev deps (e.g., `npm ci --include=dev`).

### Backend CORS / proxy issues

* If backend is on a different origin, enable CORS on the backend or set `REACT_APP_API_BASE_URL` to the backend origin.

---

## Where to change the API base URL in the code

At the top of the Chat component the code uses:

```js
const API_BASE = process.env.REACT_APP_API_BASE_URL || "";
// and a helper function like:
const apiUrl = (path) => `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
```

Set `REACT_APP_API_BASE_URL` in `.env.local` or your hosting environment accordingly.

---

## License & Credits

* The starter UI is built using the React + Tailwind starter pack contained in this repo.
* Add your license in `LICENSE` (for example, MIT).


---

