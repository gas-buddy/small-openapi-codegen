import { OpenAPIV3 } from 'openapi-types';
import path from 'path';
import { readSpec, render } from '../src';
import { LanguageModel } from '../src/types/index';

// Create a mock TS model for testing to avoid Prettier issues
const mockTsModel: LanguageModel = {
  templates: [
    {
      source: path.resolve(__dirname, '../src/templates/ts/package.handlebars'),
      filename: () => 'package.json',
    },
    {
      source: path.resolve(__dirname, '../src/templates/ts/index.handlebars'),
      filename: () => 'src/index.ts',
    },
    {
      source: path.resolve(__dirname, '../src/templates/ts/tsconfig.handlebars'),
      filename: () => 'tsconfig.json',
    },
    {
      source: path.resolve(__dirname, '../src/templates/ts/schema.handlebars'),
      partial: 'schema',
    },
    {
      source: path.resolve(__dirname, '../src/templates/ts/type.handlebars'),
      partial: 'type',
    },
    {
      source: path.resolve(__dirname, '../src/templates/ts/method.handlebars'),
      partial: 'method',
    },
  ],
  prepareModel(spec) {
    const { namespace, name } = spec.options;
    // Create new options object to avoid modification of parameters
    const options = { ...spec.options };
    options.packageName = namespace ? `${namespace}/${name}` : name;
    options.serviceName = name!.replace(/-client$/, '');
    // Assign back to spec.options
    Object.assign(spec.options, options);
  },
};

