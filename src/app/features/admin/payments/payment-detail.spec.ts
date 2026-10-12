import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { PaymentDetailPage } from './payments.page';

describe('Payment detail authoritative status', () => {
  it('preserves refunded and unknown states without presenting them as pending or successful', () => {
    const read = vi.fn(() => of({ id: 4, order_id: 8, status: 'REFUNDED', currency: 'KHR', amount: 4100 }));
    TestBed.configureTestingModule({ providers: [
      { provide: AdminApi, useValue: { paymentByOrder: read } },
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
    page.load();
    expect(read).toHaveBeenCalledTimes(2);
  });
});
