# Koa Module

See `DESIGN.md` for full architecture documentation.

## Naming Conventions

### File naming for multi-channel features

Each feature folder uses a unified file structure:

```
feature/
├── index.ts            # Re-exports from mw-*.ts
├── mw-koa.ts           # Koa (HTTP request) middleware
├── mw-http-upgrade.ts  # HTTP upgrade middleware
├── mw-tcp.ts           # TCP middleware
└── service.ts          # Shared constants, helpers, state
```

### Export naming

| Export type          | Pattern                                           | Example                          |
|----------------------|---------------------------------------------------|----------------------------------|
| Router instance (direct) | `${feature}KoaRouter`                          | `debugKoaRouter`, `forumKoaRouter`, `socksKoaRouter` |
| Router instance (wrapper) | `get${Feature}KoaRouter`                      | `getLogsKoaRouter` |
| Middleware (direct)  | `${feature}${Channel}Mw`                          | `debugHttpUpgradeMw`, `forumHttpUpgradeMw` |
| Middleware (wrapper)  | `get${Feature}${Channel}Mw`                      | `getCorsKoaMw`, `getLogKoaMw`, `getStaticKoaMw`, `getSocksHttpUpgradeMw` |

- `Channel` is one of: `Koa`, `HttpUpgrade`, `Tcp`
- `feature` is camelCase, `Feature` is PascalCase
- If a middleware is backed by a `koa-router` instance, export the router instance (`${feature}KoaRouter`), not the middleware. The router carries more info (`.stack` for route enumeration, `.routes()` to get the middleware on demand). Consumers call `router.routes()` when they need the middleware.
- Router instances expose `.stack` for route enumeration via `getRouterPathnameList(router)` from `koa/service`
