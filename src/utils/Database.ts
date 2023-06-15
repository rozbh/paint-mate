import mongoose from 'mongoose'
import logger from '../middleware/logger'
const database = () => {
    const url = process.env.MONGO_URL ?? 'mongodb://localhost:21017/test'
    return new Promise((resolve, reject) => {
        mongoose.connect(url, (err) => {
            if (err) {
                reject(err)
                return logger.error(err)
            }
            resolve('mongodb connected')
            logger.info('mongodb connected')
        })
    })
}
export default database