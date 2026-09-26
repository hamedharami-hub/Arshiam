import ts from "typescript";

/**
 * Evaluate only data-literal TypeScript syntax. This module is intentionally
 * pure so importing it from tests cannot read a sibling repo or write files.
 */
export function evaluateLiteralAst(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(evaluateLiteralAst);
  }
  if (ts.isObjectLiteralExpression(node)) {
    const obj = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        throw new Error(`Disallowed property type in AST: ${ts.SyntaxKind[prop.kind]}`);
      }
      const propName = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
        ? prop.name.text
        : null;
      if (!propName) {
        throw new Error(`Disallowed property name node: ${ts.SyntaxKind[prop.name.kind]}`);
      }
      if (["__proto__", "constructor", "prototype"].includes(propName)) {
        throw new Error(`Disallowed unsafe object property: ${propName}`);
      }
      obj[propName] = evaluateLiteralAst(prop.initializer);
    }
    return obj;
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
    return -Number(node.operand.text);
  }
  throw new Error(`Disallowed executable or non-literal AST node: ${ts.SyntaxKind[node.kind]}`);
}
