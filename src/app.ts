import express, { Request, Response } from 'express'
import helmet from 'helmet'
import catchAsync from './middleware/catchAsync'
import errorHandler from './middleware/errorHandler'
import logHandler from './middleware/logHandler'
import ApiErr from './utils/ApiErr'
import cors from 'cors'

import { StatusCodes, getReasonPhrase } from 'http-status-codes'
const app = express()
app.use(express.json())
app.use(helmet())
app.use(logHandler)
app.use(cors())

app.get('/', catchAsync(async (req: Request, res: Response) => {
    res.send([
        [92, 333], [93, 333], [94, 333], [94, 332], [95, 332], [95, 331], [95, 330], [96, 330], [97, 330], [97, 329], [98, 329], [99, 329], [99, 328], [100, 328], [100, 327], [101, 327], [101, 326], [102, 326], [102, 325], [103, 325], [104, 325], [105, 325], [105, 324], [105, 323], [106, 323], [106, 322], [107, 322], [107, 321], [108, 321], [109, 321], [109, 320], [110, 320], [110, 319], [111, 318], [112, 318], [112, 317], [113, 317], [114, 316], [114, 315], [114, 314], [117, 313], [118, 313], [118, 312], [118, 310], [119, 310], [120, 309], [122, 307], [123, 306], [123, 305], [124, 305], [125, 305], [126, 304], [129, 301], [130, 300], [130, 299], [131, 298], [133, 297], [134, 297], [136, 294], [137, 294], [137, 293], [138, 293], [139, 292], [140, 291], [141, 291], [141, 290], [142, 290], [142, 289], [145, 287], [146, 286], [146, 285], [147, 285], [148, 285], [149, 284], [150, 284], [150, 283], [151, 282], [152, 281], [153, 281], [154, 281],
    ])
}))

app.use(() => {
    throw new ApiErr(StatusCodes.NOT_FOUND, getReasonPhrase(StatusCodes.NOT_FOUND))
})

app.use(errorHandler)

export default app