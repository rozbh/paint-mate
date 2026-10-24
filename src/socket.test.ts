import assert from 'node:assert/strict'
import http from 'node:http'
import { AddressInfo } from 'node:net'
import { after, before, describe, test } from 'node:test'
import { Server } from 'socket.io'
import { io as connect, Socket as ClientSocket } from 'socket.io-client'
import { createApp } from './app'
import { PaintStore } from './services/PaintStore'
import { registerSocketHandlers } from './socket'
import { FakeRedis } from './test/fakeRedis'
import { PaintInterface } from './utils/Ipaint'

const pt = (x: number, opts: Partial<PaintInterface> = {}): PaintInterface =>
    ({ x, y: x, color: '#123456', lineWidth: 3, beginPath: false, closePath: false, ...opts })

describe('socket + http', () => {
    let server: http.Server
    let io: Server
    let url: string
    let alice: ClientSocket
    let bob: ClientSocket

    before(async () => {
        const store = new PaintStore(new FakeRedis())
        server = http.createServer(createApp(store))
        io = new Server(server, { path: '/ws' })
        registerSocketHandlers(io, store)
        await new Promise<void>((resolve) => server.listen(0, resolve))
        url = `http://localhost:${(server.address() as AddressInfo).port}`
        alice = connect(url, { path: '/ws', transports: ['websocket'] })
        bob = connect(url, { path: '/ws', transports: ['websocket'] })
        await Promise.all([alice, bob].map((s) => new Promise<void>((resolve) => s.on('connect', () => resolve()))))
    })

    after(async () => {
        alice.close()
        bob.close()
        await io.close()
    })

    test('saved canvas matches what both people drew live', async () => {
        const seenByBob: PaintInterface[] = []
        bob.on('update', (points: PaintInterface[]) => seenByBob.push(...points))

        // Fire both people's batches without waiting, interleaved like real concurrent drawing
        const sends = [
            alice.emitWithAck('get-pub', [pt(1, { beginPath: true }), pt(2)]),
            bob.emitWithAck('get-pub', [pt(101, { beginPath: true }), pt(102)]),
            alice.emitWithAck('get-pub', [pt(3), pt(4, { closePath: true })]),
            bob.emitWithAck('get-pub', [pt(103, { closePath: true })]),
        ]
        await Promise.all(sends)

        const saved: PaintInterface[] = await (await fetch(url)).json()
        assert.deepEqual(saved.map((p) => p.x), [1, 2, 3, 4, 101, 102, 103])
        assert.deepEqual(seenByBob.map((p) => p.x), [1, 2, 3, 4])
        assert.deepEqual(saved.slice(0, 4), seenByBob)
    })

    test('rejects invalid points without saving them', async () => {
        const before: PaintInterface[] = await (await fetch(url)).json()
        const reply = await alice.emitWithAck('get-pub', [{ x: 'nope' }])
        assert.ok(reply.details, 'ack carries the validation error')
        assert.deepEqual(await (await fetch(url)).json(), before)
    })

    test('clear empties the canvas for everyone', async () => {
        const bobCleared = new Promise((resolve) => bob.once('clear', resolve))
        assert.equal(await alice.emitWithAck('clear', []), 'done')
        await bobCleared
        assert.deepEqual(await (await fetch(url)).json(), [])
    })

    test('unknown routes return 404 json', async () => {
        const res = await fetch(`${url}/nope`)
        assert.equal(res.status, 404)
        assert.deepEqual(await res.json(), { code: 404, message: 'Not Found' })
    })
})
