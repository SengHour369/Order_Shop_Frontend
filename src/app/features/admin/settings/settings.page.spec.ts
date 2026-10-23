import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminSettingsPage } from './settings.page';
import { AdminApi } from '../api/admin.api';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionService } from '../../../core/auth/permission.service';

describe('Settings access', () => {
  const settings = {storeName:'Shop',email:'shop@example.test',phone:'',address:'',timezone:'Asia/Phnom_Penh'};
  function create(role: string) {
    const api = {settings: vi.fn(() => of(settings)), saveSettings: vi.fn(() => of(settings))};
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide: AdminApi, useValue: api},
      {provide: AuthService, useValue: {session: () => ({role})}},
      {provide: PermissionService, useValue: {has: () => false}},
    ]});
    const fixture = TestBed.createComponent(AdminSettingsPage);
    fixture.detectChanges();
    return {fixture, api};
  }
  it('does not request guest settings without their separate permission', () => {
    const {fixture} = create('ADMIN');
    expect(fixture.nativeElement.querySelector('app-storefront-access-settings')).toBeNull();
    expect(fixture.componentInstance.accessDenied()).toBe(false);
  });
  it('allows super admins to save store settings', () => {
    const {fixture, api} = create('SUPER_ADMIN');
    fixture.componentInstance.save();
    expect(api.saveSettings).toHaveBeenCalledWith(settings);
  });
  it('keeps managers read only', () => {
    const {fixture, api} = create('MANAGER');
    fixture.componentInstance.save();
    expect(api.saveSettings).not.toHaveBeenCalled();
  });
});
