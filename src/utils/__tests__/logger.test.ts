import { createLogger } from '../logger';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log levels', () => {
    it('should log info messages when log level is info', () => {
      const logger = createLogger('info');
      logger.info('Test message');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
    });

    it('should not log debug messages when log level is info', () => {
      const logger = createLogger('info');
      logger.debug('Debug message');
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log error messages with error details', () => {
      const logger = createLogger('error');
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      
      expect(parsed.level).toBe('error');
      expect(parsed.error.message).toBe('Test error');
    });
  });

  describe('sanitization', () => {
    it('should sanitize sensitive data', () => {
      const logger = createLogger('info');
      logger.info('Message with sensitive data', { 
        apiKey: 'secret123',
        data: 'public',
      });
      
      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      
      // Debug: log the entire parsed object
      console.log('Parsed log:', parsed);
      
      expect(parsed.apiKey).toBe('[REDACTED]');
      expect(parsed.data).toBe('public');
    });
  });

  describe('correlation IDs', () => {
    it('should generate unique correlation IDs', () => {
      const logger1 = createLogger();
      const logger2 = createLogger();
      
      expect(logger1.getCorrelationId()).not.toBe(logger2.getCorrelationId());
    });

    it('should create child logger with new correlation ID', () => {
      const parentLogger = createLogger();
      const childLogger = parentLogger.child();
      
      expect(childLogger.getCorrelationId()).not.toBe(parentLogger.getCorrelationId());
    });
  });
});