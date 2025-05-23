#!/usr/bin/env node
import assert from 'assert';
import fs from 'fs';
import mkdirp from 'mkdirp';
import minimist from 'minimist';
import path from 'path';
import { readSpec, render } from '../index';
import { GenerationOptions } from '../types/index';
import { validateSpec } from '../validation';

const argv = minimist(process.argv.slice(2));
assert(argv._[0], 'Missing path to spec file');

const spec = path.resolve(argv._[0]);
const lang = argv.language || argv.lang || argv.l || 'ts';

async function run() {
  const resolvedLanguage = path.resolve(__dirname, '../templates', lang);
  assert(resolvedLanguage.startsWith(path.resolve(__dirname, '..')), 'Language not supported');
  assert(fs.existsSync(resolvedLanguage), 'Language not found');
  assert(argv.output, 'Missing output path');

  // Validate the OpenAPI spec and check for properties named 'default'
  // (which can cause issues in code generation)
  const validationErrors = await validateSpec(spec);
  if (validationErrors.length > 0) {
    console.error('OpenAPI specification validation failed:');
    validationErrors.forEach((err) => {
      console.error(`- ${err.path}: ${err.message}`);
    });
    process.exit(1);
  }

  const apiSpec = await readSpec(spec, argv as GenerationOptions);

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const languageModel = require(`${resolvedLanguage}/index`).default;
  const outputs = await render(languageModel, apiSpec, argv);

  outputs.forEach(({ filename, output }) => {
    const f = typeof filename === 'function' ? filename() : filename!;
    const fullPath = path.join(argv.output, f as string);
    mkdirp.sync(path.dirname(fullPath));
    fs.writeFileSync(fullPath, output);
  });
}

run();
