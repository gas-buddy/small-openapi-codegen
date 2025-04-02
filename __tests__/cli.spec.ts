import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';

describe('CLI', () => {
  const outputDir = path.join(__dirname, '../test-cli-output');
  const sampleSpecPath = path.join(__dirname, '../__test_api__/sample-serv.yaml');
  const cliPath = path.join(__dirname, '../build/bin/small-openapi-codegen.js');

  // Clean up test directory before and after tests
  beforeAll(() => {
    // Build the project before tests run
    const buildResult = spawnSync('yarn', ['build'], { encoding: 'utf8' });
    if (buildResult.status !== 0) {
      throw new Error(`Failed to build project: ${buildResult.stderr}`);
    }

    // Ensure output directory is clean
    if (fs.existsSync(outputDir)) {
      rimraf.sync(outputDir);
    }
  });

  afterAll(() => {
    if (fs.existsSync(outputDir)) {
      rimraf.sync(outputDir);
    }
  });

  test('should generate client with default options', () => {
    const result = spawnSync('node', [
      cliPath,
      sampleSpecPath,
      '--output',
      outputDir,
    ], { encoding: 'utf8' });

    // Check that command succeeded
    expect(result.status).toBe(0);

    // Check that files were generated
    expect(fs.existsSync(path.join(outputDir, 'src/index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'tsconfig.json'))).toBe(true);

    // Check content of index.ts
    const indexContent = fs.readFileSync(path.join(outputDir, 'src/index.ts'), 'utf8');
    expect(indexContent).toContain('export class SampleServClient');
  });

  test('should generate client with custom name', () => {
    const customOutputDir = path.join(outputDir, 'custom');

    const result = spawnSync('node', [
      cliPath,
      sampleSpecPath,
      '--output',
      customOutputDir,
      '--name',
      'custom-api',
    ], { encoding: 'utf8' });

    // Check that command succeeded
    expect(result.status).toBe(0);

    // Check content of index.ts for custom class name
    const indexContent = fs.readFileSync(path.join(customOutputDir, 'src/index.ts'), 'utf8');
    expect(indexContent).toContain('export class CustomApi');
  });

  test('should generate client with custom class name', () => {
    const customOutputDir = path.join(outputDir, 'custom-class');

    const result = spawnSync('node', [
      cliPath,
      sampleSpecPath,
      '--output',
      customOutputDir,
      '--className',
      'CustomApiClient',
    ], { encoding: 'utf8' });

    // Check that command succeeded
    expect(result.status).toBe(0);

    // Check content of index.ts for custom class name
    const indexContent = fs.readFileSync(path.join(customOutputDir, 'src/index.ts'), 'utf8');
    expect(indexContent).toContain('export class CustomApiClient');
  });

  test('should generate client with namespace', () => {
    const customOutputDir = path.join(outputDir, 'with-namespace');

    const result = spawnSync('node', [
      cliPath,
      sampleSpecPath,
      '--output',
      customOutputDir,
      '--namespace',
      '@test-org',
    ], { encoding: 'utf8' });

    // Check that command succeeded
    expect(result.status).toBe(0);

    // Check package.json for namespace
    const packageJson = JSON.parse(fs.readFileSync(path.join(customOutputDir, 'package.json'), 'utf8'));
    expect(packageJson.name).toContain('@test-org/');
  });

  test('should generate client with explicit language option', () => {
    const customOutputDir = path.join(outputDir, 'explicit-lang');

    const result = spawnSync('node', [
      cliPath,
      sampleSpecPath,
      '--output',
      customOutputDir,
      '--language',
      'ts',
    ], { encoding: 'utf8' });

    // Check that command succeeded
    expect(result.status).toBe(0);

    // Verify TypeScript files were generated
    expect(fs.existsSync(path.join(customOutputDir, 'src/index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(customOutputDir, 'tsconfig.json'))).toBe(true);
  });

  test('should generate client with short language flag', () => {
    const customOutputDir = path.join(outputDir, 'short-lang');

    const result = spawnSync('node', [
      cliPath,
      sampleSpecPath,
      '--output',
      customOutputDir,
      '-l',
      'ts',
    ], { encoding: 'utf8' });

    // Check that command succeeded
    expect(result.status).toBe(0);

    // Verify TypeScript files were generated
    expect(fs.existsSync(path.join(customOutputDir, 'src/index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(customOutputDir, 'tsconfig.json'))).toBe(true);
  });

  test('should fail if output path is missing', () => {
    const result = spawnSync('node', [
      cliPath,
      sampleSpecPath,
    ], { encoding: 'utf8' });

    // Check that command failed
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing output path');
  });

  test('should fail if spec path is missing', () => {
    const result = spawnSync('node', [
      cliPath,
      '--output',
      outputDir,
    ], { encoding: 'utf8' });

    // Check that command failed
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing path to spec file');
  });

  test('should fail if language is not supported', () => {
    const result = spawnSync('node', [
      cliPath,
      sampleSpecPath,
      '--output',
      outputDir,
      '--lang',
      '../../../etc/passwd', // Path traversal attempt
    ], { encoding: 'utf8' });

    // Check that command failed with security error
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Language not supported');
  });
});
