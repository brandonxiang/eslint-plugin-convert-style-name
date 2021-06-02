/**
 * @fileoverview convert style name to class name
 * @author convert
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var rule = require("../../../lib/rules/ban-style-name"),
  RuleTester = require("eslint").RuleTester;

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

var ruleTester = new RuleTester();
ruleTester.run("ban-style-name", rule, {
  valid: [
    // give me some code that won't trigger a warning
  ],

  invalid: [
    {
      code: "no style name",
      errors: [
        {
          message: "Fill me in.",
          type: "Me too",
        },
      ],
    },
  ],
});
