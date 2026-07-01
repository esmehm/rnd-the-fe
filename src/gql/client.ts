import { GraphQLClient } from 'graphql-request';
import { getSdk } from './generated';

// The rspack dev server proxies /graphql -> http://localhost:8000/graphql, so the
// app is same-origin. Backend runs debug_no_access_control, so no auth header.
// graphql-request v7 requires an absolute URL, so resolve against our own origin.
const endpoint =
  typeof window !== 'undefined' ? `${window.location.origin}/graphql` : 'http://localhost:3100/graphql';

export const graphqlClient = new GraphQLClient(endpoint);
export const sdk = getSdk(graphqlClient);

// The reference target (CHC Ermera store, stocktake #112, 1,506 editable lines).
// Hard-coded for the prototype; a real app derives these from route + store context.
export const STORE_ID = '5B28901C52396E4BB098B9862CCF5DF9';
export const DEFAULT_STOCKTAKE_ID = '019f17d0-1444-795c-ac53-da2216c73cff';
