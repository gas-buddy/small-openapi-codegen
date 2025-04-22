import path from 'path';
import { validateSpec, ValidationError } from '../src/validation';

describe('Specification validation', () => {
  const validSpecPath = path.resolve(__dirname, '../__test_api__/sample-serv.yaml');
  const invalidSchemaPath = path.resolve(__dirname, '../__test_api__/invalid-schema.yaml');
  const testCasesPath = path.resolve(__dirname, '../__test_api__/validation-test-cases.yaml');

  test('Valid specification passes validation', async () => {
    const validationErrors = await validateSpec(validSpecPath);
    expect(validationErrors).toHaveLength(0);
  });

  test('Detects invalid OpenAPI schema', async () => {
    const validationErrors = await validateSpec(invalidSchemaPath);

    expect(validationErrors.length).toBeGreaterThan(0);
    expect(validationErrors[0].severity).toBe('error');
  });

  describe('Detects default properties in various locations', () => {
    let validationErrors: ValidationError[] = [];

    beforeAll(async () => {
      validationErrors = await validateSpec(testCasesPath);
    });

    test('finds correct number of default properties', () => {
      const defaultErrors = validationErrors.filter((err: ValidationError) => err.message.includes("Properties named 'default'"));
      expect(defaultErrors.length).toBe(10);
    });

    test('detects default property in request body', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('paths./orders.post.requestBody.content.application/json.schema.properties.default'))).toBe(true);
    });

    test('detects default property in nested array items', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('items.properties.default'))).toBe(true);
    });

    test('detects default property in form data', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('paths./form-data.post.requestBody.content.application/x-www-form-urlencoded.schema.properties.default'))).toBe(true);
    });

    test('detects default property in deeply nested object', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('level1.properties.level2.properties.default'))).toBe(true);
    });

    test('detects default property in response schema', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('paths./response-with-default.get.responses.200.content.application/json.schema.properties.default'))).toBe(true);
    });

    test('detects default property in oneOf schema', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('items.oneOf') && err.path.includes('default'))).toBe(true);
    });

    test('detects default property in allOf schema', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('allOf') && err.path.includes('default'))).toBe(true);
    });

    test('detects default property in anyOf schema', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('anyOf') && err.path.includes('default'))).toBe(true);
    });

    test('detects case-insensitive variants of default property', () => {
      expect(validationErrors.some((err: ValidationError) => err.path.includes('CaseSensitiveTest.properties.DEFAULT'))).toBe(true);
    });
  });
});
