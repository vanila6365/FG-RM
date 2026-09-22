export interface BaseRecord {
  id: string;
  date: string;
  inspector: string;
}

export interface PackagingInspection extends BaseRecord {
  docNo: string;
  fgCode: string;
  batch: string;
  quantityKg: number;
  customer: string;
  status: 'Pass' | 'Fail' | 'Pending';
}

export interface FGWeightCheck extends BaseRecord {
  fgCode: string;
  batch: string;
  quantityKg: number;
  standardWeightKg: number;
  samples: number[];
  averageWeight: number;
  status: 'Pass' | 'Fail' | 'Pending';
  containerType?: string;
  note?: string;
}

export interface RawMaterialReceiving extends BaseRecord {
  docNo: string;
  rmCode: string;
  batch: string;
  deliveryNo: string;
  poNo: string;
  quantityKg: number;
  supplier: string;
  status: 'Pass' | 'Fail' | 'Pending';
}

export interface RMWeightCheck extends BaseRecord {
  rmCode: string;
  batch: string;
  quantityKg: number;
  standardWeightKg: number;
  samples: number[];
  averageWeight: number;
  status: 'Pass' | 'Fail' | 'Pending';
  containerType?: string;
  note?: string;
}

export interface ExpDateRecord extends BaseRecord {
  rmCode: string;
  batch: string;
  mfgDate: string;
  expDate: string;
  status: 'Active' | 'Near Expiry' | 'Expired' | 'Pending';
  note?: string;
}

export interface MasterData {
  customers: string[];
  fgCodes: string[];
  rmCodes: string[];
  suppliers: string[];
}

export type UserRole = 'Admin' | 'General';

export type ActiveTab = 'dashboard' | 'packaging' | 'fg-weight' | 'rm-receiving' | 'rm-weight' | 'exp-date' | 'master-data' | 'setup';
