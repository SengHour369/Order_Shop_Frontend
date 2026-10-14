import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { NotificationSettingsPage } from './notification-settings.page';
import { NotificationsApi } from './notifications.api';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
describe('Notification settings',()=>{
 let preferences:ReturnType<typeof vi.fn>,setPreferences:ReturnType<typeof vi.fn>,session:ReturnType<typeof signal<any>>;
 beforeEach(()=>{session=signal({id:7});preferences=vi.fn(()=>of({aiEmail:false}));setPreferences=vi.fn(()=>of(undefined));TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{session}},{provide:NotificationsApi,useValue:{preferences,setPreferences}}]});TestBed.inject(LanguageService).setLanguage('en');});
 function setup(){const f=TestBed.createComponent(NotificationSettingsPage);f.detectChanges();return {f,page:f.componentInstance};}
 it('reflects persisted email and exposes unsupported controls as disabled',()=>{const {f,page}=setup();expect(page.email).toBe(false);expect(f.nativeElement.querySelectorAll('input[role=switch]:not(:disabled)')).toHaveLength(1);expect(f.nativeElement.querySelectorAll('.type-list .preference-row')).toHaveLength(6);expect(f.nativeElement.textContent).toContain('Category controls are not supported');});
 it('saves after acknowledgment and blocks duplicate saves',()=>{const pending=new Subject<void>();setPreferences.mockReturnValue(pending);const {page}=setup();page.email=true;page.save();page.save();expect(setPreferences).toHaveBeenCalledTimes(1);expect(page.saved()).toBe(false);pending.next();expect(page.saved()).toBe(true);expect(page.message()).toBe('Notification preferences saved.');});
 it('keeps failed preferences dirty for retry',()=>{setPreferences.mockReturnValueOnce(throwError(()=>new Error('Unavailable')));const {page}=setup();page.email=true;page.save();expect(page.saved()).toBe(false);expect(page.email).toBe(true);page.save();expect(page.saved()).toBe(true);});
 it('allows retry after initial load failure without enabling save',()=>{preferences.mockReturnValueOnce(throwError(()=>new Error('Unavailable')));const {page}=setup();page.email=true;page.save();expect(setPreferences).not.toHaveBeenCalled();page.load();expect(page.ready()).toBe(true);expect(page.email).toBe(false);});
 it('does not load or save guest preferences',()=>{session.set(null);const {f,page}=setup();page.save();expect(preferences).not.toHaveBeenCalled();expect(setPreferences).not.toHaveBeenCalled();expect(f.nativeElement.querySelector('form')).toBeNull();});
});
