# Web app — agent notes

Read the root `CLAUDE.md` first. Paths are relative to `apps/web`.

```bash
npm run dev     # http://localhost:5173, proxies /api to VITE_DEV_API_TARGET
npm run lint    # ESLint + Prettier
npm test        # Vitest (src/**/*.test.ts(x)), network faked by src/test/api.ts
npm run build   # tsc -b && vite build
```

React 19 + Vite (React Compiler) + Tailwind v4 (monochrome tokens in
`src/index.css`, enforced by `src/test/monochrome-theme.test.ts`) + TanStack
Router (file-based; `routeTree.gen.ts` is generated) + Query + Form.

Layering, dependencies only pointing down:
- `src/api/<domain>` — HTTP clients (`HTTP` in `api/http.ts`: bearer token from
  `localStorage`, SSE via `HTTP.stream`). Errors are codes; map them with
  `utils/errors.ts`.
- `src/apiQuery` — query keys (`keys.ts`), query/mutation hooks, and the chat
  cache: `chat-stream.ts` runs one streamed turn and `chat-cache.ts` writes each
  SSE event (`chat_created`, tokens, `assistant_saved`, `done`, `error`) into the
  Query cache. A new conversation lives under a draft key until `chat_created`.
- `src/routes` — thin route files; `src/pages` — containers with hooks;
  `src/components/page` — presentational pages (props in, callbacks out).

Sections: `/sessions` (student chat), `/settings` (account), `/admin`
(overview, students + per-student stats, documents/knowledge base, settings).
Branding comes from `src/config/brand.ts` (`VITE_APP_NAME`, `VITE_ACADEMY_NAME`).
UI copy is Romanian.
