import { describe, expect, it } from 'vitest';
import { toChatProduct } from './chat-message';

describe('Live catalog chat product adapter', () => {
  it('uses catalog images, default SKU and live promotion data', () => {
    const card = toChatProduct({id: 24, name: 'Phone', images: ['https://example.test/phone.png'], skus: [
      {id: 88, basePrice: 600, effectivePrice: 240, available: 5, isDefault: true, hasPromotion: true, promotionName: 'Phone sale'}
    ]})!;
    expect(card.image).toBe('https://example.test/phone.png');
    expect(card.price).toBe(240); expect(card.originalPrice).toBe(600);
    expect(card.promotion).toBe('Phone sale'); expect(card.skuId).toBe(88);
  });
  it('selects available SKU and never invents missing price or stock', () => {
    const card = toChatProduct({id: 24, name: 'Phone', skus: [
      {id: 88, isDefault: true, available: 0}, {id: 89, effectivePrice: 280, available: 2}
    ]})!;
    expect(card.skuId).toBe(89);
    const missing = toChatProduct({id: 25, name: 'Unknown', skus: [{id: 90}]})!;
    expect(missing.price).toBeUndefined(); expect(missing.available).toBeUndefined();
    expect(missing.promotion).toBeUndefined();
  });
  it('retains legacy image support and rejects malformed products', () => {
    expect(toChatProduct({id: 1, name: 'Legacy', main_image: ['/old.png']})!.image).toBe('/old.png');
    expect(toChatProduct({name: 'No ID'})).toBeNull();
  });
});
