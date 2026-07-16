import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  if (stack)
    return `${timestamp} [${level}]: ${message}\n${stack}${metaString}`;
  return `${timestamp} [${level}]: ${message}${metaString}`;
});

const isServerless =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat,
  ),
  defaultMeta: { service: "kgr-backend" },
  transports: [
    new transports.Console({ format: combine(colorize(), logFormat) }),
    ...(!isServerless
      ? [
          new transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880,
            maxFiles: 5,
          }),
          new transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880,
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  ...(!isServerless
    ? {
        exceptionHandlers: [
          new transports.File({ filename: "logs/exceptions.log" }),
        ],
        rejectionHandlers: [
          new transports.File({ filename: "logs/rejections.log" }),
        ],
      }
    : {
        exceptionHandlers: [new transports.Console()],
        rejectionHandlers: [new transports.Console()],
      }),
});

export default logger;
