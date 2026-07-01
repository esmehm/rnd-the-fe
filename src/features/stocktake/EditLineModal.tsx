import { useState } from 'react';
import {
  ModalOverlay,
  Modal,
  Dialog,
  DatePicker,
  Group,
  DateInput,
  DateSegment,
  Button as AriaButton,
  Popover,
  Calendar,
  CalendarGrid,
  CalendarCell,
  Heading,
  Select,
  SelectValue,
  ListBox,
  ListBoxItem,
  type DateValue,
} from 'react-aria-components';
import { parseDate } from '@internationalized/date';
import type { ReasonOption, StocktakeLine } from './api';
import type { UpdateStocktakeLineInput } from '../../gql/generated';
import * as ui from '../../ui/uikit.css';
import { vars } from '../../styles/theme.css';

type EditInput = Omit<UpdateStocktakeLineInput, 'id'>;

function toDateValue(v: string | null | undefined): DateValue | null {
  if (!v) return null;
  try {
    return parseDate(v.split('T')[0]);
  } catch {
    return null;
  }
}

function DateField({
  label,
  value,
  onChange,
  isDisabled,
}: {
  label: string;
  value: DateValue | null;
  onChange: (v: DateValue | null) => void;
  isDisabled?: boolean;
}) {
  return (
    <DatePicker value={value} onChange={onChange} isDisabled={isDisabled} aria-label={label}>
      <span className={ui.fieldLabel}>{label}</span>
      <Group className={ui.dateGroup}>
        <DateInput className={ui.dateInput}>
          {(segment) => <DateSegment segment={segment} className={ui.dateSegment} />}
        </DateInput>
        <AriaButton className={ui.calendarToggle} aria-label="Open calendar">
          📅
        </AriaButton>
      </Group>
      <Popover className={ui.popover}>
        <Dialog>
          <Calendar className={ui.calendar}>
            <header className={ui.calendarHeader}>
              <AriaButton slot="previous" className={ui.calendarToggle}>
                ‹
              </AriaButton>
              <Heading />
              <AriaButton slot="next" className={ui.calendarToggle}>
                ›
              </AriaButton>
            </header>
            <CalendarGrid>
              {(date) => <CalendarCell date={date} className={ui.calendarGridCell} />}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}

export function EditLineModal({
  line,
  reasonOptions,
  disabled,
  onClose,
  onSave,
}: {
  line: StocktakeLine;
  reasonOptions: ReasonOption[];
  disabled: boolean;
  onClose: () => void;
  onSave: (input: EditInput) => void;
}) {
  const [counted, setCounted] = useState(
    line.countedNumberOfPacks == null ? '' : String(line.countedNumberOfPacks),
  );
  const [batch, setBatch] = useState(line.batch ?? '');
  const [comment, setComment] = useState(line.comment ?? '');
  const [packSize, setPackSize] = useState(line.packSize == null ? '' : String(line.packSize));
  const [expiry, setExpiry] = useState<DateValue | null>(toDateValue(line.expiryDate));
  const [manufacture, setManufacture] = useState<DateValue | null>(toDateValue(line.manufactureDate));
  const [reasonId, setReasonId] = useState<string | null>(line.reasonOption?.id ?? null);

  const countedNum = counted.trim() === '' ? 0 : Number(counted);
  const diff = countedNum - line.snapshotNumberOfPacks;
  const wantType = diff >= 0 ? 'POSITIVE_INVENTORY_ADJUSTMENT' : 'NEGATIVE_INVENTORY_ADJUSTMENT';
  const applicableReasons = reasonOptions.filter((r) => r.type === wantType);

  const handleSave = () => {
    const parsedPackSize = Number(packSize);
    const input: EditInput = {
      countedNumberOfPacks: countedNum,
      batch: batch.trim() || null,
      comment: comment.trim() || null,
      reasonOptionId: diff !== 0 ? reasonId ?? undefined : undefined,
      expiryDate: { value: expiry ? expiry.toString() : null },
      manufactureDate: { value: manufacture ? manufacture.toString() : null },
      // Only send pack size when it's a real positive number, so we don't overwrite
      // an unset value with a coerced 1.
      ...(packSize.trim() !== '' && parsedPackSize > 0 ? { packSize: parsedPackSize } : {}),
    };
    onSave(input);
  };

  return (
    <ModalOverlay
      className={ui.modalOverlay}
      isOpen
      isDismissable
      onOpenChange={(open) => !open && onClose()}
    >
      <Modal className={ui.modal}>
        <Dialog aria-label={`Edit line ${line.itemName}`} style={{ outline: 'none', display: 'contents' }}>
          <div className={ui.modalHeader}>Edit line</div>
          <div className={ui.modalBody}>
            <div style={{ marginBottom: vars.space.lg, color: vars.color.textMuted }}>
              <strong style={{ color: vars.color.text }}>
                {line.item.code} · {line.itemName}
              </strong>
              {line.item.unitName ? ` · ${line.item.unitName}` : ''}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: vars.space.lg,
              }}
            >
              <label className={ui.field}>
                <span className={ui.fieldLabel}>Batch</span>
                <input
                  className={ui.input}
                  value={batch}
                  disabled={disabled}
                  onChange={(e) => setBatch(e.target.value)}
                />
              </label>

              <DateField label="Expiry date" value={expiry} onChange={setExpiry} isDisabled={disabled} />
              <DateField
                label="Manufacture date"
                value={manufacture}
                onChange={setManufacture}
                isDisabled={disabled}
              />

              <label className={ui.field}>
                <span className={ui.fieldLabel}>Pack size</span>
                <input
                  className={ui.input}
                  inputMode="numeric"
                  value={packSize}
                  disabled={disabled}
                  onChange={(e) => setPackSize(e.target.value)}
                />
              </label>

              <label className={ui.field}>
                <span className={ui.fieldLabel}>Packs snapshot</span>
                <input className={ui.input} value={line.snapshotNumberOfPacks} disabled readOnly />
              </label>

              <label className={ui.field}>
                <span className={ui.fieldLabel}>Packs counted</span>
                <input
                  className={ui.input}
                  inputMode="numeric"
                  value={counted}
                  disabled={disabled}
                  onChange={(e) => setCounted(e.target.value)}
                />
              </label>

              <div className={ui.field} style={{ gridColumn: 'span 1' }}>
                <span className={ui.fieldLabel}>
                  Difference:{' '}
                  <strong
                    style={{
                      color:
                        diff > 0
                          ? vars.color.diffPositive
                          : diff < 0
                            ? vars.color.diffNegative
                            : vars.color.textMuted,
                    }}
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </strong>
                </span>
                <Select
                  aria-label="Reason"
                  isDisabled={disabled || diff === 0}
                  selectedKey={reasonId}
                  onSelectionChange={(k) => setReasonId(k == null ? null : String(k))}
                >
                  <AriaButton className={ui.input} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <SelectValue>
                      {({ selectedText }) => <span>{selectedText || 'Select reason…'}</span>}
                    </SelectValue>
                    <span aria-hidden>▾</span>
                  </AriaButton>
                  <Popover className={ui.popover}>
                    <ListBox className={ui.listbox} items={applicableReasons}>
                      {(item) => (
                        <ListBoxItem
                          key={item.id}
                          id={item.id}
                          className={ui.listItem}
                          textValue={item.reason}
                        >
                          {item.reason}
                        </ListBoxItem>
                      )}
                    </ListBox>
                  </Popover>
                </Select>
              </div>

              <label className={ui.field} style={{ gridColumn: '1 / -1' }}>
                <span className={ui.fieldLabel}>Comment</span>
                <input
                  className={ui.input}
                  value={comment}
                  disabled={disabled}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className={ui.modalFooter}>
            <button className={ui.button} onClick={onClose}>
              Cancel
            </button>
            <button className={ui.buttonPrimary} onClick={handleSave} disabled={disabled}>
              OK
            </button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
