import { Socket } from "socket.io";

export type ControllerType = (socket: Socket, msg: any,ack:any) => any;
export interface Eventfunction {
    eventPath: string,
    controller: ControllerType
    socket: Socket,
}