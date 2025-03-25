import _ from 'lodash';
import handlebars from 'handlebars';
import helpers from 'handlebars-helpers';

function getFriendlyProperties(schema: Record<string, any>) {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return [];
  }
  const { properties } = schema;

  return Object.keys(properties).map((name) => {
    // Default to optional (false) unless explicitly found in the required array
    let isRequired = false;

    // Only consider required if schema.required is an array and contains this property name
    if (Array.isArray(schema.required)) {
      isRequired = schema.required.includes(name);
    }

    const property = properties[name];
    const prop = {
      name,
      ...property,
      isBinary: property.format === 'binary',
    };

    // Set the parent-level required status (true/false)
    prop.isRequired = isRequired;

    return prop;
  });
}

function combine(a1: Record<string, any>[], a2: Record<string, any>[]) {
  return [...(a1 || []), ...(a2 || [])];
}

function getBasePath(spec: Record<string, any>): string {
  if (spec?.servers && spec.servers.length > 0) {
    const serverUrl = spec.servers[0].url;
    // If the URL is a full URL with protocol, extract just the path
    if (serverUrl.startsWith('http')) {
      try {
        const url = new URL(serverUrl);
        return url.pathname || '';
      } catch (e) {
        return serverUrl;
      }
    }
    // If it's just a path (e.g., "/v1"), return it directly
    return serverUrl;
  }
  return '';
}

export default function setupHandlebars(options: Record<string, any>) {
  helpers();
  handlebars.registerHelper('properties', (schema: Record<string, any>) => getFriendlyProperties(schema));

  // Flatten the paths/methods into an array of path+method+spec
  handlebars.registerHelper('methods', function methodsHelper(this: any, paths: Record<string, Record<string, any>>) {
    // Get the base path from the Handlebars context (this)
    const basePath = getBasePath(this);

    return _.flatten(
      Object.entries(paths).map(([p, methodsAndParams]) => {
        const { parameters, ...methods } = methodsAndParams;
        return Object.entries(methods).map(([method, spec]) => {
          // Combine the basePath with the operation path - avoid double slashes
          const fullPath = basePath ? `${basePath.replace(/\/$/, '')}${p}` : p;

          return {
            path: fullPath,
            method,
            ...spec,
            parameters: combine(spec.parameters, parameters),
          };
        });
      }),
    );
  });

  // Get the method name for a spec
  handlebars.registerHelper('methodName', (spec: Record<string, any>) => {
    const { operationId } = spec;
    if (operationId) {
      return operationId;
    }
    const { method, path } = spec;
    return `${method}_${path.substring(1)}/{id}/bar`.replace(/[{}]/g, '').replace(/\//g, '_');
  });

  handlebars.registerHelper('js', (name: string) => {
    if (options.snake) {
      return _.snakeCase(name);
    }
    return _.camelCase(name);
  });

  handlebars.registerHelper(
    'json',
    (spec: Record<string, Record<string, any>>) => spec?.content?.['application/json'],
  );

  handlebars.registerHelper(
    'isMultipartFormData',
    (spec: Record<string, Record<string, any>>) => !!spec?.content?.['multipart/form-data'],
  );

  handlebars.registerHelper(
    'getMultipartFormDataProperties',
    (spec: Record<string, Record<string, any>>) => {
      const multipartSchema = spec?.content?.['multipart/form-data']?.schema;
      if (multipartSchema?.type === 'object' && multipartSchema.properties) {
        return getFriendlyProperties(multipartSchema);
      }
      return [];
    },
  );

  handlebars.registerHelper('statusCodes', (obj: Record<string, any>) => Object.keys(obj).filter((k) => k !== 'default'));

  handlebars.registerHelper('hasDefault', (obj: Record<string, any>) => !!obj.default);
}
