import { Socket } from 'socket.io'
import logger from '../../middleware/logger'
import { PaintStore } from '../../services/PaintStore'
import { Ack } from '../../utils/Ipaint'

export async function clear(store: PaintStore, socket: Socket, msg: unknown, ack?: Ack) {
  // store.clear() sends DEL synchronously, before any later stroke can be pushed
  const cleared = store.clear()
  socket.broadcast.emit('clear', msg)
  try {
    await cleared
  } catch (err) {
    logger.error(`clear failed: ${(err as Error).message}`)
  }
  if (typeof ack == 'function') {
    ack('done')
  }
}
