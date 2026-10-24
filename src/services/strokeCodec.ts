import { PaintInterface } from '../utils/Ipaint'

// Storage form of a stroke whose points all share color and lineWidth, and whose
// beginPath/closePath flags can only be set on the first/last point (a normal stroke).
// About half the size of the plain point array.
interface CompactStroke {
    c: string,      // color
    w?: number,     // lineWidth
    b: boolean,     // first point has beginPath
    e: boolean,     // last point has closePath
    p: number[],    // x0, y0, x1, y1, ...
}

export function encodeStroke(points: PaintInterface[]): string {
    const first = points[0]
    const last = points.length - 1
    const compactable = points.every((p, i) =>
        p.color === first.color &&
        p.lineWidth === first.lineWidth &&
        (i === 0 || !p.beginPath) &&
        (i === last || !p.closePath))
    // Anything unusual is stored as-is, so encoding is always lossless
    if (!compactable) return JSON.stringify(points)

    const compact: CompactStroke = {
        c: first.color,
        w: first.lineWidth,
        b: first.beginPath,
        e: points[last].closePath,
        p: points.flatMap((p) => [p.x, p.y]),
    }
    return JSON.stringify(compact)
}

// Also reads plain point arrays (uncompactable strokes and the v2.0 format)
export function decodeStroke(raw: string): unknown[] {
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data

    const { c, w, b, e, p } = data as CompactStroke
    const last = p.length / 2 - 1
    const points: PaintInterface[] = []
    for (let i = 0; i <= last; i++) {
        points.push({
            x: p[2 * i],
            y: p[2 * i + 1],
            color: c,
            ...(w === undefined ? {} : { lineWidth: w }),
            beginPath: i === 0 && b,
            closePath: i === last && e,
        })
    }
    return points
}
