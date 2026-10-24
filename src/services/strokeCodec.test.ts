import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { PaintInterface } from '../utils/Ipaint'
import { decodeStroke, encodeStroke } from './strokeCodec'

const pt = (x: number, opts: Partial<PaintInterface> = {}): PaintInterface =>
    ({ x, y: x * 2, color: '#12ab34', lineWidth: 4, beginPath: false, closePath: false, ...opts })

const stroke = (n: number) => Array.from({ length: n }, (_, i) => pt(i + 0.5, { beginPath: i === 0, closePath: i === n - 1 }))

describe('strokeCodec', () => {
    test('round-trips a normal stroke in compact form', () => {
        const points = stroke(50)
        const encoded = encodeStroke(points)
        assert.ok(encoded.startsWith('{'))
        assert.deepEqual(decodeStroke(encoded), points)
    })

    test('compact form is less than half the size', () => {
        const points = stroke(200)
        assert.ok(encodeStroke(points).length < JSON.stringify(points).length / 2)
    })

    test('keeps a missing lineWidth missing', () => {
        const points = stroke(3)
        points.forEach((p) => delete p.lineWidth)
        assert.deepEqual(decodeStroke(encodeStroke(points)), points)
    })

    test('keeps strokes without begin/close flags exact', () => {
        const points = [pt(1), pt(2)]
        assert.deepEqual(decodeStroke(encodeStroke(points)), points)
    })

    test('falls back to the plain form when points differ', () => {
        for (const points of [
            [pt(1, { beginPath: true }), pt(2, { color: '#ffffff' })],
            [pt(1, { beginPath: true }), pt(2, { lineWidth: 9 })],
            [pt(1), pt(2, { beginPath: true })],
            [pt(1, { closePath: true }), pt(2)],
        ]) {
            const encoded = encodeStroke(points)
            assert.equal(encoded, JSON.stringify(points))
            assert.deepEqual(decodeStroke(encoded), points)
        }
    })
})
