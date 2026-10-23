import { parseProductInput } from './product-form-assistance';
describe('Product form field assistance',()=>{
  it('extracts explicit follow-up fields without executing actions',()=>{
    expect(parseProductInput('set the name to Smart Watch Pro, price $1,199 and stock 100').patch).toEqual({name:'Smart Watch Pro',price:1199,quantity:100});
    expect(parseProductInput('submit and approve product').patch).toEqual({});
  });
  it('supports Khmer field labels',()=>{
    expect(parseProductInput('ឈ្មោះ នាឡិកា, តម្លៃ 199, ចំនួន 10').patch).toEqual({name:'នាឡិកា',price:199,quantity:10});
  });
  it('rejects invalid numeric values without silently converting or changing them',()=>{
    const result=parseProductInput('price $-25, stock 1.5, status approved');
    expect(result.patch).toEqual({});expect(result.issues).toHaveLength(3);
    expect(parseProductInput('stock 0').patch.quantity).toBe(0);
  });
});
