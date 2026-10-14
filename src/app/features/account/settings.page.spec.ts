import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { SettingsPage } from './settings.page';
import { ProfileApi } from './profile.api';
import { AddressesApi } from '../addresses/addresses.api';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
const profile={id:7,username:'shopper',email:'shopper@example.com',fullName:'Shopper',phone:'+85512345678',birthdate:'1998-01-15',image:'',status:'ACT'};
describe('Customer profile settings',()=>{
 let current:ReturnType<typeof vi.fn>,save:ReturnType<typeof vi.fn>,session:ReturnType<typeof signal<any>>;
 beforeEach(()=>{session=signal({username:'shopper'});current=vi.fn(()=>of(profile));save=vi.fn((body)=>of({...profile,...body}));TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{session}},{provide:ProfileApi,useValue:{current,save}},{provide:AddressesApi,useValue:{list:()=>of([{id:1,is_default:true,address_line1:'123 Street',city:'Phnom Penh',country:'Cambodia'}])}}]});TestBed.inject(LanguageService).setLanguage('en');});
 function setup(){const f=TestBed.createComponent(SettingsPage);f.detectChanges();return {f,page:f.componentInstance};}
 it('loads authoritative details and the primary address',()=>{const {f,page}=setup();expect(page.fullName).toBe('Shopper');expect(f.nativeElement.textContent).toContain('123 Street');expect(f.nativeElement.querySelector('input[type=email]').disabled).toBe(true);expect(page.dirty()).toBe(false);});
 it('saves permitted fields and blocks duplicate requests',()=>{const pending=new Subject<any>();save.mockReturnValue(pending);const {page}=setup();page.fullName='Updated';page.save();page.save();expect(save).toHaveBeenCalledTimes(1);expect(save).toHaveBeenCalledWith({fullName:'Updated',phone:profile.phone,birthdate:profile.birthdate});expect(page.profile()?.fullName).toBe('Shopper');pending.next({...profile,fullName:'Updated'});expect(page.dirty()).toBe(false);expect(page.message()).toBe('Profile saved.');});
 it('retains edits after a failed save',()=>{save.mockReturnValue(throwError(()=>({error:{message:'Phone number is already in use'}})));const {page}=setup();page.phone='+85599999999';page.save();expect(page.phone).toBe('+85599999999');expect(page.error()).toBe('Phone number is already in use');expect(page.dirty()).toBe(true);});
 it('does not submit invalid data or guest requests',()=>{const {page}=setup();page.phone='abc';page.save();expect(save).not.toHaveBeenCalled();session.set(null);page.phone='+85599999999';page.save();expect(save).not.toHaveBeenCalled();});
 it('does not call APIs while signed out',()=>{session.set(null);const {f}=setup();expect(current).not.toHaveBeenCalled();expect(f.nativeElement.querySelector('form')).toBeNull();});
 it('shows language selection and honest unavailable photo controls',()=>{const {f,page}=setup();expect(f.nativeElement.textContent).toContain('Photo storage is not available yet.');expect(f.nativeElement.querySelector('input[type=file]')).toBeNull();f.nativeElement.querySelectorAll('.profile-sections button')[1].click();f.detectChanges();expect(f.nativeElement.querySelector('app-language-select')).not.toBeNull();});
});

