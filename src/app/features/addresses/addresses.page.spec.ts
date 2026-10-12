import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AddressesPage } from './addresses.page';
import { AddressesApi } from './addresses.api';
import { AuthService } from '../../core/auth/auth.service';
import { Address } from '../../core/api/models';
import { LanguageService } from '../../core/i18n/language.service';
describe('Customer addresses',()=>{
 const home:Address={id:1,address_line1:'#123, Street 271',city:'Phnom Penh',country:'Cambodia',zip_code:'120101',is_default:true};
 const other:Address={...home,id:2,address_line1:'#45, National Road 6',is_default:false};
 let list:ReturnType<typeof vi.fn>; let update:ReturnType<typeof vi.fn>; let create:ReturnType<typeof vi.fn>; let remove:ReturnType<typeof vi.fn>;
 beforeEach(()=>{
  list=vi.fn(()=>of([home,other])); update=vi.fn(()=>of(other)); create=vi.fn(()=>of(other)); remove=vi.fn(()=>of(null));
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AddressesApi,useValue:{list,update,create,remove}},{provide:AuthService,useValue:{session:signal({id:1,username:'Customer'})}}]});
  TestBed.inject(LanguageService).setLanguage('en');
 });
 it('renders real address fields and the default selection',()=>{
  const fixture=TestBed.createComponent(AddressesPage); fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.saved-address')).toHaveLength(2);
  expect(fixture.nativeElement.querySelectorAll('[aria-checked=true]')).toHaveLength(1);
  expect(fixture.nativeElement.textContent).toContain('#45, National Road 6');
  expect(fixture.nativeElement.textContent).not.toContain('+855');
 });
 it('uses an existing update and reloads authoritative defaults without changing local flags early',()=>{
  const page=TestBed.createComponent(AddressesPage).componentInstance; const response=new Subject<Address>(); update.mockReturnValueOnce(response);
  page.makeDefault(other); page.makeDefault(other); expect(update).toHaveBeenCalledTimes(1);
  expect(page.addresses()[0].is_default).toBe(true); expect(page.addresses()[1].is_default).toBe(false);
  list.mockReturnValueOnce(of([{...home,is_default:false},{...other,is_default:true}])); response.next({...other,is_default:true});response.complete();
  expect(update).toHaveBeenCalledWith(2,{address_line1:other.address_line1,city:other.city,country:other.country,zip_code:other.zip_code,is_default:true});
  expect(page.addresses()[1].is_default).toBe(true);
 });
 it('preserves the previous default and displays failure when the API fails',()=>{
  update.mockReturnValueOnce(throwError(()=>new Error('Unable to update')));
  const fixture=TestBed.createComponent(AddressesPage);fixture.detectChanges();
  fixture.nativeElement.querySelectorAll('.address-radio')[1].click();fixture.detectChanges();
  expect(fixture.componentInstance.error()).toBe('Unable to update');
  expect(fixture.nativeElement.querySelectorAll('.address-radio')[1].getAttribute('aria-checked')).toBe('false');
 });
 it('requires explicit address deletion confirmation and refreshes after deletion',()=>{
  const page=TestBed.createComponent(AddressesPage).componentInstance;page.remove(2);expect(remove).not.toHaveBeenCalled();
  page.deleteId.set(2);list.mockReturnValueOnce(of([home]));page.remove(2);
  expect(remove).toHaveBeenCalledWith(2);expect(page.addresses()).toEqual([home]);expect(page.deleteId()).toBe(null);
 });
 it('opens dedicated add and edit routes',()=>{
  const page=TestBed.createComponent(AddressesPage).componentInstance;
  const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  page.open(); expect(navigate).toHaveBeenCalledWith(['/account/addresses/add']);
  page.open(other); expect(navigate).toHaveBeenCalledWith(['/account/addresses',2,'edit']);
 });
});
