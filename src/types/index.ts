import type SwaggerParser from '@apidevtools/swagger-parser';

interface LanguageComponent {
  // The full path to the template
  source: string;
  // Return the output filename
  filename?: () => string;
  // Component is a partial for use in other templates
  partial?: string;
}

export type ApiSpec = Awaited<ReturnType<typeof SwaggerParser['bundle']>> & {
  options: GenerationOptions;
};

export interface LanguageModel {
  templates: LanguageComponent[];
  prepareModel?: (spec: ApiSpec) => void;
  prettify?: (config: Record<string, any>, filename: string, input: string) => Promise<string>;
}

export interface GenerationOptions extends Record<string, any> {
  // Package namespace, like "@gasbuddy"
  namespace?: string;
  // Package name, e.g. "foobar-api"
  name?: string;
  // API class name, e.g. FoobarApi
  className?: string;
}
