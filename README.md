# small-openapi-codegen

![main CI](https://github.com/gas-buddy/small-openapi-codegen/actions/workflows/nodejs.yml/badge.svg)

A lightweight OpenAPI client generator that creates fetch-based TypeScript clients for JavaScript environments (both Node.js and browsers including React Native).

## Features

- Generates TypeScript clients from OpenAPI 3.0 specifications
- Supports JSON, form-urlencoded, and multipart/form-data content types
- Strongly typed request and response objects matching your API spec
- Handles path, query, header parameters
- Type-safe file uploads with multipart/form-data
- Simple fetch-based implementation (no heavy dependencies)
- Works in Node.js 18+ and modern browsers

## Installation

```bash
# Global installation
npm install -g @gasbuddy/small-openapi-codegen

# Local installation
npm install --save-dev @gasbuddy/small-openapi-codegen
```

Or with Yarn:

```bash
# Global installation
yarn global add @gasbuddy/small-openapi-codegen

# Local installation
yarn add --dev @gasbuddy/small-openapi-codegen
```

## Usage

### Command Line

The simplest way to use small-openapi-codegen is via the command line:

```bash
small-openapi-codegen <path-to-spec-file> --output <output-directory> [options]
```

#### Command Line Arguments

| Argument | Description |
|----------|-------------|
| `<path-to-spec-file>` | Path to the OpenAPI specification file (required) |
| `--output <dir>` | Directory where generated client code will be saved (required) |
| `--language/--lang/-l <lang>` | Language template to use (default: 'ts') |
| `--name <name>` | Package name for the generated client (default: derived from spec filename) |
| `--className <name>` | Class name for the generated client (default: derived from package name) |
| `--namespace <namespace>` | NPM namespace for the package (e.g. "@myorg") |
| `--snake` | Use snake_case for property names instead of camelCase |
| `--prettierConfig <path>` | Path to a Prettier configuration file to format generated TypeScript code |

### Example

Let's say you have an OpenAPI spec called `pet-store.yaml`:

```bash
# Generate a TypeScript client for the pet-store API
small-openapi-codegen pet-store.yaml --output ./pet-client

# Generate with custom package name and class name
small-openapi-codegen pet-store.yaml --output ./pet-client --name "pet-api" --className "PetStoreClient"

# Generate with npm namespace
small-openapi-codegen pet-store.yaml --output ./pet-client --namespace "@my-org"

# Generate with snake_case property names (instead of camelCase)
small-openapi-codegen pet-store.yaml --output ./pet-client --snake

# Generate with a custom Prettier configuration
small-openapi-codegen pet-store.yaml --output ./pet-client --prettierConfig ./.prettierrc
```

## Generated Client Usage

The generated client can be used like this:

```typescript
// Import the generated client
import { PetStoreClient } from './pet-client';

// Initialize the client with configuration
const client = new PetStoreClient({
  baseUrl: 'https://api.example.com',
  // Required implementation classes
  fetch: globalThis.fetch,
  FormData: globalThis.FormData,
  AbortController: globalThis.AbortController
});

// Use typed methods matching your API spec
async function fetchPets() {
  try {
    // All responses are typed according to your OpenAPI spec
    const response = await client.listPets();
    
    if (response.status === 200) {
      // The response.body is typed as the schema from your spec
      const pets = response.body;
      return pets;
    } else {
      throw new Error(`Error fetching pets: ${response.status}`);
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Working with form data
async function uploadPetPhoto(petId: number, photoFile: Buffer | Blob) {
  const response = await client.uploadPetPhoto({
    body: {
      petId,
      photo: photoFile
    },
    // Optionally provide filename and content type
    options: {
      photo: { 
        filename: 'pet.jpg',
        contentType: 'image/jpeg'
      }
    }
  });
  
  if (response.status === 200) {
    return 'Upload successful';
  } else {
    throw new Error(`Upload failed: ${response.status}`);
  }
}
```

## Development

### Building the project

```bash
# Install dependencies
yarn install

# Build the project
yarn build
```

### Testing

```bash
# Run tests
yarn test

# Generate a test client from the sample spec
yarn build-and-test-client
```