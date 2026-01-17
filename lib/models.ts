import { naturalSort } from './naturalSort';

export const BRANDS = ['ZT', 'CFMOTO', 'VOGE'] as const;

const brandModels = {
  ZT: [
    '125C',
    '125M',
    '125D',
    '310M',
    '350D',
    '350GK',
    '368G',
    '368E',
    '310-X',
    '125-G1',
    '125-U1',
    '350T',
    '350R1'
  ],
  CFMOTO: ['450SR', '450NK', '450MT', '450CL-C', '450CL-B', '675SR-R', '675NK', '800MT'],
  VOGE: ['SR1', '300ACX', '500ACX']
} as const;

export type Brand = keyof typeof brandModels;

export function getModelsByBrand(brand: Brand) {
  return [...brandModels[brand]].sort(naturalSort);
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
