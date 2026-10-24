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

The canvas is kept in memory while the server runs, so `GET /` never waits on
Redis. Redis holds the durable copy: the list `paint:strokes`, one element per
finished stroke (from `beginPath` to `closePath`), stored compactly with color
and line width written once per stroke.

- Strokes are buffered per connection until they end, so two people drawing at
  once never get their points mixed together.
- Redis writes go through one ordered queue that retries with backoff, so a
  Redis outage delays saving instead of losing strokes or slowing drawing.
- On startup, older formats (the single `paint` key, plain point arrays) are
  converted in one transaction. Unreadable entries are moved to
  `paint:strokes:corrupt` instead of being deleted.

Logs rotate daily under `Logs/` and are kept for 14 days.

## Scripts

`npm test` · `npm run lint` · `npm run typecheck`
