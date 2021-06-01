/**
 * @fileoverview convert style name to class name
 * @author chegde
 */
"use strict";

module.exports = {
  meta: {
    docs: {
      description: "disable import style by this.",
      category: "Fill me in",
      recommended: false,
    },
    fixable: "code", // or "code" or "whitespace"
    schema: [],
    messages: {
      avoidMethod: "import style method is forbidden.",
      avoidStyleName: "ban styleName",
    },
  },

  create: function (context) {
    return {
      ImportDeclaration: (node) => {
        if (node.source.raw.indexOf("scss") > 0) {
          context.report({
            node,
            messageId: "avoidMethod",
            data: {},

            fix: function (fixer) {
              return fixer.replaceText(
                node,
                `import styles from ${node.source.raw}`
              );
            },
          });
        }
      },

      JSXAttribute: (node) => {
        if (node.name.name === "styleName") {
          context.report({
            node,
            messageId: "avoidStyleName",
            data: {},
          });
        }
      },
    };
  },
};
