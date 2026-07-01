// NaiveDate from the backend is "YYYY-MM-DD". Render as DD/MM/YYYY (OMS locale).
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.split('T')[0].split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function difference(line: {
  countedNumberOfPacks: number | null | undefined;
  snapshotNumberOfPacks: number;
}): number | null {
  if (line.countedNumberOfPacks == null) return null;
  return line.countedNumberOfPacks - line.snapshotNumberOfPacks;
}
