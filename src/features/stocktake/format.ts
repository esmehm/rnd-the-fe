// NaiveDate from the backend is "YYYY-MM-DD". Render as DD/MM/YYYY (OMS locale).
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.split('T')[0].split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

// Expiry urgency for cell highlighting (UI standards: near-expiry amber, expired red,
// paired with text/icon — never colour alone). `today` is injected for testability.
export function expiryStatus(
  value: string | null | undefined,
  today: Date = new Date(),
): 'expired' | 'soon' | null {
  if (!value) return null;
  const [y, m, d] = value.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  const exp = new Date(y, m - 1, d);
  const days = Math.floor((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'expired';
  if (days <= 90) return 'soon'; // within ~3 months
  return null;
}

export function difference(line: {
  countedNumberOfPacks: number | null | undefined;
  snapshotNumberOfPacks: number;
}): number | null {
  if (line.countedNumberOfPacks == null) return null;
  return line.countedNumberOfPacks - line.snapshotNumberOfPacks;
}
