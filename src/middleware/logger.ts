import winston, { format } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
const { timestamp, colorize, combine, printf } = format
const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

// A new file every day, kept for two weeks
const dailyFile = (dir: string, level?: string) => new DailyRotateFile({
    filename: `Logs/${dir}/%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    level,
})

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    silent: process.env.NODE_ENV === 'test',
    format: combine(timestamp(), myFormat),
    transports: process.env.NODE_ENV === 'test' ? [] : [dailyFile('error', 'error'), dailyFile('combined')],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        // colorize has to run before printf to affect the output
        format: combine(colorize(), timestamp(), myFormat),
    }));
}

export default logger
