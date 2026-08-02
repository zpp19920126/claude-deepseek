// ============== 共享类型 ==============

export interface UnitOption {
  code: string;
  name: string;
}

export interface CategoryOption {
  code: string;
  name: string;
}

export interface SupplierOption {
  id: string;
  name: string;
  shortName?: string | null;
}

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  thumbnail: string | null;
  mainImage: string | null;
  specification: string | null;
  unitCode: string | null;
  isRawVeg: boolean;
  isCleanVeg: boolean;
  yieldRate: number | null;
  defaultSupplierId: string | null;
  defaultSupplierShortName: string | null;
  origin: string | null;
  model: string | null;
  categoryCode: string | null;
  sorter: string | null;
  shelfLife: number | null;
  operator: string | null;
  remark: string | null;
  createdBy: string | null;
  createdAt?: string;
  updatedAt?: string;
  unit: UnitOption | null;
  category: CategoryOption | null;
  defaultSupplier: SupplierOption | null;
}

export interface UnitItem {
  code: string;
  name: string;
}

export interface CategoryItem {
  code: string;
  name: string;
  icon: string | null;
  costSharingMethod: string | null;
  sharingCount: number | null;
  sorter: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerItem {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  pinyin: string | null;
  priceMode: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  fax: string | null;
  zipCode: string | null;
  contactPerson: string | null;
  taxId: string | null;
  bank: string | null;
  region: string | null;
  updatedBy: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierItem {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  pinyin: string | null;
  priceMode: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  fax: string | null;
  zipCode: string | null;
  contactPerson: string | null;
  taxId: string | null;
  bank: string | null;
  region: string | null;
  updatedBy: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  orderStartTime: string | null;
  orderStopTime: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesOrderItem {
  id: string;
  deliveryDate: string | null;
  documentNo: string;
  selfNo: string | null;
  customerCode: string | null;
  customerName: string | null;
  customerShortName: string | null;
  receiptAccount: string | null;
  receiptAmount: number | null;
  warehouse: string | null;
  handler: string | null;
  receiptDate: string | null;
  amount: number | null;
  discountAmount: number | null;
  content: string | null;
  department: string | null;
  remark: string | null;
  productCode: string | null;
  productName: string | null;
  orderUnit: string | null;
  orderQuantity: number | null;
  categoryCode: string | null;
  supplierId: string | null;
  sorter: string | null;
  createdBy: string | null;
  preparedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
  product?: { code: string; name: string } | null;
  customer?: { code: string; name: string; shortName: string | null } | null;
}
