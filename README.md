# yellat

"Old man yells at <thing>" emoji generator. The browser composites a logo into the
template; the server stores shared images and serves the gallery.

## Layout

- `src/client` - SolidJS app (Vite, `@solidjs/router`)
- `src/server` - Hono server: static client, API (`PORT`, default 3000; `DATA_DIR`, default `./data`)
- `src/shared` - types and constants shared by client and server
- `public/templates` - template images (originals in `template/`)

## Commands

- `pnpm dev` - server (`node --watch`, port 3000) and Vite dev server together; open the Vite URL
  (http://localhost:5173), which proxies `/api` and `/i` to the server
- `pnpm build` - client to `dist/client`, server to `dist/server`
- `pnpm start` - run the built server (serves `dist/client`)
- `pnpm test` - vitest
- `pnpm typecheck` - tsc for client and server

## Container

- `./build` - build `registry.digitalsorcery.net/yellat:<version>` (version from `package.json`) and
  tag `:latest`; `./build --push` also pushes both tags
- `podman run --rm -p 8080:3000 -v yellat-data:/data:Z,U registry.digitalsorcery.net/yellat:latest`
- Env: `PORT` (default 3000), `DATA_DIR` (default `/data`); images persist under the `/data` volume
- Runs as the image's `node` user (uid 1000); `:U` makes podman chown the volume to it
- The server takes the client IP from the right-most `X-Forwarded-For` entry, so run it behind a proxy
