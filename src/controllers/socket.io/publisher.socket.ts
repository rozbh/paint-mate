
import { Socket } from "socket.io";
import database from "../../utils/Database";
import { PaintInterface } from "../../utils/Ipaint";
import { customValidator } from "../../utils/validator";
import { paintValidator } from "../../utils/paintValidate";
import { paintsschema, paintsschemaDb } from "../../utils/joi";
export async function getPub(socket: Socket, msg: PaintInterface[], ack: any) {

  const client = await database()
  const paintsDataStr = await client.get('paint')
  const result = paintsschema.validate(msg);
  if (result.error) {
    if (typeof ack == 'function') {
      return ack(result.error)
    }
  }
  if (paintsDataStr) {
    const paints = JSON.parse(paintsDataStr) as PaintInterface[]

    const result = paintsschemaDb.validate(paints);
    if (result.error) {
      await client.del('paint')
    }
    await client.set('paint', JSON.stringify([...paints, ...msg]));
    socket.broadcast.emit('update', msg)
    if (typeof ack == 'function') {
      ack(msg)
    }
  }

  //return  socket.to(msg.roomId).emit("newMsg", msg.caption);
}
