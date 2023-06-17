import mongoose from 'mongoose'
import logger from '../middleware/logger'
import { RedisClientType, createClient } from 'redis'
const database = async () => {
    const url = process.env.REDIS
    const client = createClient({
        url
    });
    client.on('error', err => console.log('Redis Client Error', err));
    await client.connect();
    const rs = await client.get('paint')
    if (rs == null) {
        await client.set('paint', JSON.stringify([]))
    }

    return client as RedisClientType
}
export default database