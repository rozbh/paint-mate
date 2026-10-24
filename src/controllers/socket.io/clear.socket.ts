import { Socket } from 'socket.io'
import { PaintStore } from '../../services/PaintStore'
import { Ack } from '../../utils/Ipaint'

export function clear(store: PaintStore, socket: Socket, msg: unknown, ack?: Ack) {
  // The store retries the redis delete until it succeeds, always before any later stroke
  store.clear()
  socket.broadcast.emit('clear', msg)
  if (typeof ack == 'function') {
    ack('done')
  }
}
