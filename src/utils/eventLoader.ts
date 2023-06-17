import { Server, Socket } from "socket.io";
import { getPub } from "../controllers/socket.io/publisher.socket";
import { getpubEvent } from "../events/socket.io/get-pub.event";

export function eventsLoader(io: Server, socket: Socket) {
    return [
        getpubEvent({ eventPath: 'get-pub', socket, controller: getPub }),
    ]
}
