export function normalizeVehicleNumber(value: string) {
  return value.replace(/[\s-]+/g, '').toUpperCase();
}
