import { useState, useRef, useEffect } from 'react';
import {
  Select,
  SelectValue,
  Button as AriaButton,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import type { ReasonOption, StocktakeLine } from './api';
import { difference } from './format';
import * as s from './StocktakeTable.css';
import * as ui from '../../ui/uikit.css';

/**
 * Inline "Packs counted" editor. Deliberately a native numeric input rather than a
 * React Aria NumberField: it's in the hottest render path (one per visible row) so
 * we keep its DOM minimal. Richer controls (reason Select, edit modal, date pickers)
 * use React Aria for full a11y. Commits on Enter or blur.
 */
export function CountedCell({
  line,
  disabled,
  onCommit,
}: {
  line: StocktakeLine;
  disabled: boolean;
  onCommit: (line: StocktakeLine, value: number | null) => void;
}) {
  const [draft, setDraft] = useState<string>(
    line.countedNumberOfPacks == null ? '' : String(line.countedNumberOfPacks),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync the draft when the server value changes externally (edit modal, refetch,
  // another user) — but never clobber what the user is actively typing.
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setDraft(line.countedNumberOfPacks == null ? '' : String(line.countedNumberOfPacks));
  }, [line.countedNumberOfPacks]);

  const commit = () => {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next != null && Number.isNaN(next)) {
      setDraft(line.countedNumberOfPacks == null ? '' : String(line.countedNumberOfPacks));
      return;
    }
    if (next !== (line.countedNumberOfPacks ?? null)) onCommit(line, next);
  };

  if (disabled) {
    return <div className={s.cellNumeric}>{line.countedNumberOfPacks ?? ''}</div>;
  }

  return (
    <div className={s.editableCell}>
      <input
        ref={inputRef}
        className={s.inlineInput}
        inputMode="numeric"
        aria-label={`Packs counted for ${line.itemName}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(line.countedNumberOfPacks == null ? '' : String(line.countedNumberOfPacks));
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}

export function DifferenceCell({ line }: { line: StocktakeLine }) {
  const diff = difference(line);
  if (diff == null || diff === 0) return <div className={s.cellNumeric}>{diff ?? ''}</div>;
  return (
    <div className={s.cellNumeric}>
      <span className={diff > 0 ? s.diffPositive : s.diffNegative}>
        {diff > 0 ? `+${diff}` : diff}
      </span>
    </div>
  );
}

export function ReasonCell({
  line,
  reasonOptions,
  disabled,
  onCommit,
}: {
  line: StocktakeLine;
  reasonOptions: ReasonOption[];
  disabled: boolean;
  onCommit: (line: StocktakeLine, reasonId: string) => void;
}) {
  const diff = difference(line);
  // Reason only applies when there's a variance; match the sign to the reason type.
  const applicable = diff != null && diff !== 0;
  const wantType = diff != null && diff > 0 ? 'POSITIVE_INVENTORY_ADJUSTMENT' : 'NEGATIVE_INVENTORY_ADJUSTMENT';
  const options = reasonOptions.filter((r) => r.type === wantType);

  if (!applicable) return <div className={s.cell} />;

  return (
    <div className={s.cell} style={{ padding: '0 4px', width: '100%' }}>
      <Select
        aria-label={`Reason for ${line.itemName}`}
        isDisabled={disabled}
        selectedKey={line.reasonOption?.id ?? null}
        onSelectionChange={(key) => key != null && onCommit(line, String(key))}
        style={{ width: '100%' }}
      >
        <AriaButton className={s.reasonTrigger}>
          <SelectValue>
            {({ selectedText }) => <span>{selectedText || 'Select reason…'}</span>}
          </SelectValue>
          <span aria-hidden>▾</span>
        </AriaButton>
        <Popover className={ui.popover}>
          <ListBox className={ui.listbox} items={options}>
            {(item) => (
              <ListBoxItem key={item.id} id={item.id} className={ui.listItem} textValue={item.reason}>
                {item.reason}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </Select>
    </div>
  );
}
