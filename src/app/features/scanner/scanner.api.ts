import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
export interface ScanResult {
  found: boolean; message?: string; productId?: number; productSkuId?: number; name?: string; sku?: string; barcode?: string;
  originalPrice?: number; finalPrice?: number; availableQuantity?: number; inStock?: boolean; availableForSale?: boolean;
  imageUrl?: string; warehouseLocation?: string; variant?: { name: string; value: string }[];
}
export interface ImageCandidate { productId: number; productSkuId?: number; name: string; sku?: string; imageUrl?: string; confidence: number; }
export interface ImageMatches { matchType: string; exact: boolean; requiresSelection: boolean; message: string; candidates: ImageCandidate[]; }
@Injectable({ providedIn: 'root' })
export class ScannerApi {
  private api = inject(ApiClient);
  scan(code: string) { return this.api.data<ScanResult>('/api/v1/product-scanner/scan', { code }); }
  recognize(image: File) { const body = new FormData(); body.append('image', image); return this.api.data<ImageMatches>('/api/v1/product-scanner/recognize', body); }
}
