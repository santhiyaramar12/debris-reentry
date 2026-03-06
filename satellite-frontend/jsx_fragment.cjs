const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('src/components/DecayForecast.jsx', 'utf8');

// Find the start of the return statement
const returnIndex = code.indexOf('return (');
if (returnIndex === -1) {
  console.log("Could not find return match");
  process.exit(1);
}

// Find the end by looking for export default
const exportIndex = code.lastIndexOf('export default');
const returnStr = code.substring(returnIndex + 8, exportIndex - 5);

let fragment = `<>\n${returnStr}\n</>`;

try {
  let ast = parser.parseExpression(fragment, { plugins: ['jsx'] });
  let children = ast.children.filter(c => c.type === 'JSXElement');
  console.log("Number of children:", children.length);
  if (children.length > 1) {
    console.log("Found multiple children in fragment (which means outer div closed early):");
    children.forEach((c, i) => {
      console.log(`Child ${i} starts at line ${c.loc.start.line} and ends at ${c.loc.end.line}`);
      console.log("Tag:", c.openingElement.name.name);
    });
  } else {
    console.log("Only 1 child! The outer tag covers everything. So why does it fail?");
  }
} catch(e) {
  console.log("Error parsing fragment:");
  console.log(e.message);
  console.log("Line:", e.loc.line, "Col:", e.loc.column);
}
