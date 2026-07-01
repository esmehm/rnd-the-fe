import { useState } from 'react';
import { ModalOverlay, Modal, Dialog } from 'react-aria-components';
import { useInsertStocktake, useMasterLists, useStockLineCount } from './listApi';
import * as ui from '../../ui/uikit.css';
import { vars } from '../../styles/theme.css';

type Mode = 'full' | 'filtered' | 'blank';
type Scope = 'stockOnHand' | 'all';

const radioRow: React.CSSProperties = { display: 'flex', gap: vars.space.sm, alignItems: 'center', padding: `${vars.space.xs} 0`, cursor: 'pointer' };

export function NewStocktakeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [mode, setMode] = useState<Mode>('full');
  const [scope, setScope] = useState<Scope>('stockOnHand');
  const [masterListId, setMasterListId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const masterLists = useMasterLists(mode === 'filtered');
  const insert = useInsertStocktake();

  // Estimate: full → stock-line count (one stocktake line per stock line); "all items"
  // counts every stock line, "stock on hand" only those with packs; filtered → the
  // master list's line count; blank → 0.
  const stockFilter = scope === 'stockOnHand' ? { hasPacksInStore: true } : {};
  const stockCount = useStockLineCount(stockFilter, mode === 'full');
  const selectedList = masterLists.data?.find((m) => m.id === masterListId);
  const estimate =
    mode === 'blank' ? 0 : mode === 'filtered' ? selectedList?.linesCount ?? null : stockCount.data ?? null;

  const canCreate = mode !== 'filtered' || !!masterListId;

  const onOk = () => {
    const input =
      mode === 'blank'
        ? { createBlankStocktake: true }
        : mode === 'filtered'
          ? { masterListId, includeAllMasterListItems: true }
          : scope === 'all'
            ? { isAllItemsStocktake: true }
            : {}; // full + stock-on-hand = default
    insert.mutate(input, { onSuccess: (st) => onCreated(st.id), onError: (e) => setError((e as Error).message) });
  };

  return (
    <ModalOverlay className={ui.modalOverlay} isOpen isDismissable onOpenChange={(o) => !o && onClose()}>
      <Modal className={ui.modal} style={{ width: 'min(560px, 96vw)' }}>
        <Dialog aria-label="New stocktake" style={{ outline: 'none', display: 'contents' }}>
          <div className={ui.modalHeader}>New stocktake</div>
          <div className={ui.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: vars.space.md }}>
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <label style={radioRow}>
                <input type="radio" name="mode" checked={mode === 'full'} onChange={() => setMode('full')} />
                Create a full stocktake
              </label>
              {mode === 'full' && (
                <div style={{ paddingLeft: vars.space.xl, color: vars.color.textMuted }}>
                  <label style={radioRow}>
                    <input type="radio" name="scope" checked={scope === 'stockOnHand'} onChange={() => setScope('stockOnHand')} />
                    Items with stock on hand
                  </label>
                  <label style={radioRow}>
                    <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
                    All items (include out of stock items)
                  </label>
                </div>
              )}
              <label style={radioRow}>
                <input type="radio" name="mode" checked={mode === 'filtered'} onChange={() => setMode('filtered')} />
                Create a filtered stocktake (by master list)
              </label>
              {mode === 'filtered' && (
                <div style={{ paddingLeft: vars.space.xl }}>
                  <select
                    className={ui.input}
                    style={{ width: '100%' }}
                    value={masterListId}
                    onChange={(e) => setMasterListId(e.target.value)}
                    aria-label="Master list"
                  >
                    <option value="">{masterLists.isLoading ? 'Loading…' : 'Select a master list…'}</option>
                    {(masterLists.data ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.linesCount})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label style={radioRow}>
                <input type="radio" name="mode" checked={mode === 'blank'} onChange={() => setMode('blank')} />
                Create blank stocktake
              </label>
            </fieldset>

            <div className={ui.field} style={{ background: vars.color.editableBg, borderRadius: vars.radius.md, padding: vars.space.md }}>
              <strong>
                {estimate == null ? '—' : estimate.toLocaleString()} {estimate === 1 ? 'line' : 'lines'} estimated
              </strong>
            </div>

            {error && <div style={{ color: vars.color.danger, fontSize: vars.font.sizeSm }}>{error}</div>}
          </div>
          <div className={ui.modalFooter}>
            <button className={ui.button} onClick={onClose}>
              Cancel
            </button>
            <button className={ui.buttonPrimary} onClick={onOk} disabled={!canCreate || insert.isPending}>
              {insert.isPending ? 'Creating…' : 'OK'}
            </button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
