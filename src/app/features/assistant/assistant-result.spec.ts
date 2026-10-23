import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AssistantResult } from './assistant-result';
import { PermissionService } from '../../core/auth/permission.service';

describe('Chat result UI',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideRouter([]),{provide:PermissionService,useValue:{allows:()=>true}}]}));
 afterEach(()=>TestBed.resetTestingModule());
 function render(data:unknown,intent='',admin=false){const f=TestBed.createComponent(AssistantResult);f.componentRef.setInput('data',data);f.componentRef.setInput('intent',intent);f.componentRef.setInput('administrator',admin);f.detectChanges();return f;}
 it('renders order summary as visible metric tiles including zero counts without a JSON disclosure',()=>{const f=render([{status:'PENDING',count:7},{status:'CANCELLED',count:0}],'ADMIN_ORDER_SUMMARY',true);expect(f.nativeElement.textContent).toContain('Order Summary');expect(f.nativeElement.querySelectorAll('.metric-grid article')).toHaveLength(2);expect(f.nativeElement.textContent).toContain('Pending');expect(f.nativeElement.textContent).toContain('0');expect(f.nativeElement.querySelector('pre,details')).toBeNull();});
 it('formats nested records, amounts and encoded fields without exposing secrets or markup',()=>{const f=render({data:{order_number:'ORD-1',total_amount:12.5,status:'FAILED',apiToken:'private-key',items:[{name:'<img src=x onerror=alert(1)>',quantity:2}],valuesJson:'{"quantity":3}'},code:200},'ORDER_GET');expect(f.nativeElement.textContent).toContain('$12.50');expect(f.nativeElement.textContent).toContain('Quantity');expect(f.nativeElement.textContent).not.toContain('private-key');expect(f.nativeElement.querySelector('img,pre')).toBeNull();expect(f.nativeElement.querySelector('.negative')?.textContent).toBe('Failed');expect(f.nativeElement.textContent).not.toContain('{"quantity"');});
 it('opens a customer order inside chat without sending them to admin pages',()=>{const f=render([{id:12,order_number:'ORD-12',status:'PENDING',total_amount:10}],'ORDER_LIST');const open=vi.fn();f.componentInstance.openRecord.subscribe(open);f.nativeElement.querySelector('button').click();expect(open).toHaveBeenCalledWith(12);expect(f.nativeElement.querySelector('a[href^="/admin"]')).toBeNull();});
 it('links administrator order cards to the existing order screen',()=>{const f=render([{id:12,order_number:'ORD-12',status:'PENDING'}],'ADMIN_ORDER_LIST',true);expect(f.nativeElement.querySelector('a').getAttribute('href')).toBe('/admin/orders/12');});
 it('shows an explicit empty state instead of empty JSON',()=>{const f=render([],'INVENTORY_LOW_STOCK',true);expect(f.nativeElement.textContent).toContain('No records found');});
});
