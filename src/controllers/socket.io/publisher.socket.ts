import { Socket } from 'socket.io'
import logger from '../../middleware/logger'
import { PaintStore } from '../../services/PaintStore'
import { Ack } from '../../utils/Ipaint'
import { validatePaints } from '../../utils/joi'

export function getPub(store: PaintStore, socket: Socket, msg: unknown, ack?: Ack) {
  const { error, value } = validatePaints(msg)
  if (error) {
    logger.warn(`get-pub rejected from ${socket.id}: ${error.message}`)
    return typeof ack == 'function' && ack(error)
  }

  socket.broadcast.emit('update', value)
  // Kept in memory right away; the store saves it to redis in the background (with retries)
  store.add(socket.id, value)
  if (typeof ack == 'function') {
    ack(value)
  }
}
