import {TestBed} from '@angular/core/testing';
import {ImportValuesComponent} from './import-readable-details';
const env=(globalThis as unknown as {process?:{env:Record<string,string|undefined>}}).process?.env??{};
const token=env['ESHOP_TEST_TOKEN'],id=env['ESHOP_TEST_REQUEST_ID'];
describe.skipIf(!token||!id)('Submitted request details over real HTTPS',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 it('shows the actual saved SKU payload as readable fields without raw JSON',async()=>{
  const base=env['ESHOP_TEST_BASE_URL']??'https://localhost:8443';expect(new URL(base).protocol).toBe('https:');
  const response=await fetch(base+'/api/ai/imports/'+encodeURIComponent(id!)+'/preview?page=0&size=50',{headers:{Authorization:'Bearer '+token,Origin:base},redirect:'error'});expect(response.ok).toBe(true);
  const preview=await response.json();const row=preview.rows.content.find((r:{valuesJson:string})=>{try{return !!JSON.parse(r.valuesJson).skus;}catch{return false;}});expect(row).toBeTruthy();
  const values=JSON.parse(row.valuesJson);const skus=typeof values.skus==='string'?JSON.parse(values.skus):values.skus;expect(skus.length).toBeGreaterThan(0);
  const fixture=TestBed.createComponent(ImportValuesComponent);fixture.componentRef.setInput('values',row.valuesJson);fixture.detectChanges();
  const text=fixture.nativeElement.textContent;expect(text).toContain('SKU 1');expect(text).toContain('Price');expect(text).toContain('Quantity');expect(text).not.toContain('"product_attributes":');expect(text).not.toContain('"inventory":');if(skus[0].description)expect(text).toContain(skus[0].description);
 });
});
