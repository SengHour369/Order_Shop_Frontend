import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { NotificationsPage } from './notifications.page';
import { NotificationsApi } from './notifications.api';
import { Notice } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { CustomerStore } from '../../core/stores/customer.store';
import { LanguageService } from '../../core/i18n/language.service';
const notices:Notice[]=[
 {id:1,type:'ORDER_CREATED',resourceType:'ORDER',resourceId:'12',title:'Order created',message:'Your order was placed.',createdAt:'2026-10-12T10:00:00Z',read:false},
 {id:2,type:'PAYMENT_SUCCESS',title:'Payment verified',message:'Your payment was verified.',createdAt:'2026-10-11T10:00:00Z',read:false},
 {id:3,type:'AI_ACTION_COMPLETED',title:'Action completed',message:'Your action is ready.',createdAt:'2026-10-10T10:00:00Z',read:true},
];
describe('Notifications reference screen',()=>{
 let list:ReturnType<typeof vi.fn>,count:ReturnType<typeof vi.fn>,read:ReturnType<typeof vi.fn>,readAll:ReturnType<typeof vi.fn>;
 let session:ReturnType<typeof signal<any>>,unread:ReturnType<typeof signal<number|null>>;
 beforeEach(()=>{
  list=vi.fn(()=>of({content:notices,totalPages:2,totalElements:23}));count=vi.fn(()=>of({count:5}));read=vi.fn(()=>of(undefined));readAll=vi.fn(()=>of({updated:5}));session=signal({id:1});unread=signal<number|null>(null);
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{session}},{provide:CustomerStore,useValue:{unread}},{provide:NotificationsApi,useValue:{list,count,read,readAll}}]});TestBed.inject(LanguageService).setLanguage('en');
 });
 function setup(){const fixture=TestBed.createComponent(NotificationsPage);fixture.detectChanges();const dialog=fixture.nativeElement.querySelector('dialog');dialog.showModal=vi.fn();dialog.close=vi.fn();return {fixture,page:fixture.componentInstance,dialog};}
 it('renders five category tabs, real messages, unread dots and the server unread total',()=>{
  const {fixture}=setup();expect(fixture.nativeElement.querySelectorAll('.notices-tabs button')).toHaveLength(5);expect(fixture.nativeElement.querySelectorAll('.notice-row')).toHaveLength(3);expect(fixture.nativeElement.querySelectorAll('.notice-unread')).toHaveLength(2);expect(fixture.nativeElement.querySelector('h1').textContent).toContain('(5)');expect(fixture.nativeElement.textContent).toContain('Category counts and filters apply to this page.');
 });
 it('classifies by structured metadata and includes unknown events as system',()=>{
  const {page}=setup();expect(page.count('orders')).toBe(2);expect(page.count('system')).toBe(1);page.filter='orders';expect(page.filtered()).toHaveLength(2);
  expect(page.category({...notices[0],type:'PROMOTION',resourceType:''})).toBe('promotions');expect(page.category({...notices[0],type:'PASSWORD_CHANGED',resourceType:''})).toBe('account');expect(page.category({...notices[0],type:'UNKNOWN',resourceType:''})).toBe('system');
 });
 it('marks an opened notification read only after server acknowledgment',()=>{
  const pending=new Subject<void>();read.mockReturnValue(pending);const {page,dialog}=setup();page.select(notices[0]);expect(dialog.showModal).toHaveBeenCalled();expect(page.notices()[0].read).toBe(false);expect(page.actionBusy()).toBe(true);pending.next();expect(page.notices()[0].read).toBe(true);expect(page.selected()?.read).toBe(true);expect(list).toHaveBeenCalledTimes(1);expect(count).toHaveBeenCalledTimes(2);
 });
 it('retains unread state and supports retry after read failure',()=>{
  read.mockReturnValueOnce(throwError(()=>({error:{message:'Try later'}})));const {page}=setup();page.select(notices[0]);expect(page.notices()[0].read).toBe(false);expect(page.actionError()).toBe('Try later');expect(page.actionBusy()).toBe(false);page.read(1);expect(page.notices()[0].read).toBe(true);
 });
 it('marks all read without reloading and blocks duplicate mutations',()=>{
  const pending=new Subject<{updated:number}>();readAll.mockReturnValue(pending);const {page}=setup();page.readAll();page.readAll();page.read(1);expect(readAll).toHaveBeenCalledTimes(1);expect(read).not.toHaveBeenCalled();expect(page.notices().some(n=>!n.read)).toBe(true);count.mockReturnValueOnce(of({count:0}));pending.next({updated:5});expect(page.notices().every(n=>n.read)).toBe(true);expect(unread()).toBe(0);expect(list).toHaveBeenCalledTimes(1);
 });
 it('preserves unread state when mark all fails',()=>{
  readAll.mockReturnValueOnce(throwError(()=>new Error('Offline')));const {page}=setup();page.readAll();expect(page.notices().filter(n=>!n.read)).toHaveLength(2);expect(page.actionError()).toBe('Offline');expect(page.actionBusy()).toBe(false);
 });
 it('keeps pagination consistent on errors and validates boundaries',()=>{
  const {page}=setup();page.goto(0);page.goto(3);expect(list).toHaveBeenCalledTimes(1);list.mockReturnValueOnce(throwError(()=>new Error('Unavailable')));page.goto(2);expect(page.page).toBe(1);expect(page.notices()).toEqual(notices);list.mockReturnValueOnce(of({content:[],totalPages:2,totalElements:23}));page.goto(2);expect(page.page).toBe(2);
 });
 it('uses safe resource-specific links and never trusts arbitrary destinations',()=>{
  const {page}=setup();expect(page.destination(notices[0])).toEqual(['/account/orders','12']);expect(page.destination({...notices[0],resourceId:'https://example.com'})).toBe(null);expect(page.destination({...notices[0],resourceType:'RETURN',resourceId:'RET-123'})).toEqual(['/account/returns','RET-123']);expect(page.destination({...notices[0],resourceType:'PRODUCT',resourceId:'3'})).toEqual(['/shop','3']);
 });
 it('formats relative timestamps using the selected language',()=>{
  const {page,fixture}=setup();page.clock.set(Date.parse('2026-10-12T12:00:00Z'));expect(page.relativeTime(notices[0].createdAt)).toBe('2 hours ago');expect(page.relativeTime('bad')).toBe('Date unavailable');TestBed.inject(LanguageService).setLanguage('km');fixture.detectChanges();expect(page.relativeTime(notices[0].createdAt)).not.toBe('2 hours ago');expect(fixture.nativeElement.textContent).toContain('ការជូនដំណឹង');
 });
 it('does not load or mutate notification data while signed out',()=>{
  session.set(null);const {page,fixture}=setup();page.readAll();page.read(1);expect(list).not.toHaveBeenCalled();expect(readAll).not.toHaveBeenCalled();expect(read).not.toHaveBeenCalled();expect(fixture.nativeElement.querySelector('.notices-list')).toBe(null);
 });
 it('uses an unknown count if the unread-count endpoint fails',()=>{
  count.mockReturnValueOnce(throwError(()=>new Error('Unavailable')));const {page}=setup();expect(unread()).toBe(null);expect(page.notices()).toHaveLength(3);
 });
});
