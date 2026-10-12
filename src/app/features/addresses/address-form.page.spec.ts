import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AddressFormPage } from './address-form.page';
import { AddressesApi } from './addresses.api';
import { AuthService } from '../../core/auth/auth.service';
import { Address } from '../../core/api/models';
import { LanguageService } from '../../core/i18n/language.service';
const record:Address={id:5,label:'Office',recipient_name:'Customer',phone_number:'+85512345678',address_line1:'#123, Street 271',city:'Phnom Penh',district:'Chamkar Mon',commune:'Tuol Tumpung Ti Muoy',country:'Cambodia',zip_code:'120101',additional_information:'Floor 2',is_default:true};
describe('Address form',()=>{
 let create:ReturnType<typeof vi.fn>; let update:ReturnType<typeof vi.fn>; let detail:ReturnType<typeof vi.fn>; let params:BehaviorSubject<ReturnType<typeof convertToParamMap>>;
 beforeEach(()=>{
  create=vi.fn(body=>of({...body,id:5}));update=vi.fn((id,body)=>of({...body,id}));detail=vi.fn(()=>of([record]));params=new BehaviorSubject(convertToParamMap({}));
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{paramMap:params}},{provide:AddressesApi,useValue:{create,update,list:detail}},{provide:AuthService,useValue:{session:signal({id:1,username:'Customer'})}}]});
  TestBed.inject(LanguageService).setLanguage('en'); vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
 });
 function fill(page:AddressFormPage) { const {id,...body}=record;page.form={...body};page.phone='12 345 678'; }
 it('renders the label choices and all required delivery fields',()=>{
  const fixture=TestBed.createComponent(AddressFormPage);fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.address-labels button')).toHaveLength(4);
  expect(fixture.nativeElement.querySelectorAll('input[required],textarea[required],select[required]')).toHaveLength(8);
  const buttons=fixture.nativeElement.querySelectorAll('.address-labels button');buttons[1].click();fixture.detectChanges();expect(fixture.componentInstance.form.label).toBe('Office');expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
 });
 it('validates missing fields and malformed phone before sending a request',()=>{
  const page=TestBed.createComponent(AddressFormPage).componentInstance;page.save();expect(create).not.toHaveBeenCalled();
  fill(page);page.phone='abc123';page.save();expect(create).not.toHaveBeenCalled();expect(page.error()).toContain('valid details');
 });
 it('creates a normalized address and navigates only after all fields persist',()=>{
  const page=TestBed.createComponent(AddressFormPage).componentInstance;fill(page);page.form.recipient_name=' Customer ';
  const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);page.save();
  expect(create).toHaveBeenCalledWith(expect.objectContaining({phone_number:'+85512345678',recipient_name:'Customer',district:'Chamkar Mon',label:'Office'}));
  expect(navigate).toHaveBeenCalledWith(['/account/addresses']);
 });
 it('loads an existing address and updates it without creating a new record',()=>{
  params.next(convertToParamMap({id:'5'}));const page=TestBed.createComponent(AddressFormPage).componentInstance;
  expect(detail).toHaveBeenCalled();expect(page.phone).toBe('12345678');expect(page.form.label).toBe('Office');page.save();
  expect(update).toHaveBeenCalledWith(5,expect.objectContaining({additional_information:'Floor 2'}));expect(create).not.toHaveBeenCalled();
 });
 it('retains entered values after an API failure and prevents duplicate submissions',()=>{
  const page=TestBed.createComponent(AddressFormPage).componentInstance;fill(page);const pending=new Subject<Address>();create.mockReturnValueOnce(pending);
  page.save();page.save();expect(create).toHaveBeenCalledTimes(1);pending.error(new Error('Connection lost'));expect(page.busy()).toBe(false);expect(page.form.recipient_name).toBe('Customer');expect(page.error()).toBe('Connection lost');
 });
 it('detects an old backend that silently drops the new delivery fields',()=>{
  const page=TestBed.createComponent(AddressFormPage).componentInstance;fill(page);create.mockReturnValueOnce(of({id:7,address_line1:record.address_line1,city:record.city,zip_code:record.zip_code,country:record.country,is_default:true}));
  const navigate=vi.spyOn(TestBed.inject(Router),'navigate');page.save();expect(navigate).not.toHaveBeenCalled();expect(page.id).toBe(7);expect(page.error()).toContain('server needs an update');
 });
 it('blocks saving an address whose details failed to load',()=>{
  params.next(convertToParamMap({id:'5'}));detail.mockReturnValueOnce(throwError(()=>new Error('Unavailable')));
  const page=TestBed.createComponent(AddressFormPage).componentInstance;fill(page);page.save();expect(update).not.toHaveBeenCalled();expect(page.loaded).toBe(false);
 });
});


describe('Address access',()=>{
 it('does not load another account address by ID',()=>{
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{paramMap:of(convertToParamMap({id:'999'}))}},{provide:AddressesApi,useValue:{list:()=>of([record])}},{provide:AuthService,useValue:{session:signal({id:1,username:'Customer'})}}]});
  const page=TestBed.createComponent(AddressFormPage).componentInstance;
  expect(page.loaded).toBe(false);expect(page.error()).toContain('your account');
 });
});
