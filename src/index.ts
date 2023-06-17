import http from 'http'
import app from './app'
import dotenv from 'dotenv'
import logger from './middleware/logger'
import { Server, Socket } from "socket.io";
import { eventsLoader } from './utils/eventLoader';

dotenv.config()
const server = http.createServer(app)
const io = new Server(server, {
    transports: ["websocket", "polling"],
    path: '/ws',
    cors: {
        origin: '*',
    }
})

io.on('connection', (socket: Socket) => {
    console.log('connected');
    eventsLoader(io, socket)
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
server.listen(process.env.PORT, async () => {
    // await database()
    logger.info(`Server Up And Run On Port: ${process.env.PORT}`)
})

export default server

