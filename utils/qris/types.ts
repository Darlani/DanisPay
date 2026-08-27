export interface TLV {
  tag: string;
  name: string;
  length: number;
  value: string;
  children?: TLV[];
}

export interface QRISData {
  version: string;
  method: "static" | "dynamic" | "unknown";

  merchantName: string;
  merchantCity: string;

  merchantCategoryCode: string;
  currency: string;

  amount?: string;

  merchantAccountInfo: MerchantAccountInfo[];

  tipIndicator?: "prompt" | "fixed" | "percentage";

  tipFixed?: string;
  tipPercentage?: string;

  countryCode: string;
  postalCode: string;

  additionalData?: TLV[];

  crc: string;

  raw: TLV[];
}

export interface MerchantAccountInfo {
  tag: string;
  globallyUniqueId: string;
  merchantId?: string;
  merchantCriteria?: string;
  fields: TLV[];
}

export interface CRCResult {
  valid: boolean;
  expected: string;
  actual: string;
}

export interface TLVDiff {
  path: string;
  tag: string;
  name: string;

  status:
    | "same"
    | "changed"
    | "added"
    | "removed";

  staticValue?: string;
  dynamicValue?: string;

  staticLength?: number;
  dynamicLength?: number;

  staticChildren?: TLV[];
  dynamicChildren?: TLV[];
}

export interface CharacterDifference {
  position: number;
  staticChar: string | null;
  dynamicChar: string | null;
}