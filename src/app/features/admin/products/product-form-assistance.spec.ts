import { parseProductInput, productNotes } from './product-form-assistance';
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

describe('Pasted Khmer product notes',()=>{
 it('recognizes broken Markdown tables and treats capsules as packaging, not inventory',()=>{
  const result=productNotes('ព័ត៌មានផលិតផល\n|   |\n| - |\nឈ្មោះ\n|   |\n| - |\nSOVIA-F\nម៉ាក\nSOVINA\nប្រភេទ\nអាហារបំប៉ន\nចំនួន\n15 គ្រាប់');
  expect(result?.name).toBe('SOVIA-F');expect(result?.description).toContain('15 គ្រាប់');expect(result?.quantity).toBeUndefined();expect(result?.price).toBeUndefined();
 });
 it('does not treat a general question as a product import',()=>{expect(productNotes('What is SOVIA-F used for?')).toBeNull();});
 it('extracts labeled rows without inventing missing values',()=>{expect(productNotes('| Product name | SOVIA-F |\n| Brand | SOVINA |\n| Price | unknown |')?.price).toBeUndefined();});
});

describe('Full supplement source notes',()=>{
 it('retains ingredients, uncertainty and warnings from broken Khmer tables for review',()=>{
  const notes=`## ព័ត៌មានលម្អិតអំពី SOVIA-F (SOVINA)
ឈ្មោះ
|   |
| - |
SOVIA-F
ម៉ាក
SOVINA
ប្រភេទ
អាហារបំប៉ន
ចំនួន
15 គ្រាប់ (Capsules)
ប្រទេសផលិត
មិនទាន់អាចបញ្ជាក់
### គ្រឿងផ្សំសំខាន់ៗ
Dong Quai Extract
Fish Collagen Peptide
Grape Seed Extract
Isolated Soy Protein
Alpha-Lipoic Acid
### ផលប៉ះពាល់ និងការប្រុងប្រយ័ត្ន
អ្នកអាលែកហ្ស៊ីត្រី ឬសណ្តែកសៀង គួរប្រុងប្រយ័ត្ន
កម្រិតប្រើប្រាស់
មិនទាន់ដឹង
[image](https://example.com/favicon)
+1`;
  const patch=productNotes(notes)!;
  expect(patch.name).toBe('SOVIA-F');expect(patch.skuDescription).toBe('15 គ្រាប់ (Capsules)');
  for(const text of ['Dong Quai Extract','Fish Collagen Peptide','Grape Seed Extract','Isolated Soy Protein','Alpha-Lipoic Acid','មិនទាន់អាចបញ្ជាក់','មិនទាន់ដឹង','អ្នកអាលែកហ្ស៊ីត្រី'])expect(patch.description).toContain(text);
  expect(patch.description).not.toContain('[image]');expect(patch.description).not.toContain('| - |');
  expect(patch.quantity).toBeUndefined();expect(patch.price).toBeUndefined();
 });
});
