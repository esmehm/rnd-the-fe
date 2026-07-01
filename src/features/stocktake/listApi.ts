import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { sdk, STORE_ID } from '../../gql/client';
import type {
  StocktakeRowFragment,
  StocktakeSortFieldInput,
  UpdateStocktakeInput,
  InsertStocktakeInput,
  StockLineFilterInput,
} from '../../gql/generated';

export type StocktakeListRow = StocktakeRowFragment;
export type ListSortKey = StocktakeSortFieldInput;

export interface StocktakesArgs {
  first: number;
  offset: number;
  sortKey: ListSortKey;
  sortDesc: boolean;
  filter: string;
}

const keys = {
  list: (a: StocktakesArgs) => ['stocktakes', a] as const,
  items: (search: string) => ['items', search] as const,
};

export function useStocktakes(args: StocktakesArgs) {
  return useQuery({
    queryKey: keys.list(args),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const filter = args.filter.trim()
        ? { description: { like: args.filter.trim() } }
        : undefined;
      const res = await sdk.Stocktakes({
        storeId: STORE_ID,
        page: { first: args.first, offset: args.offset },
        sort: [{ key: args.sortKey, desc: args.sortDesc }],
        filter,
      });
      return { totalCount: res.stocktakes.totalCount, nodes: res.stocktakes.nodes as StocktakeListRow[] };
    },
  });
}

export function useInsertStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<InsertStocktakeInput, 'id'>) => {
      const id = crypto.randomUUID();
      const res = await sdk.InsertStocktake({ storeId: STORE_ID, input: { id, ...input } });
      if (res.insertStocktake.__typename !== 'StocktakeNode') throw new Error('Could not create stocktake');
      return res.insertStocktake;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocktakes'] }),
  });
}

export function useMasterLists(enabled: boolean) {
  return useQuery({
    queryKey: ['masterLists'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await sdk.MasterLists({ storeId: STORE_ID })).masterLists.nodes,
  });
}

// Live line estimate for the New-stocktake modal — counts stock lines (a full
// stocktake creates one line per stock line, so this matches the created count).
export function useStockLineCount(filter: StockLineFilterInput, enabled: boolean) {
  return useQuery({
    queryKey: ['stockLineCount', filter],
    enabled,
    queryFn: async () => (await sdk.StockLineCount({ storeId: STORE_ID, filter })).stockLines.totalCount,
  });
}

export function useDeleteStocktakes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => sdk.DeleteStocktake({ storeId: STORE_ID, input: { id } })));
      return ids;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocktakes'] }),
  });
}

export function useUpdateStocktake(stocktakeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<UpdateStocktakeInput, 'id'>) => {
      const res = await sdk.UpdateStocktake({ storeId: STORE_ID, input: { id: stocktakeId, ...input } });
      if (res.updateStocktake.__typename === 'UpdateStocktakeError') {
        throw new Error(res.updateStocktake.error.description);
      }
      return res.updateStocktake;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocktake', stocktakeId] });
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
    },
  });
}

export function useActivityLogs(recordId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['activityLogs', recordId],
    enabled,
    queryFn: async () => {
      const res = await sdk.ActivityLogs({ storeId: STORE_ID, recordId });
      return res.activityLogs.nodes;
    },
  });
}

export function useItemSearch(search: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.items(search),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const filter = search.trim() ? { codeOrName: { like: search.trim() } } : undefined;
      const res = await sdk.Items({ storeId: STORE_ID, filter, page: { first: 50, offset: 0 } });
      return res.items.nodes;
    },
  });
}

export interface SaveLineDraft {
  id?: string; // existing line -> update; absent -> insert
  itemId: string;
  batch: string | null;
  expiryDate: string | null; // YYYY-MM-DD
  manufactureDate: string | null;
  packSize: number | null;
  countedNumberOfPacks: number;
  reasonOptionId?: string;
  costPricePerPack: number | null;
  sellPricePerPack: number | null;
  volumePerPack: number | null;
}

// Upsert a set of batches for one item: update existing lines, insert new ones.
// Sequential so we can surface the first backend error (e.g. missing adjustment reason).
export function useSaveStocktakeLines(stocktakeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (drafts: SaveLineDraft[]) => {
      for (const d of drafts) {
        if (d.id) {
          const res = await sdk.UpdateStocktakeLine({
            storeId: STORE_ID,
            input: {
              id: d.id,
              countedNumberOfPacks: d.countedNumberOfPacks,
              batch: d.batch,
              expiryDate: { value: d.expiryDate },
              manufactureDate: { value: d.manufactureDate },
              packSize: d.packSize ?? undefined,
              reasonOptionId: d.reasonOptionId,
              costPricePerPack: d.costPricePerPack ?? undefined,
              sellPricePerPack: d.sellPricePerPack ?? undefined,
              volumePerPack: d.volumePerPack ?? undefined,
            },
          });
          if (res.updateStocktakeLine.__typename === 'UpdateStocktakeLineError') {
            throw new Error(res.updateStocktakeLine.error.description);
          }
        } else {
          const res = await sdk.InsertStocktakeLine({
            storeId: STORE_ID,
            input: {
              id: crypto.randomUUID(),
              stocktakeId,
              itemId: d.itemId,
              countedNumberOfPacks: d.countedNumberOfPacks,
              batch: d.batch,
              expiryDate: d.expiryDate,
              manufactureDate: d.manufactureDate,
              packSize: d.packSize ?? undefined,
              reasonOptionId: d.reasonOptionId,
              costPricePerPack: d.costPricePerPack ?? undefined,
              sellPricePerPack: d.sellPricePerPack ?? undefined,
              volumePerPack: d.volumePerPack ?? undefined,
            },
          });
          if (res.insertStocktakeLine.__typename === 'InsertStocktakeLineError') {
            throw new Error(res.insertStocktakeLine.error.description);
          }
        }
      }
      return drafts.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocktakeLines'] });
      qc.invalidateQueries({ queryKey: ['stocktake', stocktakeId] });
    },
  });
}

export function useInsertStocktakeLine(stocktakeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await sdk.InsertStocktakeLine({
        storeId: STORE_ID,
        input: { id: crypto.randomUUID(), stocktakeId, itemId, countedNumberOfPacks: 0 },
      });
      if (res.insertStocktakeLine.__typename === 'InsertStocktakeLineError') {
        throw new Error(res.insertStocktakeLine.error.description);
      }
      return res.insertStocktakeLine;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocktakeLines'] });
      qc.invalidateQueries({ queryKey: ['stocktake', stocktakeId] });
    },
  });
}
