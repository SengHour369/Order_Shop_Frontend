import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CancelOrderDialog } from './cancel-order-dialog';
import { OrdersApi } from '../orders.api';
import { Order } from '../../../core/api/models';
import { LanguageService } from '../../../core/i18n/language.service';
const pending:Order={id:1,order_number:'ORD-1',status:'PENDING',order_date:'2026-10-12T10:00:00',total_amount:50,customer_id:1,shipping_address_id:1};
describe('Cancel order dialog',()=>{
  let cancel:ReturnType<typeof vi.fn>;
  beforeEach(()=>{
    cancel=vi.fn(()=>of({...pending,status:'CANCELLED'}));
    TestBed.configureTestingModule({providers:[{provide:OrdersApi,useValue:{cancel}}]});
    TestBed.inject(LanguageService).setLanguage('en');
  });
  function setup(){
    const fixture=TestBed.createComponent(CancelOrderDialog);fixture.componentRef.setInput('order',pending);fixture.detectChanges();
    const dialog=fixture.nativeElement.querySelector('dialog');
    dialog.showModal=vi.fn();dialog.close=vi.fn();
    return {fixture,page:fixture.componentInstance,dialog};
  }
  it('renders five reasons, bounded notes and the confirmation actions',()=>{
    const {fixture,page,dialog}=setup();page.open();
    expect(dialog.showModal).toHaveBeenCalled();expect(fixture.nativeElement.querySelectorAll('input[type=radio]')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('textarea').maxLength).toBe(500);
    expect(fixture.nativeElement.textContent).toContain('Keep Order');
  });
  it('sends selected reason and trimmed notes and emits only the authoritative response',()=>{
    const {page,dialog}=setup();const emitted=vi.fn();page.cancelled.subscribe(emitted);page.reason='BETTER_PRICE';page.details='  A lower price  ';page.submit();
    expect(cancel).toHaveBeenCalledWith(1,'BETTER_PRICE','A lower price');expect(emitted).toHaveBeenCalledWith({...pending,status:'CANCELLED'});expect(dialog.close).toHaveBeenCalled();
  });
  it('blocks duplicate submissions and closing while processing',()=>{
    const stream=new Subject<Order>();cancel.mockReturnValue(stream);const {page,dialog}=setup();page.submit();page.submit();const event={preventDefault:vi.fn()} as unknown as Event;page.close(event);
    expect(cancel).toHaveBeenCalledTimes(1);expect(dialog.close).not.toHaveBeenCalled();expect(event.preventDefault).toHaveBeenCalled();
    stream.next({...pending,status:'CANCELLED'});expect(page.busy()).toBe(false);
  });
  it('retains form and open dialog after a rejected cancellation',()=>{
    cancel.mockReturnValueOnce(throwError(()=>({error:{message:'Only pending orders can be cancelled'}})));const {page,dialog}=setup();page.reason='OTHER';page.details='Please cancel';page.submit();
    expect(page.error()).toContain('Only pending');expect(page.reason).toBe('OTHER');expect(page.details).toBe('Please cancel');expect(dialog.close).not.toHaveBeenCalled();expect(page.busy()).toBe(false);page.submit();expect(cancel).toHaveBeenCalledTimes(2);
  });
  it('does not cancel shipped orders or invalid form values',()=>{
    const {page,fixture}=setup();page.reason='invalid';page.submit();page.reason='OTHER';page.details='a'.repeat(501);page.submit();fixture.componentRef.setInput('order',{...pending,status:'SHIPPED'});page.details='';page.submit();expect(cancel).not.toHaveBeenCalled();
  });
  it('keeps the order when dismissed and resets the form when reopened',()=>{
    const {page,dialog}=setup();page.reason='OTHER';page.details='abc';page.close();expect(dialog.close).toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled();page.open();expect(page.reason).toBe('CHANGED_MIND');expect(page.details).toBe('');
  });
  it('renders Khmer reason labels',()=>{
    const {fixture}=setup();TestBed.inject(LanguageService).setLanguage('km');fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('មូលហេតុនៃការលុបចោល');
  });
});
