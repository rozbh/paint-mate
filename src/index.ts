import './env'
import http from 'http'
import { Server } from 'socket.io'
import { createApp } from './app'
import logger from './middleware/logger'
import { PaintStore } from './services/PaintStore'
import { registerSocketHandlers } from './socket'
import { connectRedis } from './utils/Database'

// How long shutdown waits for unsaved strokes to reach redis
const SHUTDOWN_TIMEOUT_MS = 5000

async function main() {
    const redis = await connectRedis()
    const store = new PaintStore(redis)
    const loaded = await store.load()
    logger.info(`Loaded ${loaded.points} points`)
    if (loaded.rewritten) logger.info('Converted stored canvas to the current format')
    if (loaded.corrupt) logger.warn(`Moved ${loaded.corrupt} unreadable entries to the backup list`)

    const server = http.createServer(createApp(store))
    const io = new Server(server, {
        path: '/ws',
        cors: { origin: '*' },
    })
    registerSocketHandlers(io, store)

    const port = Number(process.env.PORT ?? 3000)
    server.listen(port, () => logger.info(`Server Up And Run On Port: ${port}`))

    const shutdown = async () => {
        logger.info('Shutting down')
        // Closing io disconnects everyone, which flushes their half-drawn strokes
        await io.close()
        store.flushAll()
        const timeout = new Promise<'timeout'>((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS, 'timeout'))
        if (await Promise.race([store.idle(), timeout]) === 'timeout') {
            logger.error('Redis unreachable, some strokes were not saved')
        }
        await redis.close()
        process.exit(0)
    }
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
}

main().catch((err) => {
    logger.error(`Failed to start: ${err.message}`)
    process.exit(1)
})
