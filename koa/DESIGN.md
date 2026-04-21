# Koa Module Design

## Overview

A configurable Koa HTTP/WebSocket/TCP server framework with a plugin-style middleware architecture. It supports three event channels: HTTP request, HTTP upgrade (WebSocket/raw TCP), and TCP.

## Architecture

```
koa/
├── server.ts           # Server bootstrap: getKoa, startKoaServer, presets
├── upgrade.ts          # Composes upgrade middlewares via koa-compose
├── types.ts            # KoaConfig, Ctx4Upgrade, KoaServerInfo, etc.
├── index.ts            # Re-exports
├── service/
│   ├── config.ts       # DEFAULT_KOA_CONFIG (full-feature preset)
│   ├── session.ts      # Session defaults & in-memory session stores
│   └── utils.ts        # generateKoaCtx (test helper), getRequestBodyOfCtx (lazy body parsing)
└── middleware/
    ├── index.ts         # Aggregates all middlewares into requestMiddleware / upgradeMiddleware objects
    ├── debug/           # Echo, upload, speed test, WS broadcast
    ├── socks/           # SOCKS proxy (v1/v5) across all three channels
    ├── forum/           # Mock forum CRUD + WS notifications
    ├── cors.ts          # CORS header handling
    ├── log.ts           # Request/response logger (first middleware)
    ├── logs.ts          # In-memory log storage REST API
    ├── static/          # Static file serving with gzip, caching, SPA support
    ├── mock/            # Replay recorded HTTP responses
    ├── others.ts        # Proxy middleware, custom response middleware
    ├── session.ts       # Session visit/info routes
    └── cookie.ts        # Cookie listing route
```

## Three Middleware Channels

Each feature may provide middleware for one or more channels:

| Feature  | Koa (HTTP request)    | HTTP Upgrade           | TCP                |
|----------|-----------------------|------------------------|--------------------|
| debug    | `getDebugKoaMw()`     | `debugHttpUpgradeMw`   | -                  |
| socks    | `socksKoaMw`          | `socksHttpUpgradeMw(config)` | `socksTcpMw(config)` |
| forum    | `getForumKoaMw()`     | `forumHttpUpgradeMw`   | -                  |
| cors     | `corsKoaMw(options)`  | -                      | -                  |
| log      | `logKoaMw(options)`   | -                      | -                  |
| logs     | `logsKoaMw(options)`  | -                      | -                  |
| static   | `staticKoaMw(options)`| -                      | -                  |
| mock     | `mockKoaMw(options)`  | -                      | -                  |
| proxy    | `proxyKoaMw(config)`  | -                      | -                  |

### File naming convention for multi-channel features

Each feature folder uses a unified file structure:

```
feature/
├── index.ts            # Re-exports from mw-*.ts
├── mw-koa.ts           # Koa (HTTP request) middleware
├── mw-http-upgrade.ts  # HTTP upgrade middleware
├── mw-tcp.ts           # TCP middleware
└── service.ts          # Shared constants, helpers, state
```

Middleware function naming:
- IS the middleware itself: `${featureName}${Koa|HttpUpgrade|Tcp}Mw`
- Returns a middleware (e.g. wraps `router.routes()`): `get${FeatureName}${Koa|HttpUpgrade|Tcp}Mw`

## Server Bootstrap

### `getKoa(koaConfig, shortCutConfig)`

Assembles a Koa app without listening. Key behaviors:

1. **Middleware ordering by config key order** - the position of `mwConfig` relative to `requestMiddlewares` / `upgradeMiddlewares` in the `KoaConfig` object determines whether built-in middlewares are prepended (`unshift`) or appended (`push`).
2. **Built-in middleware toggling** - `mwConfig` flags (`useDebugMW`, `corsWMOptions`, `logsMWOptions`, `socksConfig`, `useForumMW`) conditionally add middlewares to both request and upgrade arrays.
3. **Static file middleware** - `staticWMConfig` generates middlewares for SPA directories (pathname rewriting) and regular directories (HTML directory listing). SPA middlewares are placed before regular static ones.
4. **Fixed-position middlewares** - `session` is always unshifted to the front; `log` is unshifted even before that.
5. **Direct `app.middleware` assignment** - the full array is built up front and set once, instead of calling `app.use()` in a loop.
6. **Lazy body parsing** - `bodyParserOptions` is attached to `app.context`, not used as middleware. Body is parsed on demand via `getRequestBodyOfCtx()`.

### `startKoaServer(koaConfig, shortCutConfig)`

