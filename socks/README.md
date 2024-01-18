## Notice

Communication between custom socks server and socks client can support:
1. Using socket by http upgrade, logic of socks server run on http server, socks client starts by a http upgrade request.
2. Encrypt data run on socket.

## Ref

[SOCKS Protocol Version 5](https://datatracker.ietf.org/doc/html/rfc1928)
[Username/Password Authentication for SOCKS V5](https://datatracker.ietf.org/doc/html/rfc1929)

## Some principle

1. Function imported from external(not under this dir) should be reexport from file `./external.ts`
2. Type should seperate from logic