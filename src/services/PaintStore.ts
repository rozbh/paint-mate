import { PaintInterface } from '../utils/Ipaint'

export const STROKES_KEY = 'paint:strokes'
// v1 stored the whole canvas as one JSON string under this key
export const LEGACY_KEY = 'paint'

// Safety valve so a stroke that never sends closePath can't grow forever in memory
const MAX_PENDING_POINTS = 5000

// The subset of the redis client this store uses (lets tests pass a fake)
export interface PaintRedis {
    rPush(key: string, element: string): Promise<unknown>
    lRange(key: string, start: number, stop: number): Promise<string[]>
    del(key: string): Promise<unknown>
    type(key: string): Promise<string>
    get(key: string): Promise<string | null>
}

/**
 * Canvas storage: a redis list with one element per finished stroke.
 *
 * Points arrive in small batches while someone is drawing. Each author's current
 * stroke is buffered and pushed as one unit when it ends, so two people drawing
 * at the same time never interleave their points in storage. RPUSH is atomic,
 * so concurrent writes can't overwrite each other.
 */
export class PaintStore {
    private pending = new Map<string, PaintInterface[]>()

    constructor(private redis: PaintRedis) { }

    async migrateLegacy() {
        if (await this.redis.type(LEGACY_KEY) !== 'string') return 0
        const raw = await this.redis.get(LEGACY_KEY)
        const points = raw ? JSON.parse(raw) : []
        if (Array.isArray(points) && points.length) {
            await this.redis.rPush(STROKES_KEY, JSON.stringify(points))
        }
        await this.redis.del(LEGACY_KEY)
        return Array.isArray(points) ? points.length : 0
    }

    add(authorId: string, points: PaintInterface[]) {
        const writes: Promise<unknown>[] = []
        let stroke = this.pending.get(authorId) ?? []
        for (const point of points) {
            if (point.beginPath && stroke.length) {
                writes.push(this.commit(stroke))
                stroke = []
            }
            stroke.push(point)
            if (point.closePath || stroke.length >= MAX_PENDING_POINTS) {
                writes.push(this.commit(stroke))
                stroke = []
            }
        }
        if (stroke.length) {
            this.pending.set(authorId, stroke)
        } else {
            this.pending.delete(authorId)
        }
        return Promise.all(writes).then(() => undefined)
    }

    flush(authorId: string) {
        const stroke = this.pending.get(authorId)
        this.pending.delete(authorId)
        return stroke?.length ? this.commit(stroke).then(() => undefined) : Promise.resolve()
    }

    async flushAll() {
        await Promise.all([...this.pending.keys()].map((id) => this.flush(id)))
    }

    async getAll(): Promise<PaintInterface[]> {
        // Snapshot in-progress strokes before the read is issued: a stroke committed
        // after this point is pushed after the LRANGE, so it appears exactly once.
        const inProgress = [...this.pending.values()].flat()
        const strokes = await this.redis.lRange(STROKES_KEY, 0, -1)
        return [...strokes.flatMap((s) => JSON.parse(s) as PaintInterface[]), ...inProgress]
    }

    clear() {
        // Strokes still being drawn were wiped from everyone's screen too
        this.pending.clear()
        return this.redis.del(STROKES_KEY).then(() => undefined)
    }

    private commit(stroke: PaintInterface[]) {
        return this.redis.rPush(STROKES_KEY, JSON.stringify(stroke))
    }
}
