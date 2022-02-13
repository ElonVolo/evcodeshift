
const EventEmitter = require('events').EventEmitter;

const async = require('neo-async');
const fs = require('graceful-fs');
const writeFileAtomic = require('write-file-atomic');
const { DEFAULT_EXTENSIONS } = require('@babel/core');
const getParser = require('./getParser');

const jscodeshift = require('./core');

let presetEnv;
try {
  presetEnv = require('@babel/preset-env');
} catch (_) {}

export class TransformWorker {
  constructor(shouldRunAsStandloneExecutable, ...args) {
    this.emitter = null;
    this.finish = null;
    this.notify = null;
    this.transform = null;
    this.parserFromTransform = null;

    if (!shouldRunAsStandloneExecutable) {
      this.emitter = new EventEmitter();
      this.emitter.send = (data) => { run(data); };
      this.finish = () => { emitter.emit('disconnect'); };
      this.notify = (data) => { emitter.emit('message', data); };
      this.setup(args[0], args[1]);
    } else {
      this.finish = () => setImmediate(() => process.disconnect());
      this.notify = (data) => { process.send(data); };
      this.process.on('message', (data) => { run(data); });
      this.setup(process.argv[2], process.argv[3]);
    }
  }

  prepareJscodeshift(options) {
    const parser = this.parserFromTransform ||
          getParser(options.parser, options.parserConfig);

    return jscodeshift.withParser(parser);
  }

  setup(transformFile, babel) {
    if (babel === 'babel') {
      const presets = [];
      if (presetEnv) {
        presets.push([
          presetEnv.default,
          {targets: {node: true}},
        ]);
      }
      presets.push(
        /\.tsx?$/.test(transformFile) ?
          require('@babel/preset-typescript').default :
          require('@babel/preset-flow').default
      );

      require('@babel/register')({
        babelrc: false,
        presets,
        plugins: [
          require('@babel/plugin-proposal-class-properties').default,
          require('@babel/plugin-proposal-nullish-coalescing-operator').default,
          require('@babel/plugin-proposal-optional-chaining').default,
          require('@babel/plugin-transform-modules-commonjs').default,
        ],
        extensions: [...DEFAULT_EXTENSIONS, '.ts', '.tsx'],
        // By default, babel register only compiles things inside the current working directory.
        // https://github.com/babel/babel/blob/2a4f16236656178e84b05b8915aab9261c55782c/packages/babel-register/src/node.js#L140-L157
        ignore: [
          // Ignore parser related files
          /@babel\/parser/,
          /\/flow-parser\//,
          /\/recast\//,
          /\/ast-types\//,
        ],
      });
    }

    const module = require(transformFile);
    transform = typeof module.default === 'function' ?
      module.default :
      module;
    if (module.parser) {
      parserFromTransform = typeof module.parser === 'string' ?
        getParser(module.parser) :
        module.parser;
    }
  }

  free() {
    this.notify({action: 'free'});
  }

  updateStatus(status, file, msg) {
    msg = msg ? file + ' ' + msg : file;
    this.notify({action: 'status', status: status, msg: msg});
  }

  report(file, msg) {
    this.notify({action: 'report', file, msg});
  }

  empty() {}

  stats(name, quantity) {
    quantity = typeof quantity !== 'number' ? 1 : quantity;
    notify({action: 'update', name: name, quantity: quantity});
  }

  trimStackTrace(trace) {
    if (!trace) {
      return '';
    }
    // Remove this file from the stack trace of an error thrown in the transformer
    const lines = trace.split('\n');
    const result = [];
    lines.every(function(line) {
      if (line.indexOf(__filename) === -1) {
        result.push(line);
        return true;
      }
    });
    return result.join('\n');
  }

  run(data) {
    const files = data.files;
    const options = data.options || {};
    if (!files.length) {
      finish();
      return;
    }

    async.each(
      files,
      function(file, callback) {
        fs.readFile(file, async function(err, source) {
          if (err) {
            this.updateStatus('error', file, 'File error: ' + err);
            callback();
            return;
          }
          source = source.toString();
          try {
            const jscodeshift = prepareJscodeshift(options);
            const out = await transform(
              {
                path: file,
                source: source,
              },
              {
                j: jscodeshift,
                jscodeshift: jscodeshift,
                stats: options.dry ? stats : empty,
                report: msg => report(file, msg),
              },
              options
            );
            if (!out || out === source) {
              this.updateStatus(out ? 'nochange' : 'skip', file);
              callback();
              return;
            }
            if (options.print) {
              console.log(out); // eslint-disable-line no-console
            }
            if (!options.dry) {
              writeFileAtomic(file, out, function(err) {
                if (err) {
                  this.updateStatus('error', file, 'File writer error: ' + err);
                } else {
                  this.updateStatus('ok', file);
                }
                callback();
              });
            } else {
              this.updateStatus('ok', file);
              callback();
            }
          } catch(err) {
            this.updateStatus(
              'error',
              file,
              'Transformation error ('+ err.message.replace(/\n/g, ' ') + ')\n' + trimStackTrace(err.stack)
            );
            callback();
          }
        });
      },
      function(err) {
        if (err) {
          this.updateStatus('error', '', 'This should never be shown!');
        }
        free();
      }
    );
  }
}
