import path from 'path';
import prettier from 'prettier';
import { LanguageModel } from '../../types/index';

function partial(name: string) {
  return {
    source: path.resolve(__dirname, `${name}.handlebars`),
    partial: name,
  };
}

const tsModel: LanguageModel = {
  templates: [
    {
      source: path.resolve(__dirname, 'package.handlebars'),
      filename: () => 'package.json',
    },
    {
      source: path.resolve(__dirname, 'index.handlebars'),
      filename: () => 'src/index.ts',
    },
    {
      source: path.resolve(__dirname, 'tsconfig.handlebars'),
      filename: () => 'tsconfig.json',
    },
    {
      source: path.resolve(__dirname, 'yarn.handlebars'),
      filename: () => 'yarn.lock',
    },
    partial('schema'),
    partial('type'),
    partial('method'),
  ],
  prepareModel(spec) {
    const { namespace, name } = spec.options;
    spec.options.packageName = namespace ? `${namespace}/${name}` : name;
    spec.options.serviceName = name!.replace(/-client$/, '');
  },
  async prettify(config, filename, input) {
    if (path.extname(filename) === '.ts') {
      const options = await prettier.resolveConfig(config.prettierConfig || '');
      try {
        return prettier.format(input, { ...options, parser: 'typescript' });
      } catch (error) {
        console.error(error);
        return input;
      }
    }
    return input;
  },
};

export default tsModel;
