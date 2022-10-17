import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import SwaggerParser from '@apidevtools/swagger-parser';
import { ApiSpec, GenerationOptions, LanguageModel } from './types/index';
import { setupHandlebars } from './handlebars-setup';

export async function readSpec(specPath: string, options: GenerationOptions) {
  const bundled = await SwaggerParser.bundle(specPath);
  const finalOptions = { ...options };
  if (!finalOptions.name) {
    const withExt = path.basename(specPath);
    const noExt = withExt.substring(0, withExt.length - path.extname(withExt).length);
    finalOptions.name = `${noExt}-client`;
  }
  if (!finalOptions.className) {
    finalOptions.className = _.upperFirst(_.camelCase(finalOptions.name)).replace(/\s/g, '');
  }
  return {
    ...bundled,
    options: finalOptions,
  };
}

export async function render(language: LanguageModel, spec: ApiSpec, options: Record<string, any>) {
  setupHandlebars(options);
  if (language.prepareModel) {
    language.prepareModel(spec);
  }
  const templateSpecs = language.templates;
  const compiledTemplates = templateSpecs.map(({ source }) => {
    if (typeof source === 'function') {
      return source;
    }
    return handlebars.compile(fs.readFileSync(source, 'utf8'));
  });

  templateSpecs.forEach(({ partial }, index) => {
    if (partial) {
      handlebars.registerPartial(partial, compiledTemplates[index]);
    }
  });

  const outputs = templateSpecs
    .filter((t) => !t.partial)
    .map(({ filename }, index) => ({
      filename,
      output: compiledTemplates[index](spec),
    }));

  await Promise.all(
    outputs.map(async (e) => {
      const f = typeof e.filename === 'function' ? e.filename() : e.filename!;
      e.output = (await language.prettify?.(options, f as string, e.output)) || e.output;
    }),
  );

  return outputs;
}