describe('small-openapi-codegen', () => {
  const sampleSpecPath = path.join(__dirname, '../__test_api__/sample-serv.yaml');

  describe('readSpec', () => {
    test('returns a valid spec object', async () => {
      const result = await readSpec(sampleSpecPath, {});

      // Cast result to OpenAPIV3 document to access properties
      const spec = result as unknown as OpenAPIV3.Document & { options: any };

      // Should have basic OpenAPI properties
      expect(spec.openapi).toBe('3.0.1');
      expect(spec.info.title).toBe('Sample API');
      expect(spec.info.version).toBe('1.0.0');

      // Should have correct paths
      expect(spec.paths).toBeDefined();
      expect(spec.paths['/pets']).toBeDefined();
      expect(spec.paths['/pets/{pet_id}']).toBeDefined();

      // Should have correct components
      expect(spec.components).toBeDefined();
      expect(spec.components?.schemas?.Pet).toBeDefined();
      expect(spec.components?.schemas?.Address).toBeDefined();
    });

    test('rejects when spec file does not exist', async () => {
      // Test with a non-existent file
      await expect(
        readSpec('/path/to/nonexistent/file.yaml', {}),
      ).rejects.toThrow();
    });

    test('uses specified client name when provided', async () => {
      const result = await readSpec(sampleSpecPath, { name: 'custom-client' });
      expect(result.options.name).toBe('custom-client');
    });

    test('generates default client name when not provided', async () => {
      const result = await readSpec(sampleSpecPath, {});
      expect(result.options.name).toBe('sample-serv-client');
    });

    test('uses specified class name when provided', async () => {
      const result = await readSpec(sampleSpecPath, { className: 'CustomApi' });
      expect(result.options.className).toBe('CustomApi');
    });

    test('generates default class name when not provided', async () => {
      const result = await readSpec(sampleSpecPath, {});
      expect(result.options.className).toBe('SampleServClient');
    });
  });

  describe('render', () => {
    test('generates correct TypeScript files', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      // Should generate expected files
      const filenames = outputs.map((output) => (typeof output.filename === 'function' ? output.filename() : output.filename));
      expect(filenames).toContain('src/index.ts');
      expect(filenames).toContain('package.json');
      expect(filenames).toContain('tsconfig.json');

      // Should contain generated client code
      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');
      expect(indexOutput).toBeDefined();
      expect(indexOutput!.output).toContain('export class SampleServClient');

      // Should contain expected API methods
      expect(indexOutput!.output).toContain('listPets(');
      expect(indexOutput!.output).toContain('createPet(');
      expect(indexOutput!.output).toContain('showPetById(');
      expect(indexOutput!.output).toContain('updatePet(');
      expect(indexOutput!.output).toContain('deletePet(');
    });

    test('handles required and optional parameters correctly', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');

      // Required parameters should not have a question mark
      expect(indexOutput!.output).toContain('id: number;');
      expect(indexOutput!.output).toContain('name: string;');

      // Optional parameters should have a question mark
      expect(indexOutput!.output).toContain('species?: string;');
      expect(indexOutput!.output).toContain('weight?: number;');
    });
  });

  describe('API content type handling', () => {
    test('generates correct form-urlencoded method', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');

      // Should contain form-urlencoded handling
      expect(indexOutput!.output).toContain('updatePetWithForm(');
      expect(indexOutput!.output).toContain('.formUrlEncoded(');
    });

    test('generates correct multipart/form-data method for single file', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');

      // Should contain form-data handling
      expect(indexOutput!.output).toContain('uploadPetPhoto(');
      expect(indexOutput!.output).toContain('photo: Buffer | string;');
      expect(indexOutput!.output).toContain('.formData(');
    });

    test('generates correct multipart/form-data method for multiple files', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');

      // Should contain form-data handling for arrays
      expect(indexOutput!.output).toContain('uploadPetPhotos(');
      expect(indexOutput!.output).toContain('photos: Array<Buffer | string>;');
    });

    test('handles schema references in form-urlencoded requests', async () => {
      const spec = await readSpec(sampleSpecPath, { snake: true });
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find(
        (output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts',
      );

      // Check for formUrlEncoded with reference
      expect(indexOutput!.output).toContain('updatePetWithFormRef');
      expect(indexOutput!.output).toContain('export interface PetFormData');
      expect(indexOutput!.output).toContain('formUrlEncoded');
    });

    test('handles schema references in multipart/form-data requests', async () => {
      const spec = await readSpec(sampleSpecPath, { snake: true });
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find(
        (output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts',
      );

      // Check for multipart/form-data with reference
      expect(indexOutput!.output).toContain('uploadPetPhotoWithDoc');
      expect(indexOutput!.output).toContain('export interface PetPhotoUpload');
      expect(indexOutput!.output).toContain('formData');
    });
  });

  describe('Response types', () => {
    test('generates correct response types for successful responses', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');

      // Should contain correct response types
      expect(indexOutput!.output).toContain('RestApiResponse<200, Array<Pet>>');
      expect(indexOutput!.output).toContain('RestApiResponse<201, Pet>');
      expect(indexOutput!.output).toContain('RestApiResponse<204, void>');
    });

    test('generates correct response types for error responses', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');

      // Should contain error response types
      expect(indexOutput!.output).toContain('RestApiResponse<400, void>');
      expect(indexOutput!.output).toContain('RestApiResponse<404, void>');
      expect(indexOutput!.output).toContain('RestApiErrorResponse<Exclude<ValidHTTPResponseCodes');
    });
  });

  describe('Schema generation', () => {
    test('generates correct types for schemas', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');

      // Should generate Pet interface
      expect(indexOutput!.output).toContain('export interface Pet');
      expect(indexOutput!.output).toContain('id: number');
      expect(indexOutput!.output).toContain('name: string');
      expect(indexOutput!.output).toContain('details:');

      // Should generate Address interface
      expect(indexOutput!.output).toContain('export interface Address');
      expect(indexOutput!.output).toContain('street: string');
      expect(indexOutput!.output).toContain('city: string');
    });

    test('handles nested objects correctly', async () => {
      const spec = await readSpec(sampleSpecPath, {});
      const outputs = await render(mockTsModel, spec, {});

      const indexOutput = outputs.find((output) => (typeof output.filename === 'function' ? output.filename() : output.filename) === 'src/index.ts');

      // Should handle nested objects
      expect(indexOutput!.output).toContain('owner?:');
      expect(indexOutput!.output).toContain('address?:');
    });
  });
});
