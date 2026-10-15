import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AdminApi, Row } from '../api/admin.api';
import { TransactionsPage, transactionCsv, transactionCustomer, transactionDate } from './transactions.page';

const records: Row[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1, transaction_no: `TX-${i + 1}`, order_id: 100 + i,
  customer_name: i === 23 ? 'Sarah Thompson' : 'Michael Anderson',
  customer_email: i === 23 ? 'sarah@example.test' : 'michael@example.test',
  payment_method: i === 23 ? 'PayPal' : 'Visa',
  status: i === 23 ? 'PENDING' : 'SUCCESS', amount: 10,
  created_at: i === 23 ? '2026-10-15T23:59:59' : '2026-10-14T10:00:00',
}));
function setup(customer = '') {
  const api = { allTransactions: vi.fn(() => of(records)) };
  TestBed.configureTestingModule({ providers: [provideRouter([]),
    { provide: AdminApi, useValue: api },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ customer })) } },
  ] });
  const page = TestBed.runInInjectionContext(() => new TransactionsPage());
  return { page, api };
}

describe('Transactions list', () => {
  it('combines search, status, method and inclusive dates before pagination', () => {
    const { page } = setup();
    page.goto(3);
    page.search = 'sarah@example.test'; page.method = 'PayPal'; page.status = 'PENDING';
    page.from = page.to = '2026-10-15'; page.apply();
    expect(page.page()).toBe(1);
    expect(page.total()).toBe(1);
    expect(page.visible()[0]['id']).toBe(24);
    expect(page.summary().map(item => item.value)).toEqual(['1', '0', '1', '0', '$10.00']);
  });
  it('calculates totals from every API record and resets filters and page size', () => {
    const { page, api } = setup('7');
    expect(api.allTransactions).toHaveBeenCalledWith('7');
    expect(page.summary().map(item => item.value)).toEqual(['24', '23', '1', '0', '$240.00']);
    page.goto(3); expect(page.visible()).toHaveLength(4);
    page.setSize(20); expect(page.page()).toBe(1); expect(page.visible()).toHaveLength(20);
    page.search = 'missing'; page.apply(); expect(page.range()).toBe('Showing 0 results');
    page.reset(); expect(page.total()).toBe(24);
  });
  it('rejects reversed dates without changing the applied result set', () => {
    const { page } = setup();
    page.from = '2026-10-16'; page.to = '2026-10-15'; page.apply();
    expect(page.error()).toContain('end date'); expect(page.total()).toBe(24);
  });
  it('cancels an old load and clears stale records when reloading', () => {
    const { page, api } = setup();
    const first = new Subject<Row[]>(); const second = new Subject<Row[]>();
    api.allTransactions.mockReturnValueOnce(first).mockReturnValueOnce(second);
    page.load(); expect(page.rows()).toEqual([]);
    page.load(); first.next(records); expect(page.rows()).toEqual([]);
    second.next([records[23]]); expect(page.total()).toBe(1); expect(page.busy()).toBe(false);
  });
  it('uses available customer fields and handles missing or invalid dates', () => {
    expect(transactionCustomer({ customer: { name: 'Sarah', email: 's@example.test' } })).toEqual({ name: 'Sarah', email: 's@example.test' });
    expect(transactionCustomer({ customer_id: 7 }).name).toBe('7');
    expect(transactionDate({ created_at: 'bad date' })).toBeNull();
    expect(transactionDate({})).toBeNull();
  });
  it('exports all filtered pages with CSV escaping and formula protection', () => {
    const { page } = setup();
    const csv = transactionCsv(page.filtered());
    expect(csv.split('\r\n')).toHaveLength(25);
    expect(csv).toContain('TX-24');
    expect(transactionCsv([{ customer_name: '=SUM(1)', transaction_no: 'TX-"quoted"' }])).toContain('"\'=SUM(1)"');
    expect(transactionCsv([{ transaction_no: 'TX-"quoted"' }])).toContain('"TX-""quoted"""');
  });
  it('renders the five cards and transaction detail links', async () => {
    setup();
    const fixture = TestBed.createComponent(TransactionsPage);
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.transaction-stat')).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(fixture.nativeElement.querySelector('.view-transaction').getAttribute('href')).toBe('/admin/transactions/1');
  });
});
