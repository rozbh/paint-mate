import { PaintRedis } from '../services/PaintStore'

// In-memory stand-in for the few redis commands PaintStore uses
export class FakeRedis implements PaintRedis {
    strings = new Map<string, string>()
    lists = new Map<string, string[]>()

    async rPush(key: string, element: string) {
        const list = this.lists.get(key) ?? []
        list.push(element)
        this.lists.set(key, list)
        return list.length
    }

    async lRange(key: string, start: number, stop: number) {
        const list = this.lists.get(key) ?? []
        return list.slice(start, stop === -1 ? undefined : stop + 1)
    }

    async del(key: string) {
        return Number(this.strings.delete(key)) + Number(this.lists.delete(key))
    }

    async type(key: string) {
        if (this.strings.has(key)) return 'string'
        if (this.lists.has(key)) return 'list'
        return 'none'
    }

    async get(key: string) {
        return this.strings.get(key) ?? null
    }
}
