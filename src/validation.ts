import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3 } from 'openapi-types';

// Type guards for OpenAPI structures
function isReferenceObject(obj: any): obj is OpenAPIV3.ReferenceObject {
  return obj && typeof obj === 'object' && '$ref' in obj;
}

function isSchemaObject(obj: any): obj is OpenAPIV3.SchemaObject {
  return obj && typeof obj === 'object' && !isReferenceObject(obj);
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Find properties with the name 'default' in OpenAPI schemas
 * This detects any property whose key is literally named 'default', which can cause
 * issues with code generation in some languages
 */
function findDefaultProperties(spec: any): ValidationError[] {
  const errors: ValidationError[] = [];
  const schemas = spec.components?.schemas || {};

  // Helper function to inspect nested properties
  function inspectProperties(properties: Record<string, any>, path: string) {
    if (!properties) return;

    // Check for property whose key is any case variant of 'default'
    const propertyKeys = Object.keys(properties);
    const defaultProperty = propertyKeys.find((key) => key.toLowerCase() === 'default');
    if (defaultProperty) {
      errors.push({
        path: `${path}.${defaultProperty}`,
        message: `Property with key name '${defaultProperty}' found. Properties named 'default' (any case) can cause issues in generated code.`,
        severity: 'error',
      });
    }

    // Recursively check all properties for their nested properties
    Object.entries(properties).forEach(([propName, propDef]) => {
      // Skip reference objects
      if (isReferenceObject(propDef)) {
        return;
      }

      // Convert to schema object for proper type handling
      const schemaProp = propDef as OpenAPIV3.SchemaObject;

      // If property has properties (object type), check those
      if (schemaProp.properties) {
        inspectProperties(schemaProp.properties, `${path}.${propName}.properties`);
      }

      // If property has type array and items that have properties, check those
      if (schemaProp.type === 'array' && 'items' in schemaProp) {
        // Items could be a reference or schema object
        // Cast using any to handle the type issue
        const arraySchema = schemaProp as any;
        const itemSchema = arraySchema.items as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

        if (isSchemaObject(itemSchema)) {
          // Check normal properties
          if (itemSchema.properties) {
            inspectProperties(itemSchema.properties, `${path}.${propName}.items.properties`);
          }

          // Check for oneOf, anyOf, allOf in array items
          ['allOf', 'anyOf', 'oneOf'].forEach((combiner) => {
            const schema = itemSchema as any;
            if (combiner in schema && Array.isArray(schema[combiner])) {
              const schemaArr = schema[combiner];
              schemaArr.forEach((subSchema: any, index: number) => {
                if (isSchemaObject(subSchema) && subSchema.properties) {
                  inspectProperties(
                    subSchema.properties,
                    `${path}.${propName}.items.${combiner}[${index}].properties`,
                  );
                }
              });
            }
          });
        }
      }

      // If property has allOf, anyOf, oneOf, check each schema
      ['allOf', 'anyOf', 'oneOf'].forEach((combiner) => {
        // We need to use 'any' due to TypeScript's limitation with discriminated unions
        const schema = schemaProp as any;
        if (combiner in schema && Array.isArray(schema[combiner])) {
          const schemaArr = schema[combiner];
          schemaArr.forEach((subSchema: any, index: number) => {
            if (isSchemaObject(subSchema) && subSchema.properties) {
              inspectProperties(
                subSchema.properties,
                `${path}.${propName}.${combiner}[${index}].properties`,
              );
            }
          });
        }
      });
    });
  }

  // Inspect each schema
  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // Skip reference objects
    if (isReferenceObject(schema)) {
      return;
    }

    const schemaObj = schema as OpenAPIV3.SchemaObject;
    if (schemaObj.properties) {
      inspectProperties(
        schemaObj.properties,
        `components.schemas.${schemaName}.properties`,
      );
    }
  });

  // Also check for properties in request bodies, parameters, etc.
  if (spec.paths) {
    Object.entries(spec.paths).forEach(([pathName, pathItem]) => {
      // Skip non-object entries
      if (!pathItem || typeof pathItem !== 'object') return;

      const typedPathItem = pathItem as OpenAPIV3.PathItemObject;
      const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      httpMethods.forEach((method) => {
        const methodKey = method as keyof OpenAPIV3.PathItemObject;
        const operation = typedPathItem[methodKey] as OpenAPIV3.OperationObject | undefined;
        if (!operation) return;

        // Check request body schemas
        if (operation.requestBody) {
          // Handle both reference and request body objects
          const { requestBody } = operation;

          if (!isReferenceObject(requestBody) && requestBody.content) {
            Object.entries(requestBody.content).forEach(([mediaType, content]) => {
              if (content.schema) {
                // Schema could be reference or schema object
                if (isSchemaObject(content.schema) && content.schema.properties) {
                  inspectProperties(
                    content.schema.properties,
                    `paths.${pathName}.${method}.requestBody.content.${mediaType}.schema.properties`,
                  );
                }
              }
            });
          }
        }

        // Check response schemas
        if (operation.responses) {
          Object.entries(operation.responses).forEach(([statusCode, response]) => {
            // Response could be reference or response object
            if (!isReferenceObject(response) && response.content) {
              Object.entries(response.content).forEach(([mediaType, content]) => {
                if (content.schema) {
                  // Schema could be reference or schema object
                  if (isSchemaObject(content.schema) && content.schema.properties) {
                    inspectProperties(
                      content.schema.properties,
                      `paths.${pathName}.${method}.responses.${statusCode}.content.${mediaType}.schema.properties`,
                    );
                  }
                }
              });
            }
          });
        }
      });
    });
  }

  return errors;
}

/**
 * Validate OpenAPI specification and check for properties with the key name 'default'
 * This performs two checks:
 * 1. Validates the OpenAPI spec against the standard specification
 * 2. Checks for property names that are literally 'default',
 *    which can cause issues in generated code
 */
export async function validateSpec(specPath: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  try {
    // Using the SwaggerParser class from @apidevtools/swagger-parser
    const parser = new SwaggerParser();

    // Validate the OpenAPI spec format
    await parser.validate(specPath);

    // If validation passed, now parse the spec to check for 'default' properties
    const bundled = await parser.bundle(specPath);
    const defaultErrors = findDefaultProperties(bundled);
    errors.push(...defaultErrors);
  } catch (error: any) {
    errors.push({
      path: error.path || 'spec',
      message: error.message,
      severity: 'error',
    });
  }

  return errors;
}
