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
    keyFileName: Joi.string().optional(),
    keyFilePath: Joi.string().optional()
}).unknown(false));


class MultiLogger extends winston.Logger {
    constructor(params) {
        super();

        Joi.attempt(params, Joi.alternatives().try(
            Joi.string(),
            Joi.object({
                name: Joi.string(),
                serviceType: Joi.string(),
                apiVersion: Joi.string(),
            })
        ));

        if (_.isString(params))
            this.setName(params);

        if (_.isObject(params)) {
            const {name, serviceType, apiVersion} = params;

            if (name) this.setName(name);
            if (serviceType)this.setServiceType(serviceType);
            if (apiVersion) this.setApiVersion(apiVersion);
        }
    }

    get name() {
        return this.__uniqueIdentifierName__;
    }

    setName(name) {
        Joi.attempt(name, Joi.string());

        this.__uniqueIdentifierName__ = name;
    }

    setServiceType(serviceType) {
        Joi.attempt(serviceType, Joi.string());

        this.serviceType = serviceType;
    }

    setApiVersion(apiVersion) {
        Joi.attempt(apiVersion, Joi.string());

        this.apiVersion = apiVersion;
    }

    addConsole({options = {}, multiple = false} = {}) {
        if (!multiple && this.transports.console) this.remove(winston.transports.Console);

        const config = Joi.attempt(options, consoleTransportSchema);
        this.add(winston.transports.Console, config);
    }

    addFile({options = {}, multiple = false} = {}) {
        if (!multiple && this.transports.file) this.remove(winston.transports.File);

        const config = Joi.attempt(options, fileTransportSchema);
        this.add(winston.transports.File, config);
    }

    addPapertrail({options = {}, multiple = false} = {}) {
        if (!this.name)
            throw new Error('A name must be set to the logger before creating papertrail transport');

        if (!multiple && this.transports.Papertrail) this.remove(winston.transports.Papertrail);

        _.defaults(options, {program: this.name});

        const config = Joi.attempt(options, papertrailTransportSchema);
        this.add(winston.transports.Papertrail, config);
    }

    addElasticsearch({options = {}, multiple = false} = {}) {
        if (!multiple && this.transports.Elasticsearch) this.remove(winston.transports.Elasticsearch);

        const config = Joi.attempt(options, elasticsearchTransportSchema);
        this.add(winston.transports.Elasticsearch, config);
    }

    addStackdriver({options = {}, multiple = false} = {}) {
        if (!this.name)
            throw new Error('A name must be set to the logger before creating stackdriver transport');

        if (!this.serviceType)
            throw new Error('A serviceType must be set to the logger before creating stackdriver transport');

        if (!this.apiVersion)
            throw new Error('An apiVersion must be set to the logger before creating stackdriver transport');

        if (!options.keyFilePath && !options.projectId)
            throw new Error('Either keyFilePath or projectId must be provided in options to create stackdriver transport');

        if (!multiple && this.transports.Stackdriver) this.remove(winston.transports.Stackdriver);

        let projectId = null;

        if (options.keyFilePath)
            projectId = require(options.keyFilePath).project_id;

        _.defaultsDeep(options, {
            projectId,
            logName: this.name,
            serviceContext: {
                service: this.serviceType,
                version: this.apiVersion,
                resourceType: 'api'
            }
        });

        const config = Joi.attempt(options, stackdriverTransportSchema);
        this.add(winston.transports.Stackdriver, config);
    }

    addTransport({transportName, options = {}} = {}) {
        switch (transportName) {
            case 'console': this.addConsole({options}); break;
            case 'file': this.addFile({options}); break;
            case 'papertrail': this.addPapertrail({options}); break;
            case 'elasticsearch': this.addElasticsearch({options}); break;
            case 'stackdriver': this.addStackdriver({options}); break;
            default: throw new Error(`Unknown transport ${transportName} is not allowed. Use addCustomTransport method`);
        }
    }

    addCustomTransport({transport, options = {}} = {}) {
        this.add(transport, options);
    }

    addByConfig(conf) {
        if (conf.papertrail)
            _.defaults(conf.papertrail, {program: this.name});

        if (conf.stackdriver)
            _.defaults(conf.stackdriver, {logName: this.name});

        Joi.attempt(conf, Joi.object({
            console: consoleTransportSchema,
            file: fileTransportSchema,
            papertrail: papertrailTransportSchema,
            elasticsearch: elasticsearchTransportSchema,
            stackdriver: stackdriverTransportSchema
        }));

        _.forEach(conf, (options, transport) => {
            if (transport == 'console') this.addConsole({options});
            if (transport == 'file') this.addFile({options});
            if (transport == 'papertrail') this.addPapertrail({options});
            if (transport == 'elasticsearch') this.addElasticsearch({options});
            if (transport == 'stackdriver') this.addStackdriver({options});
        });
    }
}


module.exports = MultiLogger;