/**
 * @fileoverview convert style name to class name
 * @author chegde
 */
'use strict';
// replace ClassNames with code
function strToClassNames(str, styleIdentityName) {
  const originClassNames = str.split(' ').filter(Boolean);

  const inlineClassNames = originClassNames
    .map((curr) => {
      return `\${${styleIdentityName}['${curr}']}`;
    })
    .join(' ');

  if (originClassNames.length === 1) {
    return `${str[0] === ' ' ? ' ' : ''}${styleIdentityName}[\'${
      originClassNames[0]
    }\']`;
  }

  return '`' + inlineClassNames + '`';
}
exports.strToClassNames = strToClassNames;
