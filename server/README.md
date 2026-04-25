# Infinity WebSocket Server

This server relays websocket messages between connected tabs/devices.

## Run

1. npm install
2. npm run dev

By default, it listens on ws://0.0.0.0:8080.

## Environment Variables

- PORT: websocket server port (default 8080)
- HOST: bind address (default 0.0.0.0)

## Message Flow

- Client sends JSON message to server.
- Server relays that message to all other connected clients.
- Server attaches message metadata:
  - meta.fromClientId
  - meta.relayedAt
