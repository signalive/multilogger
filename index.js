const _ = require('lodash');
const Joi = require('joi');
const winston = require('winston');
const {PapertrailTransport} = require('winston-papertrail-transport');
const {ElasticsearchTransport} = require('winston-elasticsearch');
const {LoggingWinston: StackdriverTransport} = require('@google-cloud/logging-winston');


const consoleTransportSchema = Joi.compile(Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly').default('info'),
    silent: Joi.boolean(),
    format: Joi.func(),
    humanReadableUnhandledException: Joi.boolean(),
    showLevel: Joi.boolean(),
    formatter: Joi.func(),
    stderrLevels: Joi.array().items(Joi.string())
}).unknown(false));


const fileTransportSchema = Joi.compile(Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly').default('info'),
    silent: Joi.boolean(),
    format: Joi.func(),
    filename: Joi.string(),
    maxsize: Joi.number(),
    maxFiles: Joi.number(),
    stream: Joi.object(),
    eol: Joi.string(),
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
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly').default('info'),
    inlineMeta: Joi.boolean().default(true),
    colorize: Joi.func(),
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
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly').default('info'),
    index: Joi.string(),
    indexPrefix: Joi.string(),
    indexSuffixPattern: Joi.string(),
    messageType: Joi.string(),
    transformer: Joi.func(),
    useTransformer: Joi.boolean(),
    ensureIndexTemplate: Joi.boolean(),
    indexTemplate: Joi.object(),
    flushInterval: Joi.number(),
    retryLimit: Joi.number(),
    healthCheckTimeout: Joi.number(),
    healthCheckWaitForStatus: Joi.string().valid('green', 'yellow', 'red'),
    healthCheckWaitForNodes: Joi.number(),
    client: Joi.object(),
    clientOpts: Joi.object(),
    waitForActiveShards: Joi.number(),
    pipeline: Joi.number(),
    buffering: Joi.boolean(),
    bufferLimit: Joi.number(),
    apm: Joi.any(),
    dataStream: Joi.boolean(),
    source: Joi.string(),
    internalLogger: Joi.func(),
}).unknown(false));


const stackdriverTransportSchema = Joi.compile(Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly').default('info'),
    projectId: Joi.string().required(),
    logName: Joi.string().required(),
    serviceContext: Joi.object({
        service: Joi.string().required(),
        version: Joi.string().required(),
        resourceType: Joi.string().required()
    }).required(),
    keyFilename: Joi.string().optional(),
    labels: Joi.object().optional()
}).unknown(false));


exports.createLogger = function (params) {
    const {name, serviceType, apiVersion, transports} = Joi.attempt(params, Joi.object({
        name: Joi.string(),
        serviceType: Joi.string(),
        apiVersion: Joi.string(),
        transports: Joi.object()
    }));

    const logger = winston.createLogger({level: 'silly'});

    _.forEach(transports, (options, transport) => {
        if (_.isBoolean(options)) {
            if (!options) return;
            options = {};
        } else if (_.isString(options)) {
            if (options == 'enabled') options = {};
            else if (options == 'disabled') return;
            else
                throw new Error(`Unknown option ${options} for transport ${transport}`);
        }

        if (transport == 'console') {
            logger.remove(winston.transports.Console);

            const config = Joi.attempt(options, consoleTransportSchema);
            logger.add(new winston.transports.Console(config));
        }

        if (transport == 'file') {
            logger.remove(winston.transports.File);

            const config = Joi.attempt(options, fileTransportSchema);
            logger.add(new winston.transports.File(config));
        }

        if (transport == 'papertrail') {
            if (!name)
                throw new Error('A name must be set to the logger before creating papertrail transport');

            logger.remove(PapertrailTransport);

            _.defaults(options, {program: name});

            const config = Joi.attempt(options, papertrailTransportSchema);
            logger.add(new PapertrailTransport(config));
        }

        if (transport == 'elasticsearch') {
            logger.remove(ElasticsearchTransport);

            const config = Joi.attempt(options, elasticsearchTransportSchema);
            logger.add(new ElasticsearchTransport(config));
        }

        if (transport == 'stackdriver') {
            if (!name)
                throw new Error('A name must be set to the logger before creating stackdriver transport');

            if (!serviceType)
                throw new Error('A serviceType must be set to the logger before creating stackdriver transport');

            if (!apiVersion)
                throw new Error('An apiVersion must be set to the logger before creating stackdriver transport');

            const keyFilename = options.keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS;

            if (!keyFilename && !options.projectId)
                throw new Error('Either keyFilename or projectId must be provided in options to create stackdriver transport');

            logger.remove(StackdriverTransport);

            let projectId = null;

            if (keyFilename)
                projectId = require(keyFilename).project_id;

            _.defaultsDeep(options, {
                projectId,
                logName: serviceType,
                serviceContext: {
                    service: name,
                    version: apiVersion,
                    resourceType: 'api'
                },
                keyFilename,
                labels: {
                    name: name,
                    version:  apiVersion
                }
            });

            const config = Joi.attempt(options, stackdriverTransportSchema);
            logger.add(new StackdriverTransport(config));
        }
    });

    return logger;
}

exports.transports = {
    ...winston.transports,
    Papertrail: PapertrailTransport,
    Elasticsearch: ElasticsearchTransport,
    Stackdriver: StackdriverTransport
}
