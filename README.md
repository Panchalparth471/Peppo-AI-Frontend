Peppo AI — Frontend (React + Tailwind)

Repository: https://github.com/Panchalparth471/Peppo-AI-Frontend

This is the frontend for Peppo AI — a minimal chat-like UI that sends short text prompts to your backend and plays back the generated 5s video returned by the server.

This README explains how to run the frontend locally, connect it to a backend (Flask/other), build for production and deploy. It assumes the backend exposes /api/generate-video and /api/session as described below.

Features

React + Tailwind UI (chat interface)

Reads backend base URL from REACT_APP_API_BASE_URL (build-time env)

Plays video/mp4 blobs returned by backend via object URLs

Small inline loading spinner next to the latest user message

Suggestion buttons to quickly send example prompts

Prerequisites

Node.js 16+ (Node 18+ recommended)

npm 8+ or 9+

(Optional) a running backend that responds to /api/generate-video & /api/session

Example backend: Flask app that returns binary video/mp4 for /api/generate-video.

Quickstart — Local development

Clone the repo (if you haven't already):

git clone https://github.com/Panchalparth471/Peppo-AI-Frontend.git
cd Peppo-AI-Frontend


Install dependencies:

npm ci
# or
npm install


Configure the backend base URL (optional):

Create /.env.local in the project root (this file should be in .gitignore):

# If your backend runs at http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000


If REACT_APP_API_BASE_URL is blank or missing, the app will use relative requests (e.g. fetch('/api/generate-video')), which is ideal when the frontend is served from the same origin as the backend.

As an alternative for development, you can add a proxy to package.json:

"proxy": "http://localhost:8000"


This lets you call /api/... without setting REACT_APP_API_BASE_URL.

Start the dev server:

npm start


Open: http://localhost:3000

API the frontend expects

The frontend sends requests to the backend. The simplest expected endpoints:

POST /api/session

Returns JSON { "session_id": "<id>" }

POST /api/generate-video

Request body JSON: { "prompt": "text", "session_id": "<id>" }

Returns binary video/mp4 (Content-Type: video/mp4) — the frontend will create an object URL and play it.

Optional response headers you may find helpful:

X-Session-Id — session id

X-Video-Mock — "true" if server returned a sample/mock

X-Generation-Time — seconds spent generating

If your backend has different endpoints, either adapt the frontend fetch URLs or provide an adapter route.

Build for production

Build:

npm ci
npm run build


The production-ready static files will be in build/. Serve those files with any static server (nginx, Apache), or integrate them with your backend (serve build/index.html and static files).

Deploying the frontend

You can deploy this frontend as a static site (Netlify, Vercel, GitHub Pages) or bundle it with your backend.

Netlify / Vercel / Static hosts

Set the build command: npm ci && npm run build

Set the output directory: build

Set environment variable REACT_APP_API_BASE_URL (point to your deployed backend), or leave blank to use relative paths (when served from same domain).

If you serve frontend + backend from the same origin (monorepo)

Build the frontend and make build/ available to the backend server to serve statically. (E.g., place build/ under backend's static directory or use Flask to serve build/index.html.)

Render (monorepo note)
If you deploy a combined repo with backend + frontend on Render and Render runs npm run build from repo root and react-scripts cannot be found, use this Build Command in Render settings:

cd client && npm ci && npm run build && cd .. && pip install -r requirements.txt


(Only relevant if you put React code in a client/ folder. For this repo, you can just use npm ci && npm run build.)

Troubleshooting

react-scripts: not found in CI / deploy

Ensure npm ci / npm install runs before npm run build.

Make sure react-scripts is present in dependencies of package.json. If your build runs in a different working directory (e.g., monorepo root), ensure the build command changes to the React directory (see Render instructions above).

Tailwind/build errors in CI

Tailwind or other build tools must be installed during build. If CI skips devDependencies, move build-time tools to dependencies or ensure CI installs dev deps.

Backend CORS / proxy issues

If backend is on a different origin, configure CORS on the backend or set REACT_APP_API_BASE_URL to the backend origin.

Where to change the API base URL in the code

At the top of the Chat component, the code uses:

const API_BASE = process.env.REACT_APP_API_BASE_URL || "";
// and helper:
const apiUrl = (path) => `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;


So set REACT_APP_API_BASE_URL in .env.local or the hosting environment.

License & Credits

The starter UI is built using the React + Tailwind starter pack contained in this repo.

Add your license in LICENSE (e.g., MIT) if you want to make this public domain or permissive.
