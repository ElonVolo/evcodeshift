# evcodeshift

evcodeshift is a toolkit for running codemods over multiple JavaScript or
TypeScript files. It is based largely off the excellent jscodeshift tool
published by Facebook.

It provides:

- A runner, which executes the provided transform for each file passed to it.
  It also outputs a summary of how many files have (not) been transformed.
- A wrapper around [recast][], providing a different API.  Recast is an
  AST-to-AST transform tool and also tries to preserve the style of original code
  as much as possible.

## Install

Get evcodeshift from [npm][]:

```
$ npm install -g evcodeshift
```

This will install the runner as `evcodeshift`.

## Usage (CLI)

The CLI provides the following options:

```
$ evcodeshift --help

Usage: evcodeshift [OPTION]... PATH...
  or:  evcodeshift [OPTION]... -t TRANSFORM_PATH PATH...
  or:  evcodeshift [OPTION]... -t URL PATH...
  or:  evcodeshift [OPTION]... --stdin < file_list.txt

Apply transform logic in TRANSFORM_PATH (recursively) to every PATH.
If --stdin is set, each line of the standard input is used as a path.

Options:
"..." behind an option means that it can be supplied multiple times.
All options are also passed to the transformer, which means you can supply custom options that are not listed here.

      --(no-)babel              apply babeljs to the transform file
                                (default: true)
  -c, --cpus=N                  start at most N child processes to process source files
                                (default: max(all - 1, 1))
  -d, --(no-)dry                dry run (no changes are made to files)
                                (default: false)
      --extensions=EXT          transform files with these file extensions (comma separated list)
                                (default: js)
  -h, --help                    print this help and exit
      --ignore-config=FILE ...  ignore files if they match patterns sourced from a configuration file (e.g. a .gitignore)
      --ignore-pattern=GLOB ...  ignore files that match a provided glob expression
      --(no-)gitignore          adds entries the current directory's .gitignore file
                                (default: false)
      --parser=babel|babylon|flow|ts|tsx  the parser to use for parsing the source files
                                          (default: babel)
      --parser-config=FILE      path to a JSON file containing a custom parser configuration for flow or babylon
  -p, --(no-)print              print transformed files to stdout, useful for development
                                (default: false)
      --(no-)run-in-band        run serially in the current process
                                (default: false)
  -s, --(no-)silent             do not write to stdout or stderr
                                (default: false)
      --(no-)stdin              read file/directory list from stdin
                                (default: false)
  -t, --transform=FILE          path to the transform file. Can be either a local path or url
                                (default: ./transform.js)
  -v, --verbose=0|1|2           show more information about the transform process
                                (default: 0)
      --version                 print version and exit
      --fail-on-error           return a 1 exit code when errors were found during execution of codemods
```

This passes the source of all passed through the transform module specified
with `-t` or `--transform` (defaults to `transform.js` in the current
directory).

## Setting up VSCode to debug codemods

It's recommended that you set up your codemod project to all debugging via the VSCode IDE. When you open your project in VSCode, add the following configuration to your launch.json debugging configuration.

```
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "pwa-node",
            "request": "launch",
            "name": "Debug Transform",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceRoot}/node_modules/.bin/evcodeshift",
            "stopOnEntry": false,
            "args": ["--dry", "--print", "-t", "${input:transformFile}", "--parser", "${input:parser}", "--run-in-band", "${file}"],
            "preLaunchTask": null,
            "runtimeExecutable": null,
            "runtimeArgs": [
                "--nolazy"
            ],
            "console": "internalConsole",
            "sourceMaps": true,
            "outFiles": []
        },
        {
            "name": "Debug All JSCodeshift Jest Tests",
            "type": "node",
            "request": "launch",
            "runtimeArgs": [
                "--inspect-brk",
                "${workspaceRoot}/node_modules/jest/bin/jest.js",
                "--runInBand",
                "--testPathPattern=${fileBasenameNoExtension}"
            ],
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen",
            "port": 9229
        }
    ],
    "inputs": [
        {
          "type": "pickString",
          "id": "parser",
          "description": "jscodeshift parser",
          "options": [
            "babel",
            "babylon",
            "flow",
            "ts",
            "tsx",
          ],
          "default": "babel"
        },
        {
            "type": "promptString",
            "id": "transformFile",
            "description": "evcodeshift transform file",
            "default": "transform.js"
        }
    ]
}
```

Once this has been added to the configuration

