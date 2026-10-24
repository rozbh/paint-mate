import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiErr from '../utils/ApiErr';
import logger from './logger';

interface errResponse {
    code: number,
    message: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- express needs 4 args to treat this as an error handler
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err instanceof ApiErr ? err.statusCode : StatusCodes.INTERNAL_SERVER_ERROR
    const message = err instanceof ApiErr ? err.message : 'Internal Server Error'
    logger.error(`${statusCode}-${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    const rs: errResponse = { code: statusCode, message }
    return res.status(statusCode).send(rs);
};
export default errorHandler
