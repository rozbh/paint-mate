import { Server, Socket } from "socket.io";
import { getPub } from "../controllers/socket.io/publisher.socket";
import { generalEvent } from "../events/socket.io/general.event";
import { clear } from "../controllers/socket.io/clear.socket";

export async function eventsLoader(io: Server, socket: Socket) {
    return [
        await generalEvent({ eventPath: 'get-pub', socket, controller: getPub }),
        await generalEvent({ eventPath: 'clear', socket, controller: clear }),
    ]
}
