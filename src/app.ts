import express, { Request, Response } from 'express'
import helmet from 'helmet'
import catchAsync from './middleware/catchAsync'
import errorHandler from './middleware/errorHandler'
import logHandler from './middleware/logHandler'
import ApiErr from './utils/ApiErr'

import { StatusCodes, getReasonPhrase } from 'http-status-codes'
const app = express()
app.use(express.json())
app.use(helmet())
app.use(logHandler)

app.get('/', catchAsync(async (req: Request, res: Response) => {
    res.send([
        [25,45],
        [25,46],
        [25,47],
        [25,48],
        [25,49],
        [25,50],
        [26,50],
        [26,50],
        [26,50],
        [26,50],
    ])
}))


app.use(() => {
    throw new ApiErr(StatusCodes.NOT_FOUND, getReasonPhrase(StatusCodes.NOT_FOUND))
})

app.use(errorHandler)

export default app