// Structured logging utility for Next.js
// Outputs JSON in production, pretty-prints in development

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module?: string;
  message: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[logLevel as LogLevel];
}

function formatLog(entry: LogEntry): string {
  if (isDev) {
    const { timestamp, level, module, message, ...rest } = entry;
    const prefix = module ? `[${module}]` : '';
    const contextStr = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}${contextStr}`;
  }
  return JSON.stringify(entry);
}

function log(level: LogLevel, module: string | undefined, message: string, context?: LogContext) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    ...(module && { module }),
    message,
    ...context,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

// Logger factory
export function createLogger(module: string) {
  return {
    debug: (message: string, context?: LogContext) => log('debug', module, message, context),
    info: (message: string, context?: LogContext) => log('info', module, message, context),
    warn: (message: string, context?: LogContext) => log('warn', module, message, context),
    error: (message: string, context?: LogContext) => log('error', module, message, context),
  };
}

// Pre-configured loggers for common modules
export const logger = createLogger('app');
export const apiLogger = createLogger('api');
export const authLogger = createLogger('auth');
export const ticketLogger = createLogger('tickets');
export const chatLogger = createLogger('chat');
export const dbLogger = createLogger('database');

// Helper for logging errors with context
export function logError(error: Error, context?: LogContext) {
  log('error', undefined, error.message, {
    name: error.name,
    stack: error.stack,
    ...context,
  });
}

// Helper for logging HTTP requests
export interface RequestLogData {
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
}

export function logRequest(data: RequestLogData) {
  const level: LogLevel = data.statusCode && data.statusCode >= 400 ? 'warn' : 'info';
  const context: LogContext = { ...data };
  log(level, 'http', `${data.method} ${data.path} ${data.statusCode || ''} ${data.duration ? `${data.duration}ms` : ''}`.trim(), context);
}

export default logger;
