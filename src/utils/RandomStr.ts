import crypto from 'crypto'
const createRandomStr = (input = process.env.SIG_LEN ?? 10) => {
    return crypto.randomBytes(16).toString('hex')
}
export { createRandomStr }