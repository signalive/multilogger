import type * as winston from 'winston';
import type {ElasticsearchTransport, ElasticsearchTransportOptions } from 'winston-elasticsearch';
import type {PapertrailTransport} from 'winston-papertrail-transport';
import type {LoggingWinston} from '@google-cloud/logging-winston';

type ConsoleTransportOptions = {
  level?: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly' | 'info';
  silent?: boolean;
  format?: () => void;
  humanReadableUnhandledException?: boolean;
  showLevel?: boolean;
  formatter?: () => void;
  stderrLevels?: string[];
};

type FileTransportOptions = {
  level?: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly' | 'info';
  silent?: boolean;
  format?: () => void;
  filename?: string;
  maxsize?: number;
  maxFiles?: number;
  stream?: object;
  eol?: string;
  logstash?: boolean;
  showLevel?: boolean;
  formatter?: () => void;
  tailable?: boolean;
  maxRetries?: number;
  zippedArchive?: boolean;
  options?: object;
};

type PapertrailTransportOptions = {
  host: string;
  port: string;
  program: string;
  level?: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly' | 'info';
  inlineMeta?: boolean;
  colorize?: () => void;
  flushOnClose?: boolean;
  /* Detailed Configuration */
  logFormat?: () => void;
  hostname?: string;
  disableTls?: boolean;
  levels?: object;
  facility?: string;
  handleExceptions?: boolean;
  depth?: number;
  /* Connection Failure Related */
  attemptsBeforeDecay?: number;
  maximumAttempts?: number;
  connectionDelay?: number;
  maxDelayBetweenReconnection?: number;
  maxBufferSize?: number;
};

type StackDriverTransportOptions = {
  level: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly' | 'info';
  projectId: string;
  logName: string;
  serviceContext: {
    service: string;
    version: string;
    resourceType: string;
  };
  keyFilename?: string;
  labels?: object;
}

type TransportOptions = {
  console?: ConsoleTransportOptions;
  file?: FileTransportOptions;
  papertrail?: PapertrailTransportOptions;
  elasticsearch?: ElasticsearchTransportOptions;
  stackdriver?: StackDriverTransportOptions;
};

type Transports = {
  Console?: winston.transports.ConsoleTransportInstance;
  File?: winston.transports.FileTransportInstance;
  Elasticsearch?: typeof ElasticsearchTransport;
  PaperTrail?: typeof PapertrailTransport;
  Stackdriver?: typeof LoggingWinston;
};

type MultiLoggerOptions = {
  name: string;
  serviceType: string;
  apiVersion: string;
  transports: TransportOptions;
  catchUncaughtErrors?: boolean;
};

export declare const transports: Required<Transports>;
export declare function createLogger(options?: MultiLoggerOptions): winston.Logger;
