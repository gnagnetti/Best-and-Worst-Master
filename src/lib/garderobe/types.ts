export type RefRow = {
  gr: string;
  look: string;
  model: string;
  specifica: string;
  colorRaw: string;
  color: string;
  foto: string;
  fotolook: string;
  abbinamenti: string[];
  key: string;
  isApparel: boolean;
};

export type OrderRow = {
  model: string;
  color: string;
  qty: number;
  /** "Original Ext. Wholesale" — monetary wholesale value in Euro. */
  value: number;
  category: string;
  /** "Subcategory" column from the uploaded .xlsx. */
  subcategory: string;
  /** "Country" column from the uploaded .xlsx. */
  country: string;
  retailer: string;
  key: string;
};

export type OrderParseStats = {
  fileRows: number;
  fileUnits: number;
  /** Sum of "Original Ext. Wholesale" across the uploaded file. */
  fileValue: number;
  parsedRows: number;
  skippedRows: number;
  ok: boolean;
};

export type OrderParseResult = OrderParseStats & { rows: OrderRow[] };

export type OrderIndex = {
  byKey: Record<string, { qty: number; category: string; retailers: string[] }>;
  /** Model-level aggregation used as a safety net when a colour code differs. */
  byModel: Record<string, { qty: number; category: string; keys: string[] }>;
  retailers: string[];
  totalUnits: number;
};

export type LookItem = RefRow & {
  qty: number;
  orderCategory: string;
};

export type Look = {
  gr: string;
  look: string;
  fotolook: string;
  items: LookItem[];
  apparel: LookItem[];
  accessories: LookItem[];
  apparelMatched: number;
  apparelTotal: number;
  completeness: number;
  totalQty: number;
  isActive: boolean;
};

export type Garderobe = {
  gr: string;
  looks: Look[];
  completeness: number;
  totalQty: number;
  completeLooks: number;
};
