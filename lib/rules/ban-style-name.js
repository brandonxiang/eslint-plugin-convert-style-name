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
        if (
          node.source.raw.indexOf("scss") > 0 &&
          node.specifiers.length === 0
        ) {
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
        function strToClassNames(str) {
          const originClassNames = str.split(" ");

          const inlineClassNames = originClassNames
            .map((curr) => {
              return `\${styles['${curr}']}`;
            })
            .join(" ");

          return inlineClassNames;
        }

        /* <div styleName={!list ? 'changelog empty' : 'changelog'}> */
        if (node.name.name === "styleName") {
          const jsxAttributeValue = node.value;

          const inlineClassNames = "";
          if (jsxAttributeValue.type === "Literal") {
            inlineClassNames = strToClassNames(jsxAttributeValue.value);
          }

          const parentNode = context.getAncestors().pop();

          const { attributes } = parentNode;
          const classNameNode = attributes.find(
            (attribute) => attribute.name.name === "className"
          );

          if (classNameNode) {
            const originText = context.getSourceCode().getText(classNameNode);
            const convertText = originText.replace(
              "}",
              " + " + "` " + inlineClassNames + "`" + "}"
            );

            context.report({
              node,
              messageId: "avoidStyleName",
              data: {},
              fix: function (fixer) {
                return [
                  fixer.remove(node),
                  fixer.replaceText(classNameNode, convertText),
                ];
              },
            });
          } else {
            const convertText = "className={`" + inlineClassNames + "`}";
            context.report({
              node,
              messageId: "avoidStyleName",
              data: {},
              fix: function (fixer) {
                return fixer.replaceText(node, convertText);
              },
            });
          }
        }
      },
    };
  },
};
