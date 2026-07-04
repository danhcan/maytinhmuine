const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');
let lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Starting tunnelmole on port')) {
    lines[i] = '      console.log(`Starting tunnelmole on port ${PORT}...`);';
    console.log('Fixed line', i+1);
  }
}
fs.writeFileSync('server.ts', lines.join('\n'), 'utf8');
console.log('Done');
