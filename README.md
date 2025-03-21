small-openapi-codegen
===============

![main CI](https://github.com/gas-buddy/small-openapi-codegen/actions/workflows/nodejs.yml/badge.svg)

[![npm version](https://badge.fury.io/js/@gasbuddy%2Fsmall-openapi-codegen.svg)](https://badge.fury.io/js/@gasbuddy%2Fsmall-openapi-codegen)

Parse an OpenAPI spec and generate fetch-based clients for Javascript environments (React Native and Node)

## Usage

### Command Line Arguments

```bash
small-openapi-codegen <path-to-spec-file> --output <output-directory> [--language <lang>]
```

- `<path-to-spec-file>`: Path to the OpenAPI specification file (required)
- `--output`: Directory where generated client code will be saved (required)
- `--language/--lang/-l`: Language template to use (default: 'ts')

### Generate a test client

To generate a test client from a sample OpenAPI spec:

```bash
# Build the project and generate client from sample spec
yarn build-and-test-client
```
