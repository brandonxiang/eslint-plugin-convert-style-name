/**
 * @fileoverview convert style name to class name
 * @author chegde
 */
'use strict';
const { strToClassNames } = require('./strToClassNames');
const { defaultStyleIdentityName } = require('./const');

function convertNode(node, context) {
  const moduleScope = context.getScope()?.upper;
  let styleIdentityName = defaultStyleIdentityName;
  if (moduleScope.type === 'module') {
    const moduleVariables = context.getScope()?.upper?.variables;

    const scssImport = moduleVariables.find((i) => {
      const def = i.defs.find((aa) =>
        aa?.parent?.source?.value?.includes('.scss')
      );

      return def;
    });

    if (scssImport?.name) {
      styleIdentityName = scssImport.name;
    }
    /**
     * 如果已经定义了有的话，就使用已经定义的的import
     * 如果没有定义，则自己生成。
     * */
  }

  if (!styleIdentityName) {
    console.log(` not found styleIdentityName `);
    return '';
  }

  console.log(`styleIdentityName`, styleIdentityName);

  if (node.type === 'Literal') {
    return strToClassNames(node.value, styleIdentityName);
  }

  if (node.type === 'Identifier' && node.name === 'undefined') {
    return "' '";
  }

  if (node.type === 'TemplateElement') {
    if (node.value.raw !== '') {
      return '${' + strToClassNames(node.value.raw, styleIdentityName) + '}';
    }

    return node.value.raw ?? "' '";
  }

  if (node.type === 'ConditionalExpression') {
    const { consequent, alternate, test } = node;

    const testCode = context.getSourceCode().getText(test);
    const consequentCode = convertNode(consequent, context);
    const alternateCode = convertNode(alternate, context);

    console.log(
      '三元转换至',
      `${testCode} ? ${consequentCode} : ${alternateCode}`
    );

    return `${testCode} ? ${consequentCode} : ${alternateCode}`;
  }

  if (
    node.type === 'CallExpression' ||
    node.type === 'MemberExpression' ||
    node.type === 'Identifier'
  ) {
    return `${styleIdentityName}[${context.getSourceCode().getText(node)}]`;
  }

  if (node.type === 'TemplateLiteral') {
    // console.log(
    //   'TemplateLiteral',
    //   node,
    //   context.getSourceCode().getText(node),
    //   `${styleIdentityName}[${context.getSourceCode().getText(node)}]`
    // );
    const { expressions, quasis } = node;

    let result = '` ';
    for (let queryIndex = 0; queryIndex < quasis.length - 1; queryIndex++) {
      const query = quasis[queryIndex];
      const expression = expressions[queryIndex];
      result +=
        convertNode(query, context) +
        ' ${' +
        convertNode(expression, context) +
        '}';
    }
    result += convertNode(quasis[quasis.length - 1], context) + '`';

    console.log(`convert result:`, result);
    return result;
  }

  if (node.type === 'LogicalExpression') {
    return ` ${convertNode(node.left, context)} || ${convertNode(
      node.right,
      context
    )}`;
  }

  console.log(node);
  throw new Error('type isnt supported.');
}
exports.convertNode = convertNode;
