import type { CodegenConfig } from '@graphql-codegen/cli';

// Introspects the live OMS backend (debug_no_access_control is on, so no auth
// header needed) and generates a typed graphql-request SDK from our .graphql docs.
const config: CodegenConfig = {
  overwrite: true,
  schema: 'http://localhost:8000/graphql',
  documents: ['src/**/*.graphql'],
  generates: {
    'src/gql/generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
      config: {
        scalars: {
          DateTime: 'string',
          NaiveDate: 'string',
          NaiveDateTime: 'string',
        },
        avoidOptionals: { field: true },
        skipTypename: false,
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
