export interface Envelope<T> {
  message: string;
  code: string;
  data: T;
}
export interface CatalogPage<T> {
  payload: T[];
  total_items: number;
  total_pages: number;
  current_page: number;
  page_size: number;
}
export interface SpringPage<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}
export interface Session {
  token_type?: string;
  id: number;
  access_token: string;
  refresh_token: string;
  username: string;
  email: string;
  role: string;
}
export interface Sku {
  id: number;
  sku: string;
  price: number;
  finalPrice?: number;
  quantity: number;
  image_url?: string;
  is_default?: boolean;
  originalPrice?: number;
  description?: string;
  barcode?: string;
  attributes?: { id: number; name: string; attributes: { id: number; value: string }[] }[];
}
export interface Product {
  id: number;
  name: string;
  description: string;
  main_image: string[];
  is_active: boolean;
  skus: Sku[];
}
export interface CartItem {
  id: number;
  product_sku_id: number;
  quantity: number;
  total_price: number;
}
export interface Cart {
  id: number;
  total_price: number;
  total_items: number;
  items: CartItem[];
}
export interface Address {
  label?: string;
  recipient_name?: string;
  phone_number?: string;
  district?: string;
  commune?: string;
  additional_information?: string;
  id: number;
  address_line1: string;
  city: string;
  zip_code: string;
  country: string;
  is_default: boolean;
}
export interface Order {
  created_at?: string;
  updated_at?: string;
  items?: OrderItem[];
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  order_date: string;
  customer_id: number;
  shipping_address_id: number;
}
export interface Checkout {
  address_id: number;
  payment_method: string;
  currency: string;
  checkout_key: string;
  expected_total?: number;
  reviewed_items?: {skuId:number;quantity:number}[];
}
export interface Transaction {
  id: number;
  transaction_no: string;
  order_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
}
export interface Notice {
  type?: string;
  resourceType?: string;
  resourceId?: string;
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
export interface OrderItem {
  id: number;
  product_sku_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}
