import './env'
import http from 'http'
import { Server } from 'socket.io'
import { createApp } from './app'
import logger from './middleware/logger'
import { PaintStore } from './services/PaintStore'
import { registerSocketHandlers } from './socket'
import { connectRedis } from './utils/Database'

async function main() {
    const redis = await connectRedis()
    const store = new PaintStore(redis)
    const migrated = await store.migrateLegacy()
    if (migrated) logger.info(`Migrated ${migrated} points from the old storage format`)

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
        await store.flushAll()
        await io.close()
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
