import Joi from 'joi'

const paintSchema = Joi.object({
    x: Joi.number().min(0)
        .max(100000)
        .required(),

    y: Joi.number().min(0)
        .max(100000)
        .required(),
    color: Joi.string().regex(/^#[A-Fa-f0-9]{6}$/).required(),

    lineWidth: Joi.number().min(1).max(10)
})

export const paintsschema = Joi.array().min(1).items(paintSchema).required()
export const paintsschemaDb = Joi.array().min(0).items(paintSchema).required()



// -> { value: { username: 'abc', birth_year: 1994 } }