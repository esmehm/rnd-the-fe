import { useState } from 'react';
import {
  ModalOverlay,
  Modal,
  Dialog,
  Select,
  SelectValue,
  Button as AriaButton,
  Popover,
  ListBox,
  ListBoxItem,
  type DateValue,
} from 'react-aria-components';
import { DateField, toDateValue } from '../../ui/DateField';
import type { ReasonOption, StocktakeLine } from './api';
import type { SaveLineDraft } from './listApi';
import * as ui from '../../ui/uikit.css';
import * as m from './EditItemModal.css';
import { vars } from '../../styles/theme.css';

type Tab = 'batch' | 'pricing' | 'other';

interface BatchRow {
  key: string;
  id?: string;
  itemId: string;
  snapshot: number;
  batch: string;
  expiry: DateValue | null;
  manufacture: DateValue | null;
  packSize: string;
  counted: string;
  reasonId: string | null;
  cost: string;
  sell: string;
  volume: string;
}

const num = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
};

function toRow(line: StocktakeLine): BatchRow {
  return {
    key: line.id,
    id: line.id,
    itemId: line.itemId,
    snapshot: line.snapshotNumberOfPacks,
    batch: line.batch ?? '',
    expiry: toDateValue(line.expiryDate),
    manufacture: toDateValue(line.manufactureDate),
    packSize: line.packSize == null ? '' : String(line.packSize),
    counted: line.countedNumberOfPacks == null ? '' : String(line.countedNumberOfPacks),
    reasonId: line.reasonOption?.id ?? null,
    cost: line.costPricePerPack == null ? '' : String(line.costPricePerPack),
    sell: line.sellPricePerPack == null ? '' : String(line.sellPricePerPack),
    volume: line.volumePerPack == null ? '' : String(line.volumePerPack),
  };
}

let blankSeq = 0;
function blankRow(itemId: string): BatchRow {
  blankSeq += 1;
  return {
    key: `new-${blankSeq}`,
    itemId,
    snapshot: 0,
    batch: '',
    expiry: null,
    manufacture: null,
    packSize: '',
    counted: '',
    reasonId: null,
    cost: '',
    sell: '',
    volume: '',
  };
}

const rowDiff = (r: BatchRow) => (num(r.counted) ?? 0) - r.snapshot;

