#!/usr/bin/env node
import { plugin } from './listing.mjs';
import fs from 'fs';
import { mystParse } from 'myst-parser';
import yaml from 'js-yaml';
import { Command } from 'commander';

const program = new Command();
program
  .name('simulate-listing')
  .description('Simulate a MyST plugin directive on a markdown file and output the result.')
  .requiredOption('-f, --file <filePath>', 'Path to the markdown file')
  .requiredOption('-d, --directive <directive>', 'Name of the directive to use', 'listing')
  .option('-i, --id <id>', 'ID of the directive to use')
  .allowUnknownOption(true)
  .allowExcessArguments()
  .helpOption('-h, --help', 'Display help for command')
  .showHelpAfterError()
  .addHelpText('after', '\nExample usage:\n  $ node simulate-listing.mjs -f blog.md --directive listing --type rss --baseUrl https://example.com --id bottom');

program.parse(process.argv);

const optionsFromCli = program.opts();
const filePath = optionsFromCli.file;

// Parse unknown options as directive options (e.g., --foo bar or --foo=bar)
function parseUnknownOptions(argv) {
  const options = {};
  let lastKey = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const value = arg.slice(eqIdx + 1);
        options[key] = value;
      } else {
        lastKey = arg.slice(2);
        // If next arg is not another --key, treat as value
        if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
          options[lastKey] = argv[i + 1];
          i++; // skip next arg
        } else {
          options[lastKey] = true;
        }
      }
    }
  }
  return options;
}

// Only pass unknown options (not those handled by commander)
const knownFlags = ['-f', '--file', '-d', '--directive', '-i', '--id', '-h', '--help'];
const knownFlagIndexes = [];
process.argv.forEach((arg, idx) => {
  if (knownFlags.includes(arg)) {
    knownFlagIndexes.push(idx);
    // Also mark the next arg as known if it's a value (not a flag)
    if (process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
      knownFlagIndexes.push(idx + 1);
    }
  }
});
const unknownArgv = process.argv.filter((_, idx) => !knownFlagIndexes.includes(idx));
const unknownOptions = parseUnknownOptions(unknownArgv);

// Accept command-line overrides for the 'id' and 'directive' options
let overrideId = optionsFromCli.id || null;
const directiveName = optionsFromCli.directive || 'listing';

// Read the file content
const fileContent = fs.readFileSync(filePath, 'utf8');

// Parse the file content into an AST
const ast = mystParse(fileContent);

// Find the directive node by id if provided, otherwise the first one
function findDirectiveById(node, name, id) {
  if (node.type === 'mystDirective' && node.name === name) {
    if (id) {
      let nodeId = null;
      if (node.value) {
        const opts = parseColonOptions(node.value);
        nodeId = opts.id;
      }
      if ((node.argument && node.argument === id) || nodeId === id) {
        return node;
      }
    } else {
      return node;
    }
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findDirectiveById(child, name, id);
      if (found) return found;
    }
  }
  return null;
}

// Convert dash-separated strings to camelCase
function dashToCamel(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// Parse colon-prefixed directive options (e.g., :key: value) into an object
function parseColonOptions(str) {
  const options = {};
  str.split('\n').forEach(line => {
    const match = line.match(/^:([^:]+):\s*(.*)$/);
    if (match) {
      let key = match[1].trim();
      key = dashToCamel(key); // Convert to camelCase
      let value = match[2].trim();
      // Convert 'true'/'false' to booleans, numbers to numbers
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && value !== '') value = Number(value);
      options[key] = value;
    }
  });
  return options;
}

const directiveNode = findDirectiveById(ast, directiveName, overrideId);
if (!directiveNode) {
  console.error(`No {${directiveName}} directive found in the file.`);
  process.exit(1);
}

let options = {};
if (directiveNode.value) {
  options = parseColonOptions(directiveNode.value);
}
// Merge CLI unknown options (CLI takes precedence)
options = { ...options, ...unknownOptions };

const data = {
  options,
  file: {
    path: filePath
  }
};

const pluginDirective = plugin.directives.find(d => d.name === directiveName);
if (!pluginDirective) {
  console.error(`Directive '${directiveName}' not found in plugin.`);
  process.exit(1);
}

const resultAst = pluginDirective.run(data);
if (typeof resultAst === 'string') {
  console.log(resultAst);
} else {
  console.log(JSON.stringify(resultAst, null, 2));
}