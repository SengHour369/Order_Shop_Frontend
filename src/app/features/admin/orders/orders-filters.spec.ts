import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {OrdersPage} from './orders.page';
import {AdminApi} from '../api/admin.api';
describe('Complete admin order filters',()=>{
 it('finds matching orders beyond the first page and resets pagination when cleared',()=>{const records=Array.from({length:24},(_,i)=>({id:i+1,order_number:'ORD-'+(i+1),paymentMethod:i<12?'ABA':'BAKONG',order_date:'2026-10-25T10:00:00',status:'PENDING'}));const api={allOrders:vi.fn(()=>of(records)),ordersSummary:()=>of({totalOrders:24}),orders:vi.fn(()=>of({items:records.slice(0,10),total:24,pages:3}))};TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AdminApi,useValue:api}]});const page=TestBed.runInInjectionContext(()=>new OrdersPage());page.paymentMethod='BAKONG';page.date='2026-10-25';page.applyFilters();expect(page.total()).toBe(12);expect(page.pages()).toBe(2);expect(page.visible()[0]['id']).toBe(13);page.goto(2);expect(page.visible().map(row=>row['id'])).toEqual([23,24]);page.clearFilters();expect(page.page).toBe(1);expect(api.orders).toHaveBeenCalledWith(1,'',10,false);expect(page.total()).toBe(24);});
});
