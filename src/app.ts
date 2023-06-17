import express, { Request, Response } from 'express'
import helmet from 'helmet'
import catchAsync from './middleware/catchAsync'
import errorHandler from './middleware/errorHandler'
import logHandler from './middleware/logHandler'
import ApiErr from './utils/ApiErr'
import cors from 'cors'

import { StatusCodes, getReasonPhrase } from 'http-status-codes'
import database from './utils/Database'
const app = express()
app.use(express.json())
app.use(helmet())
app.use(logHandler)
app.use(cors())

app.get('/', catchAsync(async (req: Request, res: Response) => {

    const client = await database()
    const paintsDataStr = await client.get('paint')
    if (paintsDataStr) {
        return res.send(JSON.parse(paintsDataStr))
    }
   return res.send([])
}))

app.use(() => {
    throw new ApiErr(StatusCodes.NOT_FOUND, getReasonPhrase(StatusCodes.NOT_FOUND))
})

app.use(errorHandler)

export default app