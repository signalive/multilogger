const _ = require('lodash');
const Joi = require('joi');
const winston = require('winston');
const Papertrail = require('winston-papertrail');
const Elasticsearch = require('winston-elasticsearch');
const Stackdriver = require('@google-cloud/logging-winston');


const consoleTransportSchema = Joi.compile(Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly'),
    silent: Joi.boolean(),
    colorize: Joi.boolean().default(true),
    timestamp: Joi.alternatives().try(Joi.boolean(), Joi.func()),
    json: Joi.boolean(),
    stringify: Joi.boolean(),
    prettyPrint: Joi.boolean().default(true),
    depth: Joi.number(),
    humanReadableUnhandledException: Joi.boolean(),
    showLevel: Joi.boolean(),
    formatter: Joi.func(),
    stderrLevels: Joi.array().items(Joi.string())
}).unknown(false));


const fileTransportSchema = Joi.compile(Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly'),
    label: Joi.string(),
    silent: Joi.boolean(),
    colorize: Joi.boolean().default(true),
    timestamp: Joi.alternatives().try(Joi.boolean(), Joi.func()),
    filename: Joi.string(),
    maxsize: Joi.number(),
    maxFiles: Joi.number(),
    stream: Joi.object(),
    json: Joi.boolean(),
    eol: Joi.string(),
    prettyPrint: Joi.boolean().default(true),
    depth: Joi.number(),
    logstash: Joi.boolean(),
    showLevel: Joi.boolean(),
    formatter: Joi.func(),
    tailable: Joi.boolean(),
    maxRetries: Joi.number(),
    zippedArchive: Joi.boolean(),
    options: Joi.object()
}).unknown(false));


const papertrailTransportSchema = Joi.compile(Joi.object({
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    program: Joi.string().required(),
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly'),
    inlineMeta: Joi.boolean().default(true),
    colorize: Joi.boolean().default(true),
    flushOnClose: Joi.boolean().default(true),
    /* Detailed Configuration */
    logFormat: Joi.func(),
    hostname: Joi.string(),
    disableTls: Joi.boolean(),
    levels: Joi.object(),
    facility: Joi.string(),
    handleExceptions: Joi.boolean(),
    depth: Joi.number(),
    /* Connection Failure Related */
    attemptsBeforeDecay: Joi.number(),
    maximumAttempts: Joi.number(),
    connectionDelay: Joi.number(),
    maxDelayBetweenReconnection: Joi.number(),
    maxBufferSize: Joi.number()
}).unknown(false));


const elasticsearchTransportSchema = Joi.compile(Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly'),
    index: Joi.string(),
    indexPrefix: Joi.string(),
    indexSuffixPattern: Joi.string(),
    messageType: Joi.string(),
    transformer: Joi.func(),
    ensureMappingTemplate: Joi.boolean(),
    mappingTemplate: Joi.object(),
    flushInterval: Joi.number(),
    client: Joi.object(),
    clientOpts: Joi.object(),
    waitForActiveShards: Joi.number(),
    pipeline: Joi.number(),
}).unknown(false));


const stackdriverTransportSchema = Joi.compile(Joi.object({
    projectId: Joi.string().required(),
    logName: Joi.string().required(),
    serviceContext: Joi.object({
        service: Joi.string().required(),
        version: Joi.string().required(),
        resourceType: Joi.string().required()
    }).required(),
    keyFileName: Joi.string().optional()
}).unknown(false));


class MultiLoggerFactory {
    static create(name) {
        const logger = new winston.Logger();
        logger.__uniqueIdentifierName__ = name;
        return logger;
    }

    static addConsole({logger, options = {}, multiple = false}) {
        if (!multiple && logger.transports.console) logger.remove(winston.transports.Console);

        const config = Joi.attempt(options, consoleTransportSchema);
        logger.add(winston.transports.Console, config);
    }

    static addFile({logger, options = {}, multiple = false}) {
        if (!multiple && logger.transports.file) logger.remove(winston.transports.File);

        const config = Joi.attempt(options, fileTransportSchema);
        logger.add(winston.transports.File, config);
    }

    static addPapertrail({logger, options = {}, multiple = false}) {
        if (!multiple && logger.transports.Papertrail) logger.remove(winston.transports.Papertrail);

        _.defaults(options, {program: logger.__uniqueIdentifierName__});

        const config = Joi.attempt(options, papertrailTransportSchema);
        logger.add(winston.transports.Papertrail, config);
    }

    static addElasticsearch({logger, options = {}, multiple = false}) {
        if (!multiple && logger.transports.Elasticsearch) logger.remove(winston.transports.Elasticsearch);

        const config = Joi.attempt(options, elasticsearchTransportSchema);
        logger.add(winston.transports.Elasticsearch, config);
    }

    static addStackdriver({logger, options = {}, multiple = false}) {
        if (!multiple && logger.transports.Stackdriver) logger.remove(winston.transports.Stackdriver);

        _.defaults(options, {logName: logger.__uniqueIdentifierName__});

        const config = Joi.attempt(options, stackdriverTransportSchema);
        logger.add(winston.transports.Stackdriver, config);
    }

    static addCustom({logger, transport, options = {}}) {
        logger.add(transport, options);
    }
}

module.exports = MultiLoggerFactory;