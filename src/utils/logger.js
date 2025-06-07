import winston from 'winston';

const { combine, timestamp, printf } = winston.format;

const level = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level,
  format: combine(
    timestamp(),
    printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

export default logger;
