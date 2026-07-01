import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { sdk, STORE_ID } from '../../gql/client';
import type {
  StocktakeLineRowFragment,
  StocktakeLineSortFieldInput,
  UpdateStocktakeLineInput,
} from '../../gql/generated';

export type StocktakeLine = StocktakeLineRowFragment;
export type SortKey = StocktakeLineSortFieldInput;
export type ReasonOption = {
  __typename?: 'ReasonOptionNode';
  id: string;
  reason: string;
  type: string;
  isActive: boolean;
};

export interface LinesArgs {
  stocktakeId: string;
  sortKey: SortKey;
  sortDesc: boolean;
  filter: string;
}

const keys = {
  stocktake: (id: string) => ['stocktake', id] as const,
  lines: (a: LinesArgs) => ['stocktakeLines', a] as const,
  reasons: ['reasonOptions'] as const,
};

export function useStocktake(stocktakeId: string) {
  return useQuery({
    queryKey: keys.stocktake(stocktakeId),
    queryFn: async () => {
      const res = await sdk.Stocktake({ stocktakeId, storeId: STORE_ID });
      if (res.stocktake.__typename !== 'StocktakeNode') {
        throw new Error('Stocktake not found');
      }
      return res.stocktake;
    },
  });
}

// Fetch the whole line set in one request and virtualise the DOM, rather than
// paging on the server. This is the thing we are stress-testing: 1,506 rows in
// state, only the visible window in the DOM.
export function useStocktakeLines(args: LinesArgs) {
  return useQuery({
    queryKey: keys.lines(args),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const filter = args.filter.trim()
        ? { itemCodeOrName: { like: args.filter.trim() } }
        : undefined;
      const res = await sdk.StocktakeLines({
        stocktakeId: args.stocktakeId,
        storeId: STORE_ID,
        page: { first: 10000, offset: 0 },
        sort: [{ key: args.sortKey, desc: args.sortDesc }],
        filter,
      });
      const conn = res.stocktakeLines;
      return {
        totalCount: conn.totalCount,
        nodes: conn.nodes as StocktakeLine[],
      };
    },
  });
}

export function useReasonOptions() {
  return useQuery({
    queryKey: keys.reasons,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await sdk.ReasonOptions({ filter: { isActive: true } });
      return res.reasonOptions.nodes;
    },
  });
}

export function useUpdateStocktakeLine(stocktakeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateStocktakeLineInput) => {
      const res = await sdk.UpdateStocktakeLine({ storeId: STORE_ID, input });
      const result = res.updateStocktakeLine;
      // The backend rejects a variance with no (or wrong) adjustment reason. Surface
      // that as a thrown error so the mutation's onError can prompt for a reason.
      if (result.__typename === 'UpdateStocktakeLineError') {
        throw new Error(result.error.description);
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocktakeLines'] });
      qc.invalidateQueries({ queryKey: keys.stocktake(stocktakeId) });
    },
  });
}

export function useDeleteStocktakeLines(stocktakeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => sdk.DeleteStocktakeLine({ storeId: STORE_ID, input: { id } })),
      );
      return ids;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocktakeLines'] });
      qc.invalidateQueries({ queryKey: keys.stocktake(stocktakeId) });
    },
  });
}
