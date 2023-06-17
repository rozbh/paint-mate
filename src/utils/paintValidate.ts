import { check } from "express-validator";

export const paintValidator = [
    check('*').isArray(),
    check('*.x').isNumeric(),
    check('*.y').isNumeric(),
    check('*.color').isHexColor(),
    check('*.lineWidth').isNumeric()
]