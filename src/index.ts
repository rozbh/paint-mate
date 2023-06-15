import http from 'http'
import app from './app'
import dotenv from 'dotenv'
import logger from './middleware/logger'
import database from './utils/Database'

dotenv.config()
const Server = http.createServer(app)
Server.listen(process.env.PORT, async () => {
    await database()
    logger.info(`Server Up And Run On Port: ${process.env.PORT}`)
})