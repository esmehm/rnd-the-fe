import { useEffect, useState } from 'react';
import { ModalOverlay, Modal, Dialog } from 'react-aria-components';
import { useItemSearch, useInsertStocktakeLine } from './listApi';
import * as ui from '../../ui/uikit.css';
import { vars } from '../../styles/theme.css';

export function AddItemModal({ stocktakeId, onClose }: { stocktakeId: string; onClose: () => void }) {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);

  const items = useItemSearch(search, true);
  const insert = useInsertStocktakeLine(stocktakeId);

  const add = (itemId: string, label: string) => {
    insert.mutate(itemId, {
      onSuccess: () => setAdded((a) => [label, ...a]),
      onError: (e) => setError((e as Error).message),
    });
  };

  return (
    <ModalOverlay className={ui.modalOverlay} isOpen isDismissable onOpenChange={(o) => !o && onClose()}>
      <Modal className={ui.modal} style={{ width: 'min(640px, 96vw)' }}>
        <Dialog aria-label="Add item" style={{ outline: 'none', display: 'contents' }}>
          <div className={ui.modalHeader}>Add item</div>
          <div className={ui.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: vars.space.md }}>
            <input
              className={ui.input}
              type="search"
              autoFocus
              placeholder="Search items by code or name…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Search items"
            />
            {error && <div style={{ color: vars.color.danger, fontSize: vars.font.sizeSm }}>{error}</div>}
            <div style={{ maxHeight: '40vh', overflow: 'auto', border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.sm }}>
              {(items.data ?? []).map((it) => (
                <button
                  key={it.id}
                  className={ui.listItem}
                  style={{ display: 'flex', gap: vars.space.md, width: '100%', textAlign: 'left', border: 'none', background: 'transparent' }}
                  onClick={() => add(it.id, `${it.code} · ${it.name}`)}
                  disabled={insert.isPending}
                >
                  <span style={{ color: vars.color.textMuted, minWidth: 90 }}>{it.code}</span>
                  <span style={{ flex: 1 }}>{it.name}</span>
                  <span style={{ color: vars.color.textLink }}>+ add</span>
                </button>
              ))}
              {items.isFetching && <div style={{ padding: vars.space.md, color: vars.color.textMuted }}>Searching…</div>}
              {!items.isFetching && search && !(items.data ?? []).length && (
                <div style={{ padding: vars.space.md, color: vars.color.textMuted }}>No items found</div>
              )}
            </div>
            {added.length > 0 && (
              <div style={{ fontSize: vars.font.sizeSm, color: vars.color.diffPositive }}>
                Added {added.length}: {added.slice(0, 3).join(', ')}
                {added.length > 3 ? '…' : ''}
              </div>
            )}
          </div>
          <div className={ui.modalFooter}>
            <button className={ui.buttonPrimary} onClick={onClose}>
              Done
            </button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
