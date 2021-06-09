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
      avoidMethod: "import style method is forbidden",
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
        /* <div styleName={!list ? 'changelog empty' : 'changelog'}> */
        if (node.name.name === "styleName") {
          const jsxAttributeValue = node.value;

          let replaceCodeClassNames = "";
          if (jsxAttributeValue.type === "Literal") {
            replaceCodeClassNames = convertNode(jsxAttributeValue);
          }

          if (jsxAttributeValue.type === "JSXExpressionContainer") {
            const expression = jsxAttributeValue.expression;
            replaceCodeClassNames = convertNode(
              jsxAttributeValue.expression,
              context
            );

            if (expression.type === "ConditionalExpression") {
              const { consequent, alternate, test } = expression;

              if (
                consequent.type === "Literal" &&
                alternate.type === "Literal"
              ) {
                const testCode = context.getSourceCode().getText(test);
                const consequentCode = convertNode(consequent, context);
                const alternateCode = convertNode(alternate, context);

                replaceCodeClassNames = `${testCode} ? ${consequentCode} : ${alternateCode}`;
                console.log("三元", replaceCodeClassNames);
              }

              // console.log(context
              //   .getSourceCode()
              //   .getText(expression.test))
              // replaceCodeClassNames = `styles[${}]`;
            }
          }

          if (replaceCodeClassNames === "") {
            console.log(jsxAttributeValue);
            throw new Error("type isnt supported.");
          }

          const parentNode = context.getAncestors().pop();

          const { attributes } = parentNode;
          const classNameNode = attributes.find((attribute) => {
            if (
              attribute.type !== "JSXSpreadAttribute" &&
              attribute &&
              attribute.name === undefined
            ) {
              console.log(attribute);
            }

            return (
              attribute.type !== "JSXSpreadAttribute" &&
              attribute.name.name === "className"
            );
          });

          if (classNameNode) {
            const originText = context.getSourceCode().getText(classNameNode);
            const convertText = originText.replace(
              "}",
              " + " + replaceCodeClassNames + "}"
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
            const convertText = "className={" + replaceCodeClassNames + "}";
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

// replace ClassNames with code
function strToClassNames(str) {
  const originClassNames = str.split(" ");

  const inlineClassNames = originClassNames
    .map((curr) => {
      return `\${styles['${curr}']}`;
    })
    .join(" ");

  if (originClassNames.length === 1) {
    return `styles[\'${str}\']`;
  }

  return "`" + inlineClassNames + "`";
}

function convertNode(node, context) {
  if (node.type === "Literal") {
    return strToClassNames(node.value);
  }

  if (
    node.type === "TemplateLiteral" ||
    node.type === "CallExpression" ||
    node.type === "MemberExpression" ||
    node.type === "Identifier"
  ) {
    return `styles[${context.getSourceCode().getText(node)}]`;
  }
  return ``;
}
