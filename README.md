# paint-mate

Real-time shared canvas server: two people draw on the same board, live.
Express + Socket.IO + Redis, written in TypeScript.

## Run

```sh
cp .env.example .env     # then adjust REDIS_URL / PORT
npm install
npm run dev              # watch mode
npm run build && npm start
```

Needs Node 22+ and a Redis server.

## API

| | |
|---|---|
| `GET /` | the whole saved canvas as an array of points |
| socket `get-pub` (points[], ack) | draw points; broadcast to others as `update` and saved |
| socket `clear` (msg, ack) | wipe the canvas; broadcast to others as `clear` |

Socket.IO path is `/ws`. A point is
`{ x, y, color: "#rrggbb", lineWidth?, beginPath, closePath }`.

## Storage

Each finished stroke (from `beginPath` to `closePath`) is one element of the
Redis list `paint:strokes`. Strokes are buffered per connection until they end,
so two people drawing at once never get their points mixed together. Data in
the old single `paint` key is migrated automatically on startup.

## Scripts

`npm test` · `npm run lint` · `npm run typecheck`
