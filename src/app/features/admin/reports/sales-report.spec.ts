import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {AdminApi} from '../api/admin.api';
import {SalesReportPage} from './sales-report.page';
const year=new Date().getFullYear();
const details={monthlyItems:[{month:3,items:3}],categories:[{name:'Shoes',amount:18,items:2},{name:'Clothing',amount:6,items:1}],categoriesAvailable:true,categoryBasis:'Recorded item sales grouped by current catalog category.'};
describe('Reference sales report',()=>{
 let http:HttpTestingController;let api:any;
 beforeEach(()=>{api={monthlyReport:vi.fn((_kind:string,selected:number)=>of(selected===year?[{month:3,count:1,amount:24,currency:'USD'}]:[{month:3,count:1,amount:20,currency:'USD'}]))};TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:AdminApi,useValue:api}]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 function create(fail=false){const f=TestBed.createComponent(SalesReportPage);const request=http.expectOne('/api/v1/orders/reports/sales-details?year='+year);expect(request.request.method).toBe('GET');if(fail)request.flush({},{status:503,statusText:'Unavailable'});else request.flush({data:details});f.detectChanges();return f;}
 it('uses real totals, category shares, item counts and twelve correctly zero-filled months',()=>{const f=create(),p=f.componentInstance;expect(p.total()).toBe(24);expect(p.orders()).toBe(1);expect(p.average()).toBe(24);expect(p.items()).toBe(3);expect(p.breakdown()).toHaveLength(12);expect(p.breakdown()[0].amount).toBe(0);expect(p.breakdown()[2].items).toBe(3);expect(p.growth('sales')).toBe(20);expect(p.percent(18)).toBe(75);expect(f.nativeElement.querySelectorAll('.sales-bar')).toHaveLength(12);expect(f.nativeElement.textContent).toContain('USD 24.00');});
 it('shows unavailable category/item data without replacing them with invented amounts',()=>{const f=create(true);expect(f.componentInstance.total()).toBe(24);expect(f.componentInstance.items()).toBeNull();expect(f.componentInstance.categories()).toEqual([]);expect(f.nativeElement.textContent).toContain('temporarily unavailable');});
 it('opens the selected month details rather than navigating to an unfiltered order list',()=>{const f=create();const dialog=f.nativeElement.querySelector('dialog');dialog.showModal=vi.fn();f.nativeElement.querySelectorAll('.view-details')[2].click();f.detectChanges();expect(dialog.showModal).toHaveBeenCalledOnce();expect(dialog.textContent).toContain('March');expect(dialog.textContent).toContain('USD 24.00');});
 it('does not request an invalid reporting year',()=>{const f=create();api.monthlyReport.mockClear();f.componentInstance.year=1999;f.componentInstance.load();expect(api.monthlyReport).not.toHaveBeenCalled();expect(f.componentInstance.error()).toContain('2000');});
});
