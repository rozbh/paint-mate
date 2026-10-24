import { PaintMulti, PaintRedis } from '../services/PaintStore'

const list = (v: string | string[]) => (Array.isArray(v) ? v : [v])

// In-memory stand-in for the few redis commands PaintStore uses
export class FakeRedis implements PaintRedis {
    strings = new Map<string, string>()
    lists = new Map<string, string[]>()
    // Number of upcoming commands that should fail, to simulate redis outages
    failures = 0
    commands: string[] = []

    async rPush(key: string, elements: string | string[]) {
        this.check('rPush')
        return this.push(key, elements)
    }

    async lRange(key: string, start: number, stop: number) {
        this.check('lRange')
        return (this.lists.get(key) ?? []).slice(start, stop === -1 ? undefined : stop + 1)
    }

    async del(keys: string | string[]) {
        this.check('del')
        return this.remove(keys)
    }

    async type(key: string) {
        this.check('type')
        if (this.strings.has(key)) return 'string'
        if (this.lists.has(key)) return 'list'
        return 'none'
    }

    async get(key: string) {
        this.check('get')
        return this.strings.get(key) ?? null
    }

    multi(): PaintMulti {
        const ops: (() => void)[] = []
        const tx: PaintMulti = {
            del: (keys) => (ops.push(() => this.remove(keys)), tx),
            rPush: (key, elements) => (ops.push(() => this.push(key, elements)), tx),
            exec: async () => {
                this.check('exec')
                ops.forEach((op) => op())
                return []
            },
        }
        return tx
    }

    private check(command: string) {
        this.commands.push(command)
        if (this.failures > 0) {
            this.failures--
            throw new Error(`fake ${command} failure`)
        }
    }

    private push(key: string, elements: string | string[]) {
        const items = this.lists.get(key) ?? []
        items.push(...list(elements))
        this.lists.set(key, items)
        return items.length
    }

    private remove(keys: string | string[]) {
        return list(keys).reduce((n, k) => n + Number(this.strings.delete(k)) + Number(this.lists.delete(k)), 0)
    }
}
