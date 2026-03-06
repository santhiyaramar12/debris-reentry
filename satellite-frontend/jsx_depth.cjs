const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const code = fs.readFileSync('src/components/DecayForecast.jsx', 'utf8');

try {
  let ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
} catch (e) {
  console.log("Syntax Error at line", e.loc.line, "col", e.loc.column);
  console.log(e.message);
  
  // To find WHAT is adjacent, let's use a regex to scan for the return statement structure.
  console.log("Failed to parse.");
}

// But wait, if it fails to parse, we can't use `traverse`!
// Let's just find all JSX start and end tags manually to trace the hierarchy.
let lines = code.split('\n');
let depth = 0;
let struct = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  // Simple check for opening and closing tags, not robust but good enough for a rough idea
  let tags = line.match(/<\/?([A-Za-z0-9]+)[^>]*>/g);
  if (tags) {
     for (let tag of tags) {
       if (tag.startsWith('</')) {
         depth--;
         if (depth === 0) {
           console.log(`Depth reached 0 at line ${i + 1}: ${tag}`);
         }
       } else if (!tag.endsWith('/>')) {
         depth++;
       }
     }
  }
}
