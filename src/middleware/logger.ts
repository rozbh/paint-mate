import winston, { format } from 'winston'
const { timestamp, colorize, combine, printf } = format
const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        myFormat,
        colorize()
    ),
    transports: [
        new winston.transports.File({ filename: `Logs/error/${new Date().toISOString().slice(0, 10)}.log`, level: 'error' }),
        new winston.transports.File({ filename: `Logs/combined/${new Date().toISOString().slice(0, 10)}.log`, level: 'info', }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            timestamp(),
            myFormat,
            colorize()
        ),
    }));
}

export default logger
