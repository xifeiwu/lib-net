# Assets Sync TCP Middleware

Thin TCP middleware wrapper that dispatches assets sync connections to the core logic in `modules/lib/node/lib/assets-management/remote-syncup/`.

## Wire Protocol

Protocol identification byte: `0x10`. The TCP gateway detects this as a numeric protocol and dispatches to the middleware chain.

See `remote-syncup/protocol.ts` for the full frame format and I/O utilities.

## File Structure

| File | Purpose |
|------|---------|
| `mw-tcp.ts` | TCP middleware (`getAssetsTcpMw`) — checks protocol byte, delegates to `handleAssetsSyncConnection` |
| `index.ts` | Re-exports `getAssetsTcpMw` |

## Core Logic

The sync protocol, server handler, and client logic live in `modules/lib/node/lib/assets-management/remote-syncup/`:

| File | Purpose |
|------|---------|
| `protocol.ts` | Protocol byte constant, frame I/O utilities (`readFrame`/`writeFrame`/`readJsonFrame`/`writeJsonFrame`), file streaming helpers |
| `server.ts` | Server-side handler (`handleAssetsSyncConnection`), push/pull logic, git integration |
| `client.ts` | Client-side logic (`runAssetsSyncCommand`), meta scanning, diff display, file transfer |

## Configuration

Enabled via `assetsSyncUp` in `TcpGateWayConfig`:

```typescript
{
  assetsSyncUp: {
    dir: '/path/to/assets',   // server-side assets directory
    git: 'git@host:repo.git', // optional: auto-commit and push after sync
  }
}
```

## Client

The client CLI lives in `src/1-command/assets-sync.ts` (busybox `assets` bin). It delegates to `runAssetsSyncCommand` from `remote-syncup/client.ts`.

```
assets diff <dir> -H <host> -p <port>
assets push <dir> -H <host> -p <port>
assets pull <dir> -H <host> -p <port>
```
