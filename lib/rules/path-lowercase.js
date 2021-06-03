/**
 * @fileoverview path needs to be lowercase
 * @author chegde
 */
"use strict";

module.exports = {
  meta: {
    docs: {
      description: "path lowercase tool.",
      category: "path",
      recommended: false,
    },
    fixable: "code",
    schema: [],
    messages: {
      pathLowercase: "path needs to be lowercase",
    },
  },

  create: function (context) {
    return {
      ImportDeclaration: (node) => {
        console.log(node.source.raw);
        if (false) {
          context.report({
            node,
            messageId: "pathLowercase",
            data: {},

            fix: function (fixer) {
              return fixer.replaceText(node, ``);
            },
          });
        }
      },
    };
  },
};
