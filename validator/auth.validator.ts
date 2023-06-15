import { body } from 'express-validator'
const loginValidator = [
    body('userName').isString(),
    body('passWord').isLength({ min: 5 }),
]
export { loginValidator }