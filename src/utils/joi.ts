import Joi from 'joi'
import { PaintInterface } from './Ipaint'

const paintSchema = Joi.object<PaintInterface>({
    // Negative values happen when a stroke is dragged past the canvas edge
    x: Joi.number().min(-100000).max(100000).required(),
    y: Joi.number().min(-100000).max(100000).required(),
    color: Joi.string().regex(/^#[A-Fa-f0-9]{6}$/).required(),
    lineWidth: Joi.number().min(1).max(30),
    beginPath: Joi.boolean().required(),
    closePath: Joi.boolean().required(),
})

export const paintsschema = Joi.array<PaintInterface[]>().min(1).items(paintSchema).required()

export const validatePaints = (msg: unknown) =>
    paintsschema.validate(msg, { stripUnknown: { objects: true } })