1. Install evcodeshift as a package if you haven't done so already by running the command  **npm install --save evcodeshift**. The debug configuration will not work otherwise.
2. Once the evcodeshift local package has been installed, go to the VSCode file tree and select the file on which you want to run the transform. For example, if you wanted to run codemod transforms of foo.js file, you would click on the entry for foo.js file in your project tree.
3. Select "Debug Transform" from the debugging menu's options menu.
4. Click the **"Start Debugging"** button on the VSCode debugger.
5. You will be then prompted for the name of evcodeshift transform file. Enter in the name of the transform file to use. If no name is given it will default to **transform.js**
6. Select the parser to use from the presented selection list of parsers. The transform will otherwise default to using the **babel** parser.
7. The transform will then be run, stopping at any breakpoints that have been set.
8. If there are no errors and the transform is complete, then the results of the transform will be printed in the VSCode debugging console. The file with the contents that have been transformed will not be changed, as the debug configuration makes use the evcodeshift **--dry** option.

## Avoiding unwanted transforms

The largest PITA of using evcodeshift is evcodeshift trying to transform stuff in node_modules directories in the project's root or other places.

The quickest way to to prevent evcodeshift from transforming anything in your node_modules directory is pass evcodeshift the `--gitignore` flag. Make sure the content of  [standard node.js .gitignore](https://github.com/github/gitignore/blob/master/Node.gitignore) is added to your project's root directory .gitignore.

Any standard .gitignore-ish glob pattern found in .gitignore will be ignored when the `--gitignore` flag is passed.

Anything that shouldn't traditionally be found in a .gitignore file file would be a better candidate for the `ignore-config` and `ignore-pattern` flags.

## Transform module

The transform is simply a module that exports a function of the form:

```js
module.exports = function(fileInfo, api, options) {
  // transform `fileInfo.source` here
  // ...
  // return changed source
  return source;
};
```

As of v0.6.1, this module can also be written in TypeScript.

### Arguments

#### `fileInfo`

Holds information about the currently processed file.

Property    | Description
------------|------------
path        | File path
source      | File content

#### `api`

This object exposes the `evcodeshift` library and helper functions from the
runner.

Property    | Description
------------|------------
evcodeshift | A reference to the evcodeshift library
stats       | A function to collect statistics during `--dry` runs
report      | Prints the passed string to stdout

`evcodeshift` is a reference to the wrapper around recast and provides a
jQuery-like API to navigate and transform the AST. Here is a quick example,
a more detailed description can be found below.

```js
/**
 * This replaces every occurrence of variable "foo".
 */
module.exports = function(fileInfo, api) {
  return api.evcodeshift(fileInfo.source)
    .findVariableDeclarators('foo')
    .renameTo('bar')
    .toSource();
}
```

**Note:** This API is exposed for convenience, but you don't have to use it.
You can use any tool to modify the source.

`stats` is a function that only works when the `--dry` options is set. It accepts
a string, and will simply count how often it was called with that value.

At the end, the CLI will report those values. This can be useful while
developing the transform, e.g. to find out how often a certain construct
appears in the source(s).

**`report`** allows you do print arbitrary strings to stdout. This can be
useful when other tools consume the output of evcodeshift. The reason to not
directly use `process.stdout` in transform code is to avoid mangled output when
many files are processed.

#### `options`

Contains all options that have been passed to runner. This allows you to pass
additional options to the transform. For example, if the CLI is called with

```
$ evcodeshift -t myTransforms fileA fileB --foo=bar
```

`options` would contain `{foo: 'bar'}`.

### Return value

The return value of the function determines the status of the transformation:

- If a string is returned and it is different from passed source, the
  transform is considered to be successful.
- If a string is returned but it's the same as the source, the transform
  is considered to be unsuccessful.
- If nothing is returned, the file is not supposed to be transformed (which is
  ok).

The CLI provides a summary of the transformation at the end. You can get more
detailed information by setting the `-v` option to `1` or `2`.

You can collect even more stats via the `stats` function as explained above.
### Parser

The transform can let evcodeshift know with which parser to parse the source
files (and features like templates).

To do that, the transform module can export `parser`, which can either be one
of the strings `"babel"`, `"babylon"`, `"flow"`, `"ts"`, or `"tsx"`,
or it can be a parser object that is compatible with recast.

For example:

```js
module.exports.parser = 'flow'; // use the flow parser
// or
module.exports.parser = {
  parse: function(source) {
    // return estree compatible AST
  },
};
```
### Example output

```text
$ evcodeshift -t myTransform.js src
Processing 10 files...
Spawning 2 workers with 5 files each...
All workers done.
Results: 0 errors 2 unmodified 3 skipped 5 ok
```

## The evcodeshift API

As already mentioned, evcodeshift also provides a wrapper around [recast][].
In order to properly use the evcodeshift API, one has to understand the basic
building blocks of recast (and ASTs) as well.

### Core Concepts

#### AST nodes

An AST node is a plain JavaScript object with a specific set of fields, in
accordance with the [Mozilla Parser API][]. The primary way to identify nodes
is via their `type`.

For example, string literals are represented via `Literal` nodes, which
have the structure

```js
// "foo"
{
  type: 'Literal',
  value: 'foo',
  raw: '"foo"'
}
```

It's OK to not know the structure of every AST node type.
The [(esprima) AST explorer][ast-explorer] is an online tool to inspect the AST
for a given piece of JS code.

#### Path objects

Recast itself relies heavily on [ast-types][] which defines methods to traverse
the AST, access node fields and build new nodes. ast-types wraps every AST node
into a *path object*. Paths contain meta-information and helper methods to
process AST nodes.

For example, the child-parent relationship between two nodes is not explicitly
defined. Given a plain AST node, it is not possible to traverse the tree *up*.
Given a path object however, the parent can be traversed to via `path.parent`.

For more information about the path object API, please have a look at
[ast-types][].

#### Builders

To make creating AST nodes a bit simpler and "safer", ast-types defines a couple
of *builder methods*, which are also exposed on `evcodeshift`.

For example, the following creates an AST equivalent to `foo(bar)`:

```js
// inside a module transform
var j = evcodeshift;
// foo(bar);
var ast = j.callExpression(
  j.identifier('foo'),
  [j.identifier('bar')]
);
```

The signature of each builder function is best learned by having a look at the
[definition files](https://github.com/benjamn/ast-types/blob/master/def/).

### Collections and Traversal

In order to transform the AST, you have to traverse it and find the nodes that
need to be changed. evcodeshift is built around the idea of **collections** of
paths and thus provides a different way of processing an AST than recast or
ast-types.

A collection has methods to process the nodes inside a collection, often
resulting in a new collection. This results in a fluent interface, which can
make the transform more readable.

Collections are "typed" which means that the type of a collection is the
"lowest" type all AST nodes in the collection have in common. That means you
cannot call a method for a `FunctionExpression` collection on an `Identifier`
collection.

Here is an example of how one would find/traverse all `Identifier` nodes with
evcodeshift and with recast:

```js
// recast
var ast = recast.parse(src);
recast.visit(ast, {
  visitIdentifier: function(path) {
    // do something with path
    return false;
  }
});

// evcodeshift
evcodeshift(src)
  .find(evcodeshift.Identifier)
  .forEach(function(path) {
    // do something with path
  });
```

To learn about the provided methods, have a look at the
[Collection.js](src/Collection.js) and its [extensions](src/collections/).

### Extensibility

evcodeshift provides an API to extend collections. By moving common operators
into helper functions (which can be stored separately in other modules), a
transform can be made more readable.

There are two types of extensions: generic extensions and type-specific
extensions. **Generic extensions** are applicable to all collections. As such,
they typically don't access specific node data, but rather traverse the AST from
the nodes in the collection. **Type-specific** extensions work only on specific
node types and are not callable on differently typed collections.

#### Examples

```js
// Adding a method to all Identifiers
evcodeshift.registerMethods({
  logNames: function() {
    return this.forEach(function(path) {
      console.log(path.node.name);
    });
  }
}, evcodeshift.Identifier);

// Adding a method to all collections
evcodeshift.registerMethods({
  findIdentifiers: function() {
    return this.find(evcodeshift.Identifier);
  }
});

evcodeshift(ast).findIdentifiers().logNames();
evcodeshift(ast).logNames(); // error, unless `ast` only consists of Identifier nodes
```

### Passing options to [recast]

You may want to change some of the output settings (like setting `'` instead of `"`).
This can be done by passing config options to [recast].

```js
.toSource({quote: 'single'}); // sets strings to use single quotes in transformed code.
```

You can also pass options to recast's `parse` method by passing an object to
evcodeshift as second argument:

```js
evcodeshift(source, {...})
```

More on config options [here](https://github.com/benjamn/recast/blob/52a7ec3eaaa37e78436841ed8afc948033a86252/lib/options.js#L61)


## Programmatically calling evcodeshift from code (JS)

```js
const {run: evcodeshift} = require('evcodeshift/src/Runner')

const transformPath = 'transform.js'
const paths = ['foo.js', 'bar']
const options = {
  dry: true,
  print: true,
  verbose: 1,
  // ...
}

const res = await evcodeshift(transformPath, paths, options)
console.log(res)
/*
{
  stats: {},
  timeElapsed: '0.001',
  error: 0,
  ok: 0,
  nochange: 0,
  skip: 0
}
*/
```

### Unit Testing

evcodeshift comes with a simple utility to allow easy unit testing with [Jest](https://facebook.github.io/jest/), without having to write a lot of boilerplate code. This utility makes some assumptions in order to reduce the amount of configuration required:

 - The test is located in a subdirectory under the directory the transform itself is located in (eg. `__tests__`)
 - Test fixtures are located in a `__testfixtures__` directory

This results in a directory structure like this:

```
/MyTransform.js
/__tests__/MyTransform-test.js
/__testfixtures__/MyTransform.input.js
/__testfixtures__/MyTransform.output.js
```

A simple example of unit tests is bundled in the [sample directory](sample).

The `testUtils` module exposes a number of useful helpers for unit testing.

#### `defineTest`

Defines a Jest/Jasmine test for a evcodeshift transform which depends on fixtures

```js
jest.autoMockOff();
const defineTest = require('evcodeshift/dist/testUtils').defineTest;
defineTest(__dirname, 'MyTransform');
```

An alternate fixture filename can be provided as the fourth argument to `defineTest`.
This also means that multiple test fixtures can be provided:

```js
defineTest(__dirname, 'MyTransform', null, 'FirstFixture');
defineTest(__dirname, 'MyTransform', null, 'SecondFixture');
```

This will run two tests:
- `__testfixtures__/FirstFixture.input.js`
- `__testfixtures__/SecondFixture.input.js`

#### `defineInlineTest`

Defines a Jest/Jasmine test suite for a evcodeshift transform which accepts inline values

This is a more flexible alternative to `defineTest`, as this allows to also provide options to your transform

```js
const defineInlineTest = require('evcodeshift/dist/testUtils').defineInlineTest;
const transform = require('../myTransform');
const transformOptions = {};
defineInlineTest(transform, transformOptions, 'input', 'expected output', 'test name (optional)');
```

#### `defineSnapshotTest`

Similar to `defineInlineTest` but instead of requiring an output value, it uses Jest's `toMatchSnapshot()`

```js
const defineSnapshotTest = require('evcodeshift/dist/testUtils').defineSnapshotTest;
const transform = require('../myTransform');
const transformOptions = {};
defineSnapshotTest(transform, transformOptions, 'input', 'test name (optional)');
```

For more information on snapshots, check out [Jest's docs](https://jestjs.io/docs/en/snapshot-testing)

#### `applyTransform`

Executes your transform using the options and the input given and returns the result.
This function is used internally by the other helpers, but it can prove useful in other cases.

```js
const applyTransform = require('evcodeshift/dist/testUtils').applyTransform;
const transform = require('../myTransform');
const transformOptions = {};
const output = applyTransform(transform, transformOptions, 'input');
```

#### ES modules

If you're authoring your transforms and tests using ES modules, make sure to import the transform's parser (if specified) in your tests:

```js
// MyTransform.js
export const parser = 'flow'
export default function MyTransform(fileInfo, api) {
  // ...
}
```
```js
// __tests__/MyTransform-test.js
import { defineInlineTest } from 'evcodeshift/dist/testUtils
import * as transform from '../MyTransform

console.log(transform.parser) // 'flow'

defineInlineTest(transform, /* ... */)
```

### Example Codemods

- [react-codemod](https://github.com/reactjs/react-codemod) - React codemod scripts to update React APIs.
- [js-codemod](https://github.com/cpojer/js-codemod/) - Codemod scripts to transform code to next generation JS.
- [js-transforms](https://github.com/jhgg/js-transforms) - Some documented codemod experiments to help you learn.

### Recipes

- [Retain leading comment(s) in file when replacing/removing first statement](recipes/retain-first-comment.md)

[npm]: https://www.npmjs.com/
[Mozilla Parser API]: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API
[recast]: https://github.com/benjamn/recast
[ast-types]: https://github.com/benjamn/ast-types
[ast-explorer]: http://astexplorer.net/
