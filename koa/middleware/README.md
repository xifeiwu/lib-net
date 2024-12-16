## Principle

1. mw-request return middleware for http request, mw-upgrade return middleware for http upgrade.
2. For the mw-request, besides webaocket, middleware can also handle any other protocol, and notify client the protcol is handled by give response: `socket.write(httpResponseInfoToBuffer(getUpgradeResponse(protocol)));`