/**
 * @fileoverview convert style name to class name
 * @author chegde
 */
"use strict";
const util = require("util");

const styleElementName = "styleSheet";
const debug = true;

const defaultLog = console.log;
console.log = function (...args) {
  if (debug) {
    defaultLog.apply(this, args);
  }
};

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
      avoidMethod: `The import style method is forbidden, such as: import'../../style.scss';`,
      inStyleAvoidStylesName: "Don't use styles to name jsx attributes anymore",
      avoidStyleName: "Prohibit the use of the styleName attribute",
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
              let raw = node.source.raw;
              if (raw.indexOf(".module.scss") >= 0) {
                return;
              }

              raw = node.source.raw.replace(".scss", ".module.scss");
              console.log("修复", raw);

              return fixer.replaceText(node, `import styles from ${raw}`);
            },
          });
        }
      },

      JSXAttribute: (node) => {
        if (
          ["style", "tabBarStyle", "headStyle", "bodyStyle"].includes(
            node.name.name
          )
        ) {
          const { value: identifierNode } = node;
          if (identifierNode) {
            // 替换style
            if (!identifierNode.loc) {
              console.log("no identifierNode", identifierNode);
            } else {
              if (identifierNode.type === "JSXExpressionContainer") {
                const object = identifierNode.expression.object;

                if (identifierNode.expression.type === "ObjectExpression") {
                  return;
                }

                if (!object) {
                  console.log("no object", identifierNode);
                  return;
                }

                if (object.name === "styles") {
                  console.log("替换style", object);
                  context.report({
                    node: object,
                    messageId: "inStyleAvoidStylesName",
                    data: {},
                    fix: function (fixer) {
                      return [fixer.replaceText(object, styleElementName)];
                    },
                  });
                }
              } else {
                console.log(identifierNode);
              }
            }
          }

          context.getScope().references.forEach((i) => {
            const { identifier, resolved } = i;

            if (
              identifier.type === "Identifier" &&
              identifier.name === "styles"
            ) {
              if (resolved === null) {
                context.report({
                  node: identifier,
                  messageId: "inStyleAvoidStylesName",
                  data: {},
                  fix: function (fixer) {
                    return [fixer.replaceText(identifier, styleElementName)];
                  },
                });

                return;
              }

              const { defs } = resolved;
              const def = defs.pop();
              if (!def) {
                // console.log(resolved.identifiers.pop().loc);
                return;
              }

              // 替换引用的地方
              const { name: nameNode } = def;
              if (nameNode.parent.type === "ImportDefaultSpecifier") {
                return;
              }

              if (nameNode) {
                context.report({
                  node: nameNode,
                  messageId: "inStyleAvoidStylesName",
                  data: {},
                  fix: function (fixer) {
                    return [fixer.replaceText(nameNode, styleElementName)];
                  },
                });
              }
            }
          });
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
    return `${str[0] === " " ? " " : ""}styles[\'${originClassNames[0]}\']`;
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

  if (node.type === "LogicalExpression") {
    return ` ${convertNode(node.left, context)} || ${convertNode(
      node.right,
      context
    )}`;
  }

  console.log(node);
  throw new Error("type isnt supported.");
}
