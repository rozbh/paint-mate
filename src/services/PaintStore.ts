import logger from '../middleware/logger'
import { PaintInterface } from '../utils/Ipaint'
import { paintSchema } from '../utils/joi'
import { decodeStroke, encodeStroke } from './strokeCodec'

export const STROKES_KEY = 'paint:strokes'
// Unreadable or invalid data found at startup is moved here instead of being deleted
export const CORRUPT_KEY = 'paint:strokes:corrupt'
// v1 stored the whole canvas as one JSON string under this key
export const LEGACY_KEY = 'paint'

// The subset of the redis client this store uses (lets tests pass a fake)
export interface PaintRedis {
    rPush(key: string, elements: string | string[]): Promise<unknown>
    lRange(key: string, start: number, stop: number): Promise<string[]>
    del(keys: string | string[]): Promise<unknown>
    type(key: string): Promise<string>
    get(key: string): Promise<string | null>
    multi(): PaintMulti
}

export interface PaintMulti {
    del(keys: string | string[]): PaintMulti
    rPush(key: string, elements: string | string[]): PaintMulti
    exec(): Promise<unknown>
}

const CLEAR = Symbol('clear')
type WriteOp = string | typeof CLEAR

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
// A stroke's JSON without the outer brackets, ready to be joined into the canvas array
const innerJson = (stroke: PaintInterface[]) => JSON.stringify(stroke).slice(1, -1)

/**
 * The shared canvas. Memory is the source of truth while the server runs; redis
 * (a list with one compact element per finished stroke) is the durable copy.
 *
 * Points arrive in small batches while someone is drawing. Each author's current
 * stroke is buffered and saved as one unit when it ends, so two people drawing
 * at the same time never interleave their points.
 *
 * Redis writes go through one ordered queue that retries with backoff, so a redis
 * hiccup delays saving instead of losing strokes, and never slows down drawing.
 */
export class PaintStore {
    private saved: string[] = []
    private pending = new Map<string, PaintInterface[]>()
    private queue: WriteOp[] = []
    private draining: Promise<void> | null = null
    private clears = 0
    private retryMs: number

    constructor(private redis: PaintRedis, private options = { minRetryMs: 500, maxRetryMs: 30_000 }) {
        this.retryMs = options.minRetryMs
    }

    /** Reads the canvas from redis, migrating and compacting older formats in one transaction. */
    async load() {
        const [legacyType, elements] = await Promise.all([
            this.redis.type(LEGACY_KEY),
            this.redis.lRange(STROKES_KEY, 0, -1),
        ])
        const strokes: PaintInterface[][] = []
        const corrupt: string[] = []
        let changed = false

        const read = (raw: string, decode: (raw: string) => unknown[]) => {
            let points: unknown[]
            try {
                points = decode(raw)
            } catch {
                corrupt.push(raw)
                return null
            }
            const valid = points.flatMap((point) => {
                const { error, value } = paintSchema.validate(point, { stripUnknown: true })
                return error ? [] : [value]
            })
            if (valid.length !== points.length) corrupt.push(raw)
            return valid
        }

        if (legacyType === 'string') {
            changed = true
            const points = read(await this.redis.get(LEGACY_KEY) ?? '[]', (raw) => JSON.parse(raw))
            if (points) strokes.push(...splitStrokes(points))
        }
        for (const element of elements) {
            const stroke = read(element, decodeStroke)
            if (stroke?.length) strokes.push(stroke)
            // Rewrite anything not already in the current compact form
            if (!stroke?.length || encodeStroke(stroke) !== element) changed = true
        }

        if (changed) {
            const tx = this.redis.multi().del([LEGACY_KEY, STROKES_KEY])
            if (strokes.length) tx.rPush(STROKES_KEY, strokes.map(encodeStroke))
            if (corrupt.length) tx.rPush(CORRUPT_KEY, corrupt)
            await tx.exec()
        }
        this.saved = strokes.map(innerJson)
        return { points: strokes.reduce((n, s) => n + s.length, 0), rewritten: changed, corrupt: corrupt.length }
    }

    add(authorId: string, points: PaintInterface[]) {
        const unfinished = collectStrokes(this.pending.get(authorId) ?? [], points, (stroke) => this.commit(stroke))
        if (unfinished.length) {
            this.pending.set(authorId, unfinished)
        } else {
            this.pending.delete(authorId)
        }
    }

    flush(authorId: string) {
        const stroke = this.pending.get(authorId)
        this.pending.delete(authorId)
        if (stroke?.length) this.commit(stroke)
    }

    flushAll() {
        for (const authorId of [...this.pending.keys()]) this.flush(authorId)
    }

    /** The whole canvas, including strokes still being drawn, as a JSON array of points. */
    canvasJson() {
        const inProgress = [...this.pending.values()].map(innerJson)
        return `[${[...this.saved, ...inProgress].join(',')}]`
    }

    clear() {
        // Strokes still being drawn were wiped from everyone's screen too
        this.saved = []
        this.pending.clear()
        this.clears++
        // Writes still queued would be deleted anyway
        this.queue = [CLEAR]
        this.startDrain()
    }

    /** Resolves once every queued write has reached redis. */
    async idle() {
        while (this.draining) await this.draining
    }

    private commit(stroke: PaintInterface[]) {
        this.saved.push(innerJson(stroke))
        this.queue.push(encodeStroke(stroke))
        this.startDrain()
    }

    private startDrain() {
        this.draining ??= this.drain().finally(() => {
            this.draining = null
            if (this.queue.length) this.startDrain()
        })
    }

    private async drain() {
        while (this.queue.length) {
            const batch = this.takeBatch()
            const clears = this.clears
            try {
                if (batch[0] === CLEAR) {
                    await this.redis.del(STROKES_KEY)
                } else {
                    await this.redis.rPush(STROKES_KEY, batch as string[])
                }
                this.retryMs = this.options.minRetryMs
            } catch (err) {
                logger.error(`Redis write failed, retrying in ${this.retryMs}ms: ${(err as Error).message}`)
                // Retry in the same order, unless a clear since then made the batch obsolete
                if (clears === this.clears) this.queue.unshift(...batch)
                await sleep(this.retryMs)
                this.retryMs = Math.min(this.retryMs * 2, this.options.maxRetryMs)
            }
        }
    }

    // Either a single clear, or every stroke queued before the next clear (sent as one RPUSH)
    private takeBatch() {
        if (this.queue[0] === CLEAR) return this.queue.splice(0, 1)
        const end = this.queue.indexOf(CLEAR)
        return this.queue.splice(0, end === -1 ? this.queue.length : end)
    }
}

// Appends points to an unfinished stroke, calling `done` for each stroke that ends.
// A stroke ends at closePath, or when a new one begins without it. Returns what's left unfinished.
function collectStrokes(stroke: PaintInterface[], points: PaintInterface[], done: (stroke: PaintInterface[]) => void) {
    for (const point of points) {
        if (point.beginPath && stroke.length) {
            done(stroke)
            stroke = []
        }
        stroke.push(point)
        if (point.closePath) {
            done(stroke)
            stroke = []
        }
    }
    return stroke
}

function splitStrokes(points: PaintInterface[]) {
    const strokes: PaintInterface[][] = []
    const rest = collectStrokes([], points, (stroke) => strokes.push(stroke))
    if (rest.length) strokes.push(rest)
    return strokes
}
