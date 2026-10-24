import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'
import { FakeRedis } from '../test/fakeRedis'
import { PaintInterface } from '../utils/Ipaint'
import { CORRUPT_KEY, LEGACY_KEY, PaintStore, STROKES_KEY } from './PaintStore'
import { encodeStroke } from './strokeCodec'

const pt = (x: number, opts: Partial<PaintInterface> = {}): PaintInterface =>
    ({ x, y: x, color: '#000000', lineWidth: 2, beginPath: false, closePath: false, ...opts })

const fast = { minRetryMs: 1, maxRetryMs: 4 }
const canvas = (store: PaintStore): PaintInterface[] => JSON.parse(store.canvasJson())
const xs = (store: PaintStore) => canvas(store).map((p) => p.x)

describe('PaintStore', () => {
    let redis: FakeRedis
    let store: PaintStore

    beforeEach(async () => {
        redis = new FakeRedis()
        store = new PaintStore(redis, fast)
        await store.load()
    })

    // Fresh store over the same redis, as after a server restart
    const reload = async () => {
        await store.idle()
        const fresh = new PaintStore(redis, fast)
        await fresh.load()
        return fresh
    }

    test('keeps each stroke contiguous when two people draw at the same time', async () => {
        store.add('a', [pt(1, { beginPath: true }), pt(2)])
        store.add('b', [pt(101, { beginPath: true }), pt(102)])
        store.add('a', [pt(3), pt(4, { closePath: true })])
        store.add('b', [pt(103, { closePath: true })])

        assert.deepEqual(xs(store), [1, 2, 3, 4, 101, 102, 103])
        assert.deepEqual(xs(await reload()), [1, 2, 3, 4, 101, 102, 103])
    })

    test('canvas includes strokes that are still being drawn', async () => {
        store.add('a', [pt(1, { beginPath: true }), pt(2, { closePath: true })])
        store.add('b', [pt(10, { beginPath: true }), pt(11)])

        assert.deepEqual(xs(store), [1, 2, 10, 11])
        await store.idle()
        assert.equal(redis.lists.get(STROKES_KEY)?.length, 1)
    })

    test('a new beginPath ends a stroke that never sent closePath', async () => {
        store.add('a', [pt(1, { beginPath: true }), pt(2)])
        store.add('a', [pt(3, { beginPath: true }), pt(4, { closePath: true })])
        await store.idle()

        assert.equal(redis.lists.get(STROKES_KEY)?.length, 2)
    })

    test('a very long stroke is saved as one piece', async () => {
        const long = Array.from({ length: 20_000 }, (_, i) => pt(i, { beginPath: i === 0 }))
        store.add('a', long)
        store.add('b', [pt(-1, { beginPath: true }), pt(-2, { closePath: true })])
        store.add('a', [pt(20_000, { closePath: true })])

        assert.deepEqual((await reload()).canvasJson(), store.canvasJson())
        assert.equal(redis.lists.get(STROKES_KEY)?.length, 2)
    })

    test('flush saves a half-finished stroke', async () => {
        store.add('a', [pt(1, { beginPath: true }), pt(2)])
        store.flush('a')

        assert.deepEqual(xs(await reload()), [1, 2])
    })

    test('clear drops saved and in-progress strokes', async () => {
        store.add('a', [pt(1, { beginPath: true }), pt(2, { closePath: true })])
        store.add('b', [pt(10, { beginPath: true })])
        store.clear()
        store.flush('b')

        assert.deepEqual(canvas(store), [])
        assert.deepEqual(canvas(await reload()), [])
    })

    test('round-trips points exactly through redis', async () => {
        store.add('a', [pt(1.5, { beginPath: true, color: '#ff00aa' }), pt(2.25, { closePath: true, color: '#ff00aa' })])
        store.add('a', [pt(3, { beginPath: true, lineWidth: 7 }), pt(4, { closePath: true, color: '#abcdef' })])
        const before = canvas(store)

        assert.deepEqual(canvas(await reload()), before)
        assert.equal(redis.lists.get(STROKES_KEY)?.[0][0], '{', 'stored compactly')
    })

    describe('redis failures', () => {
        test('failed writes are retried in order', async () => {
            redis.failures = 3
            store.add('a', [pt(1, { beginPath: true }), pt(2, { closePath: true })])
            store.add('a', [pt(3, { beginPath: true }), pt(4, { closePath: true })])

            assert.deepEqual(xs(store), [1, 2, 3, 4], 'still served while redis is down')
            assert.deepEqual(xs(await reload()), [1, 2, 3, 4])
        })

        test('a failed clear is retried and never wipes strokes drawn after it', async () => {
            store.add('a', [pt(1, { beginPath: true }), pt(2, { closePath: true })])
            await store.idle()
            redis.failures = 2
            store.clear()
            store.add('a', [pt(5, { beginPath: true }), pt(6, { closePath: true })])

            assert.deepEqual(xs(await reload()), [5, 6])
        })

        test('strokes waiting to be retried are dropped by a clear', async () => {
            redis.failures = 2
            store.add('a', [pt(1, { beginPath: true }), pt(2, { closePath: true })])
            store.clear()

            assert.deepEqual(canvas(await reload()), [])
        })
    })

    describe('load', () => {
        test('migrates the v1 single-string format, split into strokes', async () => {
            const old = [pt(1, { beginPath: true }), pt(101, { beginPath: true }), pt(2), pt(102, { closePath: true })]
            redis.strings.set(LEGACY_KEY, JSON.stringify(old))

            const fresh = new PaintStore(redis, fast)
            assert.deepEqual(await fresh.load(), { points: 4, rewritten: true, corrupt: 0 })
            assert.deepEqual(canvas(fresh), old)
            assert.equal(await redis.type(LEGACY_KEY), 'none')
            assert.equal(redis.lists.get(STROKES_KEY)?.length, 2)
            assert.equal(redis.commands.filter((c) => c === 'exec').length, 1, 'one atomic transaction')
        })

        test('compacts the v2.0 plain-array format', async () => {
            const strokes = [[pt(1, { beginPath: true }), pt(2, { closePath: true })], [pt(3, { beginPath: true })]]
            redis.lists.set(STROKES_KEY, strokes.map((s) => JSON.stringify(s)))

            const fresh = new PaintStore(redis, fast)
            assert.equal((await fresh.load()).rewritten, true)
            assert.deepEqual(canvas(fresh), strokes.flat())
            assert.deepEqual(redis.lists.get(STROKES_KEY), strokes.map(encodeStroke))
        })

        test('does not rewrite data already in the current format', async () => {
            redis.lists.set(STROKES_KEY, [encodeStroke([pt(1, { beginPath: true }), pt(2, { closePath: true })])])
            redis.commands = []

            assert.equal((await new PaintStore(redis, fast).load()).rewritten, false)
            assert.ok(!redis.commands.includes('exec'))
        })

        test('moves unreadable entries and invalid points to a backup list instead of crashing', async () => {
            const good = [pt(1, { beginPath: true }), pt(2, { closePath: true })]
            const mixed = JSON.stringify([pt(3, { beginPath: true }), { x: 4, y: 4 }])
            redis.lists.set(STROKES_KEY, [encodeStroke(good), '{not json', mixed])
            redis.strings.set(LEGACY_KEY, '[truncated')

            const fresh = new PaintStore(redis, fast)
            assert.deepEqual(await fresh.load(), { points: 3, rewritten: true, corrupt: 3 })
            assert.deepEqual(canvas(fresh).map((p) => p.x), [1, 2, 3])
            assert.deepEqual(redis.lists.get(CORRUPT_KEY), ['[truncated', '{not json', mixed])
        })
    })
})
