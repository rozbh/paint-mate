import { createClient } from 'redis'
import logger from '../middleware/logger'

// One shared connection for the whole process. Commands on a single connection
// run in the order they were sent, which keeps clear/draw events ordered.
export async function connectRedis(url = process.env.REDIS_URL) {
    const client = createClient({ url })
    client.on('error', (err) => logger.error(`Redis: ${err.message}`))
    await client.connect()
    return client
}