Calls `getKoa`, then:
- Allocates a port (finds a free port if none given, kills existing process on that port)
- Wires upgrade handler via `server.on('upgrade', ...)` if any `upgradeMiddlewares` exist
- Returns `KoaServerInfo` (origin, port, server, app, config)

### Presets

- `startKoaDebugServer` - enables debug middleware only
- `startKoaFullFeatureServer` - merges `DEFAULT_KOA_CONFIG` (debug + cors + logs + forum + socks + log + static)

## Upgrade Handler (`upgrade.ts`)

Composes all `upgradeMiddlewares` using `koa-compose` with a terminal `NotFoundMiddleware` (responds 404). Parses URL and upgrade protocol from the raw `IncomingMessage`, builds a `Ctx4Upgrade` context, and runs the chain.

## Feature Details

### debug

- **Koa routes** (`/api/debug/...`): echo (mirrors request back), custom (arbitrary response shaping), error (500), upload (multipart body parsing), WS broadcast/connections management
- **Upgrade handler**: raw TCP echo, upload/download speed tests, WebSocket broadcast room
- **Client helpers** (`service.ts`): `echoDataOverTcp`, `getUploadSpeed`, `getDownloadSpeed`

### socks

- **Koa routes** (`/api/socks/...`): list recent SOCKS connections, clear list
- **Upgrade handler**: intercepts `socks*` protocol upgrades, delegates to `handleSocksProtocol` (v1 with username/password auth, v5 with method negotiation)
- **TCP handler**: same SOCKS handling for direct TCP connections (used by `tcp/server.ts`)

### forum

- **Koa routes** (`/api/forum/...`): CRUD for users, posts (with `async-validator` validation), reactions, notifications. All in-memory mock data.
- **Upgrade handler**: WebSocket endpoint for push notifications

### cors

Custom CORS implementation. Handles preflight OPTIONS (204), sets `Access-Control-*` headers. Strips credentials when origin is `*`.

### log

Request/response logger designed as the first middleware. Logs method, URL, HTTP version, headers, and optionally request body (capped at `maxSize`). In `finally` block, logs response time, status, response headers, and truncated body preview.

### logs

REST API (`/api/log/...`) for in-memory log storage. POST to store entries (with timestamp-based IDs), GET to query/filter, GET to clear.

### static

Full-featured static file middleware:
- URL prefix matching and pathname rewriting (function or map)
- In-memory file info cache with configurable `maxCacheTime`
- ETag / Last-Modified / 304 support
- Optional gzip compression (for files > 1KB with compressible MIME types)
- Directory listing via `handleDir` callback
- SPA support: rewrites pathnames like `/net` to `/net.html`

### mock

Matches incoming requests against pre-recorded HTTP response files (by method, path, query, body). Returns recorded response if matched, falls through otherwise. `GET /api/mock/list` returns all loaded mock files.

### others (proxy / customizeResponse)

- `proxyKoaMw`: proxies requests to upstream with context filtering, global request option injection (with caching), header manipulation (strips host/referer, removes upstream CORS headers, adds `z-mitm-proxy-*` headers)
- `customizeResponseKoaMw`: matches requests against condition-action list for custom responses

## Key Types

```typescript
interface KoaConfig {
  host?: string;                              // default '0.0.0.0'
  port?: number;                              // auto-allocated if not set
  printOrigin?: boolean | string | object;
  keys?: string[];                            // for signed cookies
  sessionOptions?: Partial<session.opts>;
  bodyParserOptions?: HttpBodyParserOptions;   // attached to ctx, not a middleware
  requestMiddlewares?: Koa.Middleware[];        // HTTP request middlewares
  upgradeMiddlewares?: UpgradeMiddleware[];     // HTTP upgrade middlewares
  mwConfig?: KoaMiddlewareConfig;              // toggles for built-in middlewares
}

interface Ctx4Upgrade {
  req: IncomingMessage;
  socket: Socket;
  head: Buffer;
  urlProps: NormalizedUrlProps;
  protocol: string;
  ws?: WebSocket;
}
```

## External Dependencies

- `koa`, `koa-router`, `koa-compose`, `koa-session` - Koa ecosystem
- `ws` - WebSocket server (noServer mode)
- `../service/external` - shared utilities (HTTP parsing, URL handling, SOCKS protocol, logging, file operations, speed measurement)
- `../../node` - `getUpgradeProtocol` for upgrade handler
- `../tcp/types` - `TcpHandlerMiddleware` type for socks TCP middleware
