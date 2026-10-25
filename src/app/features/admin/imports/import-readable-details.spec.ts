import {TestBed} from '@angular/core/testing';
import {ImportValuesComponent} from './import-readable-details';
describe('Readable submitted product details',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 function render(values:Record<string,unknown>){const fixture=TestBed.createComponent(ImportValuesComponent);fixture.componentRef.setInput('values',JSON.stringify(values));fixture.detectChanges();return fixture;}
 it('renders string-encoded SKUs as labeled cards including inventory and product attributes',()=>{
  const f=render({name:'Submitted product',skus:JSON.stringify([{description:'Small pack',price:'1',quantity:100,is_default:true,inventory:{quantity:100,lowStockThreshold:5,warehouse_location:'Main warehouse'},product_attributes:[{name:'Size',attributes:[{value:'Small'}]}]},{description:'Large pack',price:'2',quantity:10}])});
  const text=f.nativeElement.textContent;expect(text).toContain('SKU 1');expect(text).toContain('SKU 2');expect(text).toContain('Main warehouse');expect(text).toContain('Low stock threshold');expect(text).toContain('Small');expect(text).toContain('Price');expect(text).not.toContain('"price"');expect(text).not.toContain('"inventory"');expect(f.nativeElement.querySelectorAll('.value-items > .value-item').length).toBeGreaterThanOrEqual(2);
 });
 it('keeps zero quantities and false flags visible in normal language',()=>{const f=render({isActive:'false',skus:JSON.stringify([{price:0,quantity:0,is_default:false}])});const text=f.nativeElement.textContent;expect(text).toContain('No');expect(text).toContain('0');expect(text).not.toContain('false');});
 it('omits identifiers at every level while preserving business values',()=>{const f=render({id:'private-request-id',subCategoryId:'987654',name:'Product name',skus:JSON.stringify([{id:'private-sku-id',price:12,quantity:5,product_attributes:[{id:'private-attribute-id',name:'Size',attributes:[{id:88,value:'Large'}]}]}])});const text=f.nativeElement.textContent;for(const value of ['private-request-id','987654','private-sku-id','private-attribute-id'])expect(text).not.toContain(value);expect(text).toContain('Product name');expect(text).toContain('Large');expect(text).toContain('12');});
 it('renders supplied text safely without interpreting markup',()=>{const f=render({description:'<img src=x onerror=alert(1)>',skus:'[]'});expect(f.nativeElement.querySelector('img')).toBeNull();expect(f.nativeElement.textContent).toContain('<img');expect(f.nativeElement.textContent).toContain('None');});
});
