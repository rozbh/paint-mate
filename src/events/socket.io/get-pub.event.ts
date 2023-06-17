import { Eventfunction } from "../../utils/Ievent"
export function getpubEvent(input: Eventfunction) {
    const { socket, controller, eventPath } = input
    socket.on(eventPath, async (msg,ack) => {
        
        return controller(socket, msg,ack)
    })
}
