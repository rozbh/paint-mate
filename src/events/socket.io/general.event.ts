import { Eventfunction } from "../../utils/Ievent"
export async function generalEvent(input: Eventfunction) {
    const { socket, controller, eventPath } = input
    socket.on(eventPath, async (msg,ack) => {
        return await controller(socket, msg,ack)
    })
}
