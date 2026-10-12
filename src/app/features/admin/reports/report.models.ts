export interface MonthlyReport {
  month: number;
  count: number;
  amount: number;
  currency: string | null;
}
export interface StoreSettings {
  storeName: string;
  email: string;
  phone: string;
  address: string;
  timezone: string;
}
