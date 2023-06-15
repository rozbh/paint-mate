import { body, validationResult } from 'express-validator'
import { NextFunction, Request, Response } from 'express'
const validator = (schema: any) => {
    return [
        ...schema,
        (req: Request, res: Response,next:NextFunction) => {
            // Finds the validation errors in this request and wraps them in an object with handy functions
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            return next()
        }
    ]
}
export default validator