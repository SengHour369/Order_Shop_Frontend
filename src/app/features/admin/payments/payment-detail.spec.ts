import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { PaymentDetailPage } from './payments.page';

describe('Payment detail authoritative status', () => {
  it('preserves refunded and unknown states without presenting them as pending or successful', () => {
    const read = vi.fn(() => of({ id: 4, order_id: 8, status: 'REFUNDED', currency: 'KHR', amount: 4100 }));
    TestBed.configureTestingModule({ providers: [
      { provide: AdminApi, useValue: { paymentByOrder: read, order: () => of(null) } },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '8' })) } },
    ] });
    const page = TestBed.runInInjectionContext(() => new PaymentDetailPage());
    expect(read).toHaveBeenCalledWith(8);
    expect(page.row()?.['status']).toBe('REFUNDED');
    expect(page.paymentTone(page.row()!)).toBe('');
    expect(page.paymentTone({ status: 'UNKNOWN' })).toBe('');
    expect(page.paymentTone({ status: 'SUCCESS' })).toBe('on');
    expect(page.amount(page.row()!)).toBe('4,100.00');
    expect(page.amount({})).toBe('—');
    expect(page.timeline({status:'PENDING',createdAt:'2026-10-25T10:00:00',updated_at:'2026-10-25T10:01:00'}).map(event=>event.complete)).toEqual([true,false]);
    expect(page.timeline({status:'REFUNDED'})).toEqual([]);
    expect(page.records({},'events')).toEqual([]);
    page.load();
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('loads the associated order and preserves payment details if order access fails', () => {
    const order = vi.fn(() => of({id:8,status:'CONFIRMED',currency:'KHR',total_amount:4100}));
    TestBed.configureTestingModule({providers:[
      {provide:AdminApi,useValue:{paymentByOrder:()=>of({id:4,order_id:8,status:'COMPLETED'}),order}},
      {provide:ActivatedRoute,useValue:{paramMap:of(convertToParamMap({id:'8'}))}},
    ]});
    const page=TestBed.runInInjectionContext(()=>new PaymentDetailPage());
    expect(order).toHaveBeenCalledWith(8);expect(page.order()?.['status']).toBe('CONFIRMED');
    order.mockReturnValue(throwError(()=>({status:403})));
    page.load();expect(page.order()).toBeNull();expect(page.row()?.['id']).toBe(4);expect(page.accessDenied()).toBe(false);
  });

});