export function EditItemModal({
  item,
  lines,
  reasonOptions,
  disabled,
  saving,
  onClose,
  onSave,
  onSaveAndNext,
  hasNext,
}: {
  item: { id: string; code: string; name: string; unitName?: string | null };
  lines: StocktakeLine[];
  reasonOptions: ReasonOption[];
  disabled: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (drafts: SaveLineDraft[]) => void;
  onSaveAndNext: (drafts: SaveLineDraft[]) => void;
  hasNext: boolean;
}) {
  const [tab, setTab] = useState<Tab>('batch');
  const [rows, setRows] = useState<BatchRow[]>(() => (lines.length ? lines.map(toRow) : [blankRow(item.id)]));

  const set = (key: string, patch: Partial<BatchRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // A variance needs a reason before we can save (matches the backend rule).
  const missingReason = rows.some((r) => rowDiff(r) !== 0 && !r.reasonId);

  const buildDrafts = (): SaveLineDraft[] =>
    rows.map((r) => {
      const counted = num(r.counted) ?? 0;
      const diff = counted - r.snapshot;
      return {
        id: r.id,
        itemId: item.id,
        batch: r.batch.trim() || null,
        expiryDate: r.expiry ? r.expiry.toString() : null,
        manufactureDate: r.manufacture ? r.manufacture.toString() : null,
        packSize: num(r.packSize),
        countedNumberOfPacks: counted,
        reasonOptionId: diff !== 0 ? r.reasonId ?? undefined : undefined,
        costPricePerPack: num(r.cost),
        sellPricePerPack: num(r.sell),
        volumePerPack: num(r.volume),
      };
    });

  const batchCols = '140px 150px 150px 90px 90px 90px 70px 190px';
  const pricingCols = '200px 130px 130px 130px';

  return (
    <ModalOverlay className={ui.modalOverlay} isOpen isDismissable onOpenChange={(o) => !o && onClose()}>
      <Modal className={ui.modal}>
        <Dialog aria-label={`Edit ${item.name}`} style={{ outline: 'none', display: 'contents' }}>
          <div className={ui.modalHeader}>Edit line</div>
          <div className={ui.modalBody}>
            <div className={m.itemHeading}>
              <span className={m.itemStrong}>
                {item.code} · {item.name}
              </span>
              {item.unitName ? ` · ${item.unitName}` : ''}
            </div>

            <div className={m.tabs} role="tablist">
              {(['batch', 'pricing', 'other'] as Tab[]).map((t) => (
                <button key={t} className={m.tab} data-active={tab === t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                  {t === 'batch' ? 'Batch' : t === 'pricing' ? 'Pricing' : 'Other'}
                </button>
              ))}
            </div>

            {tab === 'batch' && (
              <div className={m.gridScroll}>
                <div className={m.gridHead} style={{ '--batch-cols': batchCols } as React.CSSProperties}>
                  <div>Batch</div>
                  <div>Expiry date</div>
                  <div>Manufacture date</div>
                  <div style={{ textAlign: 'right' }}>Pack size</div>
                  <div style={{ textAlign: 'right' }}>Snapshot</div>
                  <div style={{ textAlign: 'right' }}>Counted</div>
                  <div style={{ textAlign: 'right' }}>Diff</div>
                  <div>Reason</div>
                </div>
                {rows.map((r) => {
                  const diff = rowDiff(r);
                  const wantType = diff >= 0 ? 'POSITIVE_INVENTORY_ADJUSTMENT' : 'NEGATIVE_INVENTORY_ADJUSTMENT';
                  const opts = reasonOptions.filter((o) => o.type === wantType);
                  return (
                    <div key={r.key} className={m.gridRow} style={{ '--batch-cols': batchCols } as React.CSSProperties}>
                      <input className={m.cellInput} aria-label="Batch" value={r.batch} disabled={disabled} onChange={(e) => set(r.key, { batch: e.target.value })} />
                      <DateField label="Expiry date" value={r.expiry} onChange={(v) => set(r.key, { expiry: v })} isDisabled={disabled} compact />
                      <DateField label="Manufacture date" value={r.manufacture} onChange={(v) => set(r.key, { manufacture: v })} isDisabled={disabled} compact />
                      <input className={m.cellNumeric} inputMode="numeric" aria-label="Pack size" value={r.packSize} disabled={disabled} onChange={(e) => set(r.key, { packSize: e.target.value })} />
                      <div className={m.snapshotCell}>{r.snapshot}</div>
                      <input className={m.cellNumeric} inputMode="numeric" aria-label="Packs counted" value={r.counted} disabled={disabled} onChange={(e) => set(r.key, { counted: e.target.value })} />
                      <div className={m.diffCell} style={{ color: diff > 0 ? vars.color.diffPositive : diff < 0 ? vars.color.diffNegative : vars.color.textMuted }}>
                        {diff > 0 ? `+${diff}` : diff}
                      </div>
                      <Select aria-label="Reason" isDisabled={disabled || diff === 0} selectedKey={r.reasonId} onSelectionChange={(k) => set(r.key, { reasonId: k == null ? null : String(k) })}>
                        <AriaButton className={m.reasonTrigger}>
                          <SelectValue>{({ selectedText }) => <span>{diff === 0 ? '—' : selectedText || 'Select…'}</span>}</SelectValue>
                          <span aria-hidden>▾</span>
                        </AriaButton>
                        <Popover className={ui.popover}>
                          <ListBox className={ui.listbox} items={opts}>
                            {(o) => (
                              <ListBoxItem key={o.id} id={o.id} className={ui.listItem} textValue={o.reason}>
                                {o.reason}
                              </ListBoxItem>
                            )}
                          </ListBox>
                        </Popover>
                      </Select>
                    </div>
                  );
                })}
                <button className={m.addBatch} disabled={disabled} onClick={() => setRows((rs) => [...rs, blankRow(item.id)])}>
                  + Add batch
                </button>
              </div>
            )}

            {tab === 'pricing' && (
              <div className={m.gridScroll}>
                <div className={m.gridHead} style={{ '--batch-cols': pricingCols } as React.CSSProperties}>
                  <div>Batch</div>
                  <div style={{ textAlign: 'right' }}>Cost / pack</div>
                  <div style={{ textAlign: 'right' }}>Sell / pack</div>
                  <div style={{ textAlign: 'right' }}>Volume / pack</div>
                </div>
                {rows.map((r) => (
                  <div key={r.key} className={m.gridRow} style={{ '--batch-cols': pricingCols } as React.CSSProperties}>
                    <div className={m.snapshotCell} style={{ textAlign: 'left', color: vars.color.text }}>{r.batch || '(no batch)'}</div>
                    <input className={m.cellNumeric} inputMode="decimal" aria-label="Cost per pack" value={r.cost} disabled={disabled} onChange={(e) => set(r.key, { cost: e.target.value })} />
                    <input className={m.cellNumeric} inputMode="decimal" aria-label="Sell per pack" value={r.sell} disabled={disabled} onChange={(e) => set(r.key, { sell: e.target.value })} />
                    <input className={m.cellNumeric} inputMode="decimal" aria-label="Volume per pack" value={r.volume} disabled={disabled} onChange={(e) => set(r.key, { volume: e.target.value })} />
                  </div>
                ))}
              </div>
            )}

            {tab === 'other' && (
              <div className={m.otherNote}>Donor, campaign and program fields are not part of this prototype.</div>
            )}

            {missingReason && (
              <div style={{ color: vars.color.danger, fontSize: vars.font.sizeSm, marginTop: vars.space.md }}>
                A reason is required for every batch with a variance.
              </div>
            )}
          </div>

          <div className={ui.modalFooter}>
            <button className={ui.button} onClick={onClose}>
              Cancel
            </button>
            <button className={ui.buttonPrimary} disabled={disabled || saving || missingReason} onClick={() => onSave(buildDrafts())}>
              OK
            </button>
            {hasNext && (
              <button className={ui.buttonPrimary} disabled={disabled || saving || missingReason} onClick={() => onSaveAndNext(buildDrafts())}>
                OK &amp; next
              </button>
            )}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
