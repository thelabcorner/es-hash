import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import ts from 'typescript';

var BITWISE = new Set([
  ts.SyntaxKind.AmpersandToken,
  ts.SyntaxKind.BarToken,
  ts.SyntaxKind.CaretToken,
  ts.SyntaxKind.LessThanLessThanToken,
  ts.SyntaxKind.GreaterThanGreaterThanToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken
]);

function countBitwiseChain(node) {
  var count = 0;
  if (ts.isBinaryExpression(node)) {
    if (BITWISE.has(node.operatorToken.kind)) {
      count++;
    }
    count += countBitwiseChain(node.left);
    count += countBitwiseChain(node.right);
    return count;
  }
  if (ts.isParenthesizedExpression(node)) {
    return countBitwiseChain(node.expression);
  }
  if (ts.isPrefixUnaryExpression(node)) {
    if (node.operator === ts.SyntaxKind.TildeToken) {
      count++;
    }
    return count + countBitwiseChain(node.operand);
  }
  return 0;
}

function auditBitwiseChains(sourceText, filename) {
  var source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.ES5, true, ts.ScriptKind.JS);
  var problems = [];
  if (source.parseDiagnostics.length > 0) {
    for (var p = 0; p < source.parseDiagnostics.length; p++) {
      var diagnostic = source.parseDiagnostics[p];
      problems.push('parse error: ' + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
    return problems;
  }

  function visit(node) {
    if (ts.isBinaryExpression(node) && countBitwiseChain(node) > 1) {
      var start = node.getStart(source);
      var line = source.getLineAndCharacterOfPosition(start).line + 1;
      problems.push('mixed bitwise/shift expression at line ' + line + ': ' + node.getText(source));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return problems;
}

var unsafe = auditBitwiseChains('var x = (a << 24) | (b << 16);', 'unsafe-fixture.js');
assert.equal(unsafe.length, 1, 'audit rejects mixed shifts and OR in one expression');
var safe = auditBitwiseChains('var a1 = a << 24; var b1 = b << 16; var x = a1 | b1;', 'safe-fixture.js');
assert.equal(safe.length, 0, 'audit accepts staged bitwise temporaries');

var artifactPath = new URL('../dist/ESHASH.jsx', import.meta.url);
var artifact = readFileSync(artifactPath, 'utf8');
var artifactProblems = auditBitwiseChains(artifact, 'dist/ESHASH.jsx');
assert.deepEqual(artifactProblems, [], 'generated ESHASH.jsx has no mixed bitwise/shift expressions');
console.log('[artifact-contract] safe ES3 parse and no mixed bitwise/shift expression; ' + statSync(artifactPath).size + ' bytes');
