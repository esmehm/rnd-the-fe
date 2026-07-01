import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useStocktakes,
  useInsertStocktake,
  useDeleteStocktakes,
  type ListSortKey,
} from './listApi';
import { formatDate } from './format';
import { toCsv, downloadCsv } from './csv';
import * as l from './StocktakeListPage.css';
import * as ui from '../../ui/uikit.css';

const PAGE_SIZE = 20;

const COLUMNS: { key: string; sort?: ListSortKey }[] = [
  { key: 'number', sort: 'stocktakeNumber' },
  { key: 'status', sort: 'status' },
  { key: 'description', sort: 'description' },
  { key: 'created', sort: 'createdDatetime' },
  { key: 'lines' },
];

export function StocktakeListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<ListSortKey>('createdDatetime');
  const [sortDesc, setSortDesc] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [committedFilter, setCommittedFilter] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setCommittedFilter(filterText.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [filterText]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const query = useStocktakes({ first: PAGE_SIZE, offset: page * PAGE_SIZE, sortKey, sortDesc, filter: committedFilter });
  const insert = useInsertStocktake();
  const del = useDeleteStocktakes();

  const rows = query.data?.nodes ?? [];
  const total = query.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const toggleSort = (key: ListSortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(false);
    }
  };

  const onNew = () =>
    insert.mutate(undefined, {
      onSuccess: (st) => navigate(`/inventory/stocktakes/${st.id}`),
      onError: (e) => setToast((e as Error).message),
    });

  const onDelete = () =>
    del.mutate(selectedIds, { onSuccess: () => setSelected({}), onError: (e) => setToast((e as Error).message) });

  return (
    <div className={l.page}>
      <div className={l.bar}>
        <h1 className={l.title}>{t('stocktakes.title')}</h1>
        <div className={l.spacer} />
        <button className={ui.buttonDanger} disabled={!selectedIds.length || del.isPending} onClick={onDelete}>
          {selectedIds.length ? t('common.deleteN', { count: selectedIds.length }) : t('common.delete')}
        </button>
        <button
          className={ui.button}
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              'stocktakes.csv',
              toCsv(
                ['Number', 'Status', 'Description', 'Created', 'Lines'],
                rows.map((r) => [r.stocktakeNumber, r.status, r.description, formatDate(r.createdDatetime), r.lines.totalCount]),
              ),
            )
          }
        >
          {t('stocktakes.exportCsv')}
        </button>
        <button className={ui.buttonPrimary} disabled={insert.isPending} onClick={onNew}>
          {t('stocktakes.new')}
        </button>
      </div>

      <div className={l.bar}>
        <input
          className={l.filterInput}
          type="search"
          placeholder={t('stocktakes.filter')}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label={t('stocktakes.filter')}
        />
        <span className={l.meta}>
          {query.isFetching ? 'Loading… ' : ''}
          {t('stocktakes.count', { count: total })}
        </span>
      </div>

      <div className={l.tableWrap}>
        <table className={l.table}>
          <thead>
            <tr>
              <th className={l.th} style={{ width: 44 }} aria-label="Select" />
              {COLUMNS.map((c) => {
                const active = c.sort === sortKey;
                return (
                  <th
                    key={c.key}
                    className={`${l.th} ${c.sort ? l.thSortable : ''}`}
                    onClick={c.sort ? () => toggleSort(c.sort!) : undefined}
                    aria-sort={active ? (sortDesc ? 'descending' : 'ascending') : undefined}
                  >
                    {t(`col.${c.key}`)}
                    {active ? (sortDesc ? ' ▼' : ' ▲') : ''}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={l.tr}
                data-selected={!!selected[r.id]}
                onClick={() => navigate(`/inventory/stocktakes/${r.id}`)}
              >
                <td className={l.tdCheckbox} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select stocktake ${r.stocktakeNumber}`}
                    checked={!!selected[r.id]}
                    onChange={(e) => setSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </td>
                <td className={l.td}>{r.stocktakeNumber}</td>
                <td className={l.td}>
                  <span className={l.statusBadge}>{r.status}</span>
                </td>
                <td className={l.td}>{r.description}</td>
                <td className={l.td}>{formatDate(r.createdDatetime)}</td>
                <td className={l.td}>{r.lines.totalCount.toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length && !query.isLoading && (
              <tr>
                <td className={l.td} colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  No stocktakes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={l.pagination}>
        <span className={l.meta}>
          {total ? `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}` : '0'}
        </span>
        <button className={l.pageBtn} disabled={page === 0} onClick={() => setPage(0)} aria-label="First page">
          «
        </button>
        <button className={l.pageBtn} disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
          ‹
        </button>
        <button className={l.pageBtn} data-current="true" aria-current="page">
          {page + 1}
        </button>
        <button
          className={l.pageBtn}
          disabled={page + 1 >= pageCount}
          onClick={() => setPage((p) => p + 1)}
          aria-label="Next page"
        >
          ›
        </button>
        <button
          className={l.pageBtn}
          disabled={page + 1 >= pageCount}
          onClick={() => setPage(pageCount - 1)}
          aria-label="Last page"
        >
          »
        </button>
      </div>

      {toast && (
        <div className={ui.button} role="alert" style={{ position: 'fixed', bottom: 48, left: '50%', transform: 'translateX(-50%)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
