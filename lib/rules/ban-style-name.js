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
                `import styles from ${node.source.raw.replace(
                  /.scss$/,
                  ".module.scss"
                )}`
              );
            },
          });
        }
      },

      JSXAttribute: (node) => {
        if (node.name.name === "style") {
        }

        /* <div styleName={!list ? 'changelog empty' : 'changelog'}> */
        if (node.name.name === "styleName") {
          const jsxAttributeValue = node.value;

          let replaceCodeClassNames = "";
          if (jsxAttributeValue.type === "Literal") {
            replaceCodeClassNames = convertNode(jsxAttributeValue);
          }

          if (jsxAttributeValue.type === "JSXExpressionContainer") {
            const expression = jsxAttributeValue.expression;
            replaceCodeClassNames = convertNode(expression, context);
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
  const originClassNames = str.split(" ").filter(Boolean);

  const inlineClassNames = originClassNames
    .map((curr) => {
      return `\${styles['${curr}']}`;
    })
    .join(" ");

  if (originClassNames.length === 1) {
    return ` styles[\'${originClassNames[0]}\']`;
  }

  return "`" + inlineClassNames + "`";
}

function convertNode(node, context) {
  if (node.type === "Literal") {
    return strToClassNames(node.value);
  }

  if (node.type === "Identifier" && node.name === "undefined") {
    return "' '";
  }

  if (node.type === "TemplateElement") {
    return node.value.raw ?? "' '";
  }

  if (node.type === "ConditionalExpression") {
    const { consequent, alternate, test } = node;

    const testCode = context.getSourceCode().getText(test);
    const consequentCode = convertNode(consequent, context);
    const alternateCode = convertNode(alternate, context);

    console.log(
      "三元转换至",
      `${testCode} ? ${consequentCode} : ${alternateCode}`
    );

    return `${testCode} ? ${consequentCode} : ${alternateCode}`;
  }

  if (
    node.type === "CallExpression" ||
    node.type === "MemberExpression" ||
    node.type === "Identifier"
  ) {
    return `styles[${context.getSourceCode().getText(node)}]`;
  }

  if (node.type === "TemplateLiteral") {
    // console.log(
    //   "TemplateLiteral",
    //   node,
    //   context.getSourceCode().getText(node),
    //   `styles[${context.getSourceCode().getText(node)}]`
    // );

    const { expressions, quasis } = node;

    let result = "` ";
    for (let queryIndex = 0; queryIndex < quasis.length - 1; queryIndex++) {
      const query = quasis[queryIndex];
      const expression = expressions[queryIndex];
      result +=
        convertNode(query) + " ${" + convertNode(expression, context) + "}";
    }
    result += convertNode(quasis[quasis.length - 1]) + "`";
    return result;
  }
  return ``;
}
