import { Socket } from 'socket.io'
import logger from '../../middleware/logger'
import { PaintStore } from '../../services/PaintStore'
import { Ack } from '../../utils/Ipaint'
import { validatePaints } from '../../utils/joi'

export async function getPub(store: PaintStore, socket: Socket, msg: unknown, ack?: Ack) {
  const { error, value } = validatePaints(msg)
  if (error) {
    logger.warn(`get-pub rejected from ${socket.id}: ${error.message}`)
    return typeof ack == 'function' && ack(error)
  }

  // Send to the partner first; saving must never delay the live drawing
  socket.broadcast.emit('update', value)
  try {
    await store.add(socket.id, value)
  } catch (err) {
    logger.error(`get-pub save failed: ${(err as Error).message}`)
  }
  if (typeof ack == 'function') {
    ack(value)
  }
}
