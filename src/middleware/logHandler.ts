import logger from "./logger";
import { NextFunction, Request, Response } from 'express'
const logHandler = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now()
    // Log on finish so the real status code and timing are known
    res.on('finish', () => {
        logger.info(`${res.statusCode}- ${req.originalUrl} - ${req.method} - ${req.ip} - ${Date.now() - start}ms`);
    })
    next()
};
export default logHandler
