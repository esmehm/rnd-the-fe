import {
  DatePicker,
  Group,
  DateInput,
  DateSegment,
  Button as AriaButton,
  Popover,
  Dialog,
  Calendar,
  CalendarGrid,
  CalendarCell,
  Heading,
  type DateValue,
} from 'react-aria-components';
import { parseDate } from '@internationalized/date';
import * as ui from './uikit.css';

export function toDateValue(v: string | null | undefined): DateValue | null {
  if (!v) return null;
  try {
    return parseDate(v.split('T')[0]);
  } catch {
    return null;
  }
}

/** React Aria DatePicker: segmented dd/mm/yyyy input + calendar popover. */
export function DateField({
  label,
  value,
  onChange,
  isDisabled,
  compact,
}: {
  label: string;
  value: DateValue | null;
  onChange: (v: DateValue | null) => void;
  isDisabled?: boolean;
  compact?: boolean;
}) {
  return (
    <DatePicker value={value} onChange={onChange} isDisabled={isDisabled} aria-label={label}>
      {!compact && <span className={ui.fieldLabel}>{label}</span>}
      <Group className={ui.dateGroup}>
        <DateInput className={ui.dateInput}>{(segment) => <DateSegment segment={segment} className={ui.dateSegment} />}</DateInput>
        <AriaButton className={ui.calendarToggle} aria-label={`Open calendar for ${label}`}>
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
            <CalendarGrid>{(date) => <CalendarCell date={date} className={ui.calendarGridCell} />}</CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}
