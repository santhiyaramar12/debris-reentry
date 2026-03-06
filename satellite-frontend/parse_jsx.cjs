const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('src/components/DecayForecast.jsx', 'utf8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("No syntax errors found.");
} catch (e) {
  console.log("Syntax Error at line", e.loc.line, "col", e.loc.column);
  console.log(e.message);

  // Let's print the few lines around the error
  const lines = code.split('\n');
  const start = Math.max(0, e.loc.line - 10);
  const end = Math.min(lines.length - 1, e.loc.line + 10);
  for (let i = start; i <= end; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
