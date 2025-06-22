import { randomUUID } from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  correlationId?: string;
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;
  private correlationId: string;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
    this.correlationId = randomUUID();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      correlationId: context?.correlationId || this.correlationId,
      ...(context || {}),
    };
    
    return JSON.stringify(logEntry);
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;
    
    const sanitized = { ...context };
    const sensitiveKeys = ['apiKey', 'api_key', 'password', 'token', 'secret'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      const sanitized = this.sanitizeContext(context);
      console.log(this.formatMessage('debug', message, sanitized));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      const sanitized = this.sanitizeContext(context);
      console.log(this.formatMessage('info', message, sanitized));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      const sanitized = this.sanitizeContext(context);
      console.warn(this.formatMessage('warn', message, sanitized));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...this.sanitizeContext(context),
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  child(correlationId?: string): Logger {
    const childLogger = new Logger(this.logLevel);
    childLogger.correlationId = correlationId || randomUUID();
    return childLogger;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }
}

export function createLogger(logLevel?: LogLevel): Logger {
  return new Logger(logLevel);
}

export default Logger;