<p align="center"><img src="docs/brand/cover-ai-20261026.png" width="100%" alt="YUEB1NG website concept cover" /></p>

<p align="center"><a href="README.md">简体中文</a> · <b>English</b></p>

# website · YUEB1NG

**Planets, music and football in one interactive scene**

A personal website built with TypeScript, Three.js and a Cloudflare Worker. Move from a blueprint opening into a glass planet, music-cover orbits, football particle reconstruction, text reveals and day/night themes.

[Live website](https://yueb1ng.com/) · [Interaction notes](docs/INTERACTIONS.zh-CN.md) · [Backend and deployment](docs/DEPLOY.md) · [Contributing](CONTRIBUTING.md) · [Sources](SOURCES.md)

The cover is an AI concept illustration. The following image is an actual public-page screenshot. The illustration does not establish additional features or exact geometry.

![Actual desktop screenshot](docs/images/live-desktop.png)

## Development process record

Sanitized historical statistics cover tokens, conversation turns, tool calls, timing and limitations. These are snapshots, not actual billing records.

[![ASCII + Dither development statistics](docs/development/conversation-stats-20261029.png)](docs/development/README.md)

[完整统计与口径 / Full record](docs/development/README.md) · [JSON](docs/development/conversation-stats-20261029.json) · [记录模板 / Template](docs/development/TEMPLATE.md)

## Quick start

Use Node.js 24 or a newer supported version:

```sh
git clone https://github.com/YUEB1NG/website.git
cd website
npm ci
npm run dev
```

Open the address printed in the terminal, normally `http://127.0.0.1:5173`. Initial loading prepares fonts and graphics. WebGL is required for the complete scene; reduced-motion settings simplify interactions.

```sh
npm run build
npm run preview
```

The frontend is emitted to `dist/client/` and the backend Worker to `dist/server/`. Both preview and development servers run independently. On Windows, after building, `python -X utf8 run-local.py` starts a detached preview. Stop that project's process using `python -X utf8 run-local.py --stop`.

## Explore

| Action | Result |
| --- | --- |
| Drag the transparent circle upward, click Start, or press Enter / ↑ | Enter the scene |
| Click the celestial body | Return to the circle; re-enter to explore another body |
| Hold for 550 ms or press O | Move the same music covers into or out of an elliptical orbit |
| Click like | Reconstruct the next historical football using particles |
| Click the name and Learn | Reveal text or cycle Learn / Build / Share |
| Click the avatar | Switch and save a manual theme preference |
| Click a floating cover or Celebrate | Release stickers |
| Escape or the back button | Exit or return |

Each visit shows 20–25 randomly selected music covers. Selection excludes visible, prepared and recently used artwork. Bodies, orbits, text and particles respect reduced-motion settings. Detailed behaviour and historical adjustments are preserved in the interaction notes.

<details>
<summary>Actual mobile-viewport screenshot</summary>

![Actual mobile-viewport screenshot](docs/images/live-mobile.png)

This is a Chromium mobile viewport, not physical iPhone Safari or Android acceptance.

</details>

## Playlist backend

| Endpoint | Purpose |
| --- | --- |
| `GET /api/playlist` | Read the durable R2 snapshot, falling back to the bundled seed initially |
| `GET /api/covers/{songId}` | Fetch/cache known songs from allowlisted image origins |
| `POST /api/playlist/refresh` | Authenticate a server-side update and commit only a complete playlist |

Independent hosting requires a Cloudflare R2 `BUCKET` binding and a platform secret named `PLAYLIST_UPDATER_TOKEN`. Do not put its value in source, client code or URLs. Static hosting can show the frontend with local-cover fallbacks; complete playlist APIs require the Worker. [Deployment](docs/DEPLOY.md) · [Refresh behaviour](docs/playlist-refresh.md)

Daily updates require an external scheduler calling the protected endpoint. Including the updater does not enable a schedule in a new deployment. Upstream endpoints may change; failures retain the last successful snapshot.

## Development checks

```sh
npm run build
node --test tests/playlist.test.mjs tests/football-handoff.test.mjs tests/cover-picker.test.mjs tests/entrance.test.mjs
```

On October 26, 2026, the production build and these 11 unit tests passed. Public-page entry, screenshots and layout checks passed at 1440 and 393 px without observed page-script errors. Dedicated reduced-motion, rapid-click and orbit checks are in tests. This repository presentation update did not change those implementations.

## Sources and scope

The project references Wabi, imdaryl, ped.ro, React Bits and Three.js. [SOURCES.md](SOURCES.md) and existing license notices are preserved. Planet textures, fonts, music artwork, photographs and third-party assets retain their respective rights; publishing this repository does not relicense them all as MIT. See [asset notices](docs/ASSET-NOTICES.md).

The public site runs on its hosting platform independently of a local terminal or editing session. Physical devices, GPU performance and network conditions require separate verification.
