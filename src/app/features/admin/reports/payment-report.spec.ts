import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {ApiClient} from '../../../core/api/api-client';
import {PaymentReportPage} from './payment-report.page';
describe('Payment report',()=>{
 const rows=[{month:10,currency:'USD',method:'BAKONG',status:'COMPLETED',count:2,amount:20},{month:10,currency:'USD',method:'CARD',status:'COMPLETED',count:1,amount:10},{month:10,currency:'USD',method:'BAKONG',status:'REFUNDED',count:1,amount:5},{month:10,currency:'KHR',method:'BAKONG',status:'COMPLETED',count:1,amount:4100}];
 let get:ReturnType<typeof vi.fn>;
 beforeEach(()=>{get=vi.fn(()=>of({success:true,data:rows}));TestBed.configureTestingModule({providers:[{provide:ApiClient,useValue:{get}}]});});
 afterEach(()=>TestBed.resetTestingModule());
 function create(){return TestBed.runInInjectionContext(()=>new PaymentReportPage());}
 it('keeps currencies and refunds separate and calculates weighted averages',()=>{const page=create();expect(page.count()).toBe(3);expect(page.total()).toBe(30);expect(page.average()).toBe(10);expect(page.refunds()).toBe(5);expect(page.monthly()).toHaveLength(12);expect(page.monthly()[0].amount).toBe(0);expect(page.monthly()[9].amount).toBe(30);expect(page.methods().map(row=>row.amount)).toEqual([20,10]);page.currency='KHR';page.load();expect(page.total()).toBe(4100);expect(page.refunds()).toBe(0);});
 it('applies filters only on Apply and rejects invalid years',()=>{const page=create();const year=page.loadedYear();page.currency='KHR';page.year=1999;page.load();expect(get).toHaveBeenCalledTimes(1);expect(page.loadedYear()).toBe(year);expect(page.loadedCurrency()).toBe('USD');expect(page.error()).toContain('2000');});
 it('handles a zero-payment year without invalid chart geometry',()=>{get.mockReturnValue(of({success:true,data:[]}));const page=create();expect(page.total()).toBe(0);expect(page.average()).toBe(0);expect(page.ceiling()).toBe(1);expect(page.methods()).toEqual([]);expect(page.barHeight(0)).toBe(0);});
});
