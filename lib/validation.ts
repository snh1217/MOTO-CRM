export const phoneRegex = /^[0-9-]+$/;

export function validateRequired(fields: Record<string, string | number | null | undefined>) {
  const missing = Object.entries(fields)
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key);
  return missing;
}
