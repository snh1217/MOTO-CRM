import { naturalSort } from './naturalSort';

export const BRANDS = ['ZT', 'CFMOTO', 'VOGE'] as const;
export const ZT_TYPES = [
  { key: 'scooter', label: '스쿠터' },
  { key: 'manual', label: '매뉴얼 바이크' }
] as const;

const ztModels = {
  scooter: [
    'ZT125T-M',
    'ZT125T-D',
    'ZT125T-E',
    'ZT310T-M',
    'ZT350T-D',
    'ZT368T-E',
    'ZT368G ADX'
  ],
  manual: ['ZT310-X', 'ZT125-G1', 'ZT125-U1', 'ZT125-C', 'ZT350-GK', 'ZT350-T', 'ZT350-R1']
} as const;

const brandModels = {
  CFMOTO: ['450SR', '450NK', '450MT', '450CL-C', '450CL-B', '675SR-R', '675NK', '800MT'],
  VOGE: ['SR1', '300ACX', '500ACX']
} as const;

export type Brand = (typeof BRANDS)[number];
export type ZtType = (typeof ZT_TYPES)[number]['key'];

export function getModelsByBrand(brand: Exclude<Brand, 'ZT'>) {
  return [...brandModels[brand]].sort(naturalSort);
}

export function getZtModelsByType(type: ZtType) {
  return [...ztModels[type]].sort(naturalSort);
}

export function resolveZtType(model: string): ZtType | null {
  if (ztModels.scooter.includes(model as (typeof ztModels.scooter)[number])) {
    return 'scooter';
  }
  if (ztModels.manual.includes(model as (typeof ztModels.manual)[number])) {
    return 'manual';
  }
  return null;
}

export function parseVehicleName(vehicleName: string) {
  for (const brand of BRANDS) {
    const prefix = `${brand} `;
    if (vehicleName.startsWith(prefix)) {
      const model = vehicleName.slice(prefix.length).trim();
      if (model) {
        return { brand, model };
      }
    }
  }
  return null;
}
