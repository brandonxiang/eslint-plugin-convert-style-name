/**
 * @fileoverview convert style name to class name
 * @author chegde
 */
'use strict';
const util = require('util');
const { convertNode } = require('./convertNode');
const { defaultStyleIdentityName } = require('./const');
const styleElementName = 'styleSheet';
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
      description: 'disable import style by this.',
      category: 'Fill me in',
      recommended: false,
    },
    fixable: 'code', // or "code" or "whitespace"
    schema: [],
    messages: {
      avoidMethod: `The import style method is forbidden, such as: import'../../style.scss';`,
      inStyleAvoidStylesName: "Don't use styles to name jsx attributes anymore",
      avoidStyleName: 'Prohibit the use of the styleName attribute',
    },
  },

  create: function (context) {
    return {
      ImportDeclaration: (node) => {
        if (
          node.source.raw.indexOf('scss') > 0 &&
          node.specifiers.length === 0
        ) {
          context.report({
            node,
            messageId: 'avoidMethod',
            data: {},

            fix: function (fixer) {
              let raw = node.source.raw;
              // if (raw.indexOf(".module.scss") >= 0) {
              //   return;
              // }

              // raw = node.source.raw.replace(".scss", ".module.scss");
              // console.log("修复", raw);

              return fixer.replaceText(
                node,
                `import ${defaultStyleIdentityName} from ${raw}`
              );
            },
          });
        }
      },

      JSXAttribute: (node) => {
        if (
          ['style', 'tabBarStyle', 'headStyle', 'bodyStyle'].includes(
            node.name.name
          )
        ) {
          const { value: identifierNode } = node;
          if (identifierNode) {
            /**
             * 替换style
             * 简短 现在看不知道是做什么的
             */
            if (!identifierNode.loc) {
              console.log('no identifierNode', identifierNode);
            } else {
              if (identifierNode.type === 'JSXExpressionContainer') {
                const object = identifierNode.expression.object;

                if (identifierNode.expression.type === 'ObjectExpression') {
                  return;
                }

                if (!object) {
                  console.log('no object', identifierNode.expression);
                  return;
                }

                if (object.name === 'styles') {
                  console.log('替换style', object);
                  context.report({
                    node: object,
                    messageId: 'inStyleAvoidStylesName',
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
              identifier.type === 'Identifier' &&
              identifier.name === 'styles'
            ) {
              if (resolved === null) {
                context.report({
                  node: identifier,
                  messageId: 'inStyleAvoidStylesName',
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
              if (nameNode.parent.type === 'ImportDefaultSpecifier') {
                return;
              }

              if (nameNode) {
                context.report({
                  node: nameNode,
                  messageId: 'inStyleAvoidStylesName',
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

        if (node.name.name === 'styleName') {
          const jsxAttributeValue = node.value;

          let replaceCodeClassNames = '';
          if (jsxAttributeValue.type === 'Literal') {
            replaceCodeClassNames = convertNode(jsxAttributeValue, context);
          }

          if (jsxAttributeValue.type === 'JSXExpressionContainer') {
            const expression = jsxAttributeValue.expression;
            replaceCodeClassNames = convertNode(expression, context);
          }

          const parentNode =
            context.getAncestors()[context.getAncestors().length - 1];
          const { attributes } = parentNode;
          const classNameNode = attributes.find((attribute) => {
            if (
              attribute.type !== 'JSXSpreadAttribute' &&
              attribute &&
              attribute.name === undefined
            ) {
              console.log(attribute);
            }

            return (
              attribute.type !== 'JSXSpreadAttribute' &&
              attribute.name.name === 'className'
            );
          });

          /** 
           * 未处理情况，当函数入参有style的时候
           * 跟原本 defaultStyleIdentityName 有冲突时，需要自己手动改。
           * 
            这里的解决办法是
            1. 在分析的时候，import 对function的variable遍历，如果重名则更换 defaultStyleIdentityName。
            2. jsx的identity会自行更换

            或者直接将函数参数转成 inlineStyle

            例子见 src/components/Display/ZoomableImageV2/index.jsx
           * 
            <i styleName={`ic-flag-${lang}`} />
            转成 
            <i className={` ${style['ic-flag-']} ${style[lang]}`} /> 
            也是问题
            这里对styleName的value 继续分析。
           */
          if (classNameNode) {
            const originText = context.getSourceCode().getText(classNameNode);
            // console.log(`classNameNode`, classNameNode);
            let convertText = '';

            const spaceH = ` + ' ' + `;
            if (originText.slice(-1) === '}') {
              convertText = originText.replace(
                '}',
                spaceH + replaceCodeClassNames + '}'
              );
            }

            if (originText.slice(-1) === `'`) {
              if (classNameNode.value.type === 'Literal') {
                convertText = `className={${classNameNode.value.raw} ${spaceH} ${replaceCodeClassNames}}`;
              } else {
                throw new Error('to be deal');
              }
            }

            context.report({
              node,
              messageId: 'avoidStyleName',
              data: {},
              fix: function (fixer) {
                return [
                  fixer.remove(node),
                  fixer.replaceText(classNameNode, convertText),
                ];
              },
            });
          } else {
            const convertText = 'className={' + replaceCodeClassNames + '}';
            context.report({
              node,
              messageId: 'avoidStyleName',
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
