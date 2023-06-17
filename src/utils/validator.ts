import { validationResult, ValidationChain } from 'express-validator'
import { NextFunction, Request, Response } from 'express'
import { PaintInterface } from './Ipaint';
const validator = (schema: any) => {
    return [
        ...schema,
        (req: Request, res: Response, next: NextFunction) => {
            // Finds the validation errors in this request and wraps them in an object with handy functions
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            return next()
        }
    ]
}


export const customValidator = async (validations: ValidationChain[], datas: PaintInterface | PaintInterface[]) => {
    for (const validation of validations) {
        const result = await validation.run(datas,{});
        //if (result) break;
    }
}
export default validator