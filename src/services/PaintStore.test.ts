import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'
import { FakeRedis } from '../test/fakeRedis'
import { PaintInterface } from '../utils/Ipaint'
import { LEGACY_KEY, PaintStore, STROKES_KEY } from './PaintStore'

const pt = (x: number, opts: Partial<PaintInterface> = {}): PaintInterface =>
    ({ x, y: x, color: '#000000', lineWidth: 2, beginPath: false, closePath: false, ...opts })

describe('PaintStore', () => {
    let redis: FakeRedis
    let store: PaintStore

    beforeEach(() => {
        redis = new FakeRedis()
        store = new PaintStore(redis)
    })

    test('keeps each stroke contiguous when two people draw at the same time', async () => {
        await store.add('a', [pt(1, { beginPath: true }), pt(2)])
        await store.add('b', [pt(101, { beginPath: true }), pt(102)])
        await store.add('a', [pt(3), pt(4, { closePath: true })])
        await store.add('b', [pt(103, { closePath: true })])

        const xs = (await store.getAll()).map((p) => p.x)
        assert.deepEqual(xs, [1, 2, 3, 4, 101, 102, 103])
    })

    test('getAll includes strokes that are still being drawn', async () => {
        await store.add('a', [pt(1, { beginPath: true }), pt(2, { closePath: true })])
        await store.add('b', [pt(10, { beginPath: true }), pt(11)])

        assert.deepEqual((await store.getAll()).map((p) => p.x), [1, 2, 10, 11])
        assert.equal(redis.lists.get(STROKES_KEY)?.length, 1)
    })

    test('a new beginPath ends a stroke that never sent closePath', async () => {
        await store.add('a', [pt(1, { beginPath: true }), pt(2)])
        await store.add('a', [pt(3, { beginPath: true }), pt(4, { closePath: true })])

        assert.equal(redis.lists.get(STROKES_KEY)?.length, 2)
    })

    test('flush saves a half-finished stroke', async () => {
        await store.add('a', [pt(1, { beginPath: true }), pt(2)])
        await store.flush('a')

        assert.deepEqual(redis.lists.get(STROKES_KEY)?.map((s) => JSON.parse(s).length), [2])
        assert.deepEqual((await store.getAll()).map((p) => p.x), [1, 2])
    })

    test('clear drops saved and in-progress strokes', async () => {
        await store.add('a', [pt(1, { beginPath: true }), pt(2, { closePath: true })])
        await store.add('b', [pt(10, { beginPath: true })])
        await store.clear()

        assert.deepEqual(await store.getAll(), [])
        await store.flush('b')
        assert.deepEqual(await store.getAll(), [])
    })

    test('round-trips points exactly', async () => {
        const stroke = [pt(1.5, { beginPath: true, color: '#ff00aa' }), pt(2.25, { lineWidth: 7, closePath: true })]
        await store.add('a', stroke)

        const fresh = new PaintStore(redis)
        assert.deepEqual(await fresh.getAll(), stroke)
    })

    test('migrates the old single-string format', async () => {
        const old = [pt(1, { beginPath: true }), pt(2, { closePath: true })]
        redis.strings.set(LEGACY_KEY, JSON.stringify(old))

        assert.equal(await store.migrateLegacy(), 2)
        assert.equal(await redis.type(LEGACY_KEY), 'none')
        assert.deepEqual(await store.getAll(), old)
        assert.equal(await store.migrateLegacy(), 0)
    })
})
