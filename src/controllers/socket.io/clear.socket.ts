import { Socket } from "socket.io";
import database from "../../utils/Database";
import { PaintInterface } from "../../utils/Ipaint";

export async function clear(socket: Socket, msg: PaintInterface[], ack: any) {
    const client = await database()
    client.set('paint', JSON.stringify([]));
    socket.broadcast.emit('clear',msg)
    if (typeof ack == 'function') {
      ack('done')
    }
    //return  socket.to(msg.roomId).emit("newMsg", msg.caption);
  }