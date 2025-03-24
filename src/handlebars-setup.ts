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

    const prop = {
      name,
      ...properties[name],
    };

    // Set the parent-level required status (true/false)
    prop.isRequired = isRequired;

    return prop;
  });
}

function combine(a1: Record<string, any>[], a2: Record<string, any>[]) {
  return [...(a1 || []), ...(a2 || [])];
}

export default function setupHandlebars(options: Record<string, any>) {
  helpers();
  handlebars.registerHelper('properties', (schema: Record<string, any>) => getFriendlyProperties(schema));

  // Flatten the paths/methods into an array of path+method+spec
  handlebars.registerHelper('methods', (paths: Record<string, Record<string, any>>) => _.flatten(
    Object.entries(paths).map(([p, methodsAndParams]) => {
      const { parameters, ...methods } = methodsAndParams;
      return Object.entries(methods).map(([method, spec]) => ({
        path: p,
        method,
        ...spec,
        parameters: combine(spec.parameters, parameters),
      }));
    }),
  ));

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
