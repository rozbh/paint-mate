import compression from 'compression'
import cors from 'cors'
import express, { Request, Response } from 'express'
import helmet from 'helmet'
import { StatusCodes, getReasonPhrase } from 'http-status-codes'
import errorHandler from './middleware/errorHandler'
import logHandler from './middleware/logHandler'
import { PaintStore } from './services/PaintStore'
import ApiErr from './utils/ApiErr'

export function createApp(store: PaintStore) {
    const app = express()
    // The canvas is fetched from the front end's origin, so allow cross-origin reads
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
    app.use(cors())
    // Point arrays are very repetitive JSON; gzip shrinks the initial load a lot
    app.use(compression())
    app.use(logHandler)

    app.get('/', (req: Request, res: Response) => {
        res.type('json').send(store.canvasJson())
    })

    app.use(() => {
        throw new ApiErr(StatusCodes.NOT_FOUND, getReasonPhrase(StatusCodes.NOT_FOUND))
    })

    app.use(errorHandler)

    return app
}
