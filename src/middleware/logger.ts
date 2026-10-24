import winston, { format } from 'winston'
const { timestamp, colorize, combine, printf } = format
const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});
const day = new Date().toISOString().slice(0, 10)

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    silent: process.env.NODE_ENV === 'test',
    format: combine(timestamp(), myFormat),
    transports: [
        new winston.transports.File({ filename: `Logs/error/${day}.log`, level: 'error' }),
        new winston.transports.File({ filename: `Logs/combined/${day}.log` }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        // colorize has to run before printf to affect the output
        format: combine(colorize(), timestamp(), myFormat),
    }));
}

export default logger
