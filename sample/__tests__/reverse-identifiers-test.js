/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * An example of writing a unit test for a jscodeshift script using the
 * `defineTest` helper bundled with jscodeshift. This will run the
 * reverse-identifiers.js transform with the input specified in the
 * reverse-identifiers-input file, and expect the output to be the same as that
 * in reverse-identifiers-output.
 */

'use strict';

jest.autoMockOff();
const defineTest = require('../../src/testUtils').defineTest;
const defineInlineTest = require('../../src/testUtils').defineInlineTest;
const transform = require('../reverse-identifiers');

defineTest(__dirname, 'reverse-identifiers');

defineTest(__dirname, 'reverse-identifiers', null, 'typescript/reverse-identifiers', { parser: 'ts' });

// defineTest(__dirname, 'reverse-identifiers', null, 'typescript/reverse-identifiers', { parser: 'ts', saveoutput: true });
//
// The commented out test above would run the same as the uncommented one above it, but passing in value true for saveoutput will create
// the following directory structure in the project root
//
//   unit_test_output
//     /reverse-identifiers
//        /reverse-identifiers.input.js             # The original code given to the unit test
//        /reverse-identifiers.output.js            # The output that the unit test is expecting to see if all goes well
//        /reverse-identifiers.transformed.js       # The actual result of running the transformation (may different from output if unit test is failing)
//

describe('reverse-identifiers', () => {
  defineInlineTest(transform, {}, `
var firstWord = 'Hello ';
var secondWord = 'world';
var message = firstWord + secondWord;`,`
var droWtsrif = 'Hello ';
var droWdnoces = 'world';
var egassem = droWtsrif + droWdnoces;
  `);
  defineInlineTest(transform, {},
    'function aFunction() {};',
    'function noitcnuFa() {};',
    'Reverses function names'
  );
});
