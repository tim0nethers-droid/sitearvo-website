import fs from 'node:fs';
import path from 'node:path';
import PHPParser from 'php-parser';

const parser = new PHPParser.Engine({ parser: { extractDoc: true, suppressErrors: false }, ast: { withPositions: true } });
const root = path.resolve('public/api');
const files = [];
const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.php')) files.push(target);
  }
};
walk(root);
for (const file of files) parser.parseCode(fs.readFileSync(file, 'utf8'), file);
process.stdout.write(`Parsed ${files.length} PHP files successfully.\n`);

