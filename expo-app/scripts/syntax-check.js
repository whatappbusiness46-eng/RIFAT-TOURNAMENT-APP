const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const appPath = path.join(__dirname, '..', 'App.js');
const source = fs.readFileSync(appPath, 'utf8');
const parsed = ts.transpileModule(source, {
  fileName: appPath,
  reportDiagnostics: true,
  compilerOptions: {
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2022,
  },
});
const errors = (parsed.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
if (errors.length) {
  for (const error of errors) {
    console.error(ts.flattenDiagnosticMessageText(error.messageText, '\\n'));
  }
  process.exitCode = 1;
} else {
  console.log('Expo App.js JSX/JavaScript parse: PASS');
}

const assetRefs = [...source.matchAll(/require\(['\"](\.\/assets\/[^'\"]+)['\"]\)/g)]
  .map(match => match[1]);
const missing = assetRefs.filter(ref => !fs.existsSync(path.resolve(path.dirname(appPath), ref)));
if (missing.length) {
  console.error('Missing Expo assets:', missing.join(', '));
  process.exitCode = 1;
} else {
  console.log(`Expo static asset references: PASS (${assetRefs.length} references)`);
}
