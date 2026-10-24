import { Server } from 'socket.io'
import { clear } from './controllers/socket.io/clear.socket'
import { getPub } from './controllers/socket.io/publisher.socket'
import logger from './middleware/logger'
import { PaintStore } from './services/PaintStore'

export function registerSocketHandlers(io: Server, store: PaintStore) {
    io.on('connection', (socket) => {
        logger.debug(`connected ${socket.id}`)
        socket.on('get-pub', (msg, ack) => getPub(store, socket, msg, ack))
        socket.on('clear', (msg, ack) => clear(store, socket, msg, ack))
        socket.on('disconnect', () => {
            logger.debug(`disconnected ${socket.id}`)
            // Keep a half-finished stroke if the tab closed mid-draw
            store.flush(socket.id).catch((err) => logger.error(`flush failed: ${err.message}`))
        })
    })
}
