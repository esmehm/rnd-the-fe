import { useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Select, SelectValue, Button as AriaButton, Popover, ListBox, ListBoxItem } from 'react-aria-components';
import type { ReasonOption, StocktakeLine } from './api';
import { difference, formatDate } from './format';
import * as c from './StocktakeCards.css';
import * as ui from '../../ui/uikit.css';
import { vars } from '../../styles/theme.css';

// Card variant of the counted editor (48px touch target). Same commit-on-blur +
// focus-guarded prop sync as the table's CountedCell.
function CardCounted({ line, disabled, onCommit }: { line: StocktakeLine; disabled: boolean; onCommit: (l: StocktakeLine, v: number | null) => void }) {
  const [draft, setDraft] = useState(line.countedNumberOfPacks == null ? '' : String(line.countedNumberOfPacks));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement === ref.current) return;
    setDraft(line.countedNumberOfPacks == null ? '' : String(line.countedNumberOfPacks));
  }, [line.countedNumberOfPacks]);
  const commit = () => {
    const next = draft.trim() === '' ? null : Number(draft);
    if (next != null && Number.isNaN(next)) return;
    if (next !== (line.countedNumberOfPacks ?? null)) onCommit(line, next);
  };
  return (
    <input
      ref={ref}
      className={c.touchInput}
      inputMode="numeric"
      aria-label={`Packs counted for ${line.itemName}`}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

interface Props {
  lines: StocktakeLine[];
  reasonOptions: ReasonOption[];
  disabled: boolean;
  openEdit: (line: StocktakeLine) => void;
  saveCounted: (line: StocktakeLine, value: number | null) => void;
  saveReason: (line: StocktakeLine, reasonId: string) => void;
}

export function StocktakeCards({ lines, reasonOptions, disabled, openEdit, saveCounted, saveReason }: Props) {
  // TanStack Virtual drives re-renders from its own internal store; the React
  // Compiler otherwise memoises the getVirtualItems() map on the (stable)
  // virtualizer ref and never recomputes the range, rendering an empty list.
  'use no memo';
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 176,
    overscan: 6,
  });

  return (
    <div ref={parentRef} className={c.scroll} role="list" aria-label="Stocktake lines">
      <div className={c.viewport} style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const line = lines[vi.index];
          const diff = difference(line);
          const applicable = diff != null && diff !== 0;
          const wantType = diff != null && diff > 0 ? 'POSITIVE_INVENTORY_ADJUSTMENT' : 'NEGATIVE_INVENTORY_ADJUSTMENT';
          const opts = reasonOptions.filter((r) => r.type === wantType);
          return (
            <div
              key={line.id}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className={c.cardWrap}
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <div className={c.card} role="listitem">
              <div className={c.cardTop}>
                <div className={c.cardName} role="button" tabIndex={0} onClick={() => openEdit(line)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openEdit(line)}>
                  {line.itemName}
                </div>
                <span className={c.cardCode}>{line.item.code}</span>
              </div>
              <div className={c.cardMeta}>
                {line.batch && <span>Batch {line.batch}</span>}
                {line.expiryDate && <span>Exp {formatDate(line.expiryDate)}</span>}
                {line.location?.name && <span>{line.location.name}</span>}
                <span>Snapshot {line.snapshotNumberOfPacks}</span>
              </div>
              <div className={c.countRow}>
                <div className={c.field}>
                  <span className={c.fieldLabel}>Counted</span>
                  <CardCounted line={line} disabled={disabled} onCommit={saveCounted} />
                </div>
                {diff != null && diff !== 0 && (
                  <div
                    className={c.diffPill}
                    style={{
                      color: diff > 0 ? vars.color.diffPositive : vars.color.diffNegative,
                      background: diff > 0 ? '#e7f5ec' : '#fdeceb',
                    }}
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </div>
                )}
                {applicable && (
                  <div className={c.field} style={{ flex: 1, minWidth: 160 }}>
                    <span className={c.fieldLabel}>Reason</span>
                    <Select aria-label={`Reason for ${line.itemName}`} isDisabled={disabled} selectedKey={line.reasonOption?.id ?? null} onSelectionChange={(k) => k != null && saveReason(line, String(k))}>
                      <AriaButton className={ui.input} style={{ height: vars.size.touch, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <SelectValue>{({ selectedText }) => <span>{selectedText || 'Select reason…'}</span>}</SelectValue>
                        <span aria-hidden>▾</span>
                      </AriaButton>
                      <Popover className={ui.popover}>
                        <ListBox className={ui.listbox} items={opts}>
                          {(item) => (
                            <ListBoxItem key={item.id} id={item.id} className={ui.listItem} textValue={item.reason}>
                              {item.reason}
                            </ListBoxItem>
                          )}
                        </ListBox>
                      </Popover>
                    </Select>
                  </div>
                )}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
