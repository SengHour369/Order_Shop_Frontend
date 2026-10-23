import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { UserDetailPage } from './user-detail.page';
function setup(customerDetail = false) {
  const api = {
    userDetails: vi.fn(() => of({ id: 7, fullName: 'John Doe', email: 'john@example.test', status: 'ACT' })),
    userDetailsActivity: vi.fn(() => of({ items: [{ actorId: '7', action: 'LOGIN_SUCCESS' }, { actorId: '8', action: 'LOGIN_FAILED' }, { actorId:'8',resourceType:'USER',resourceId:'7',action:'UPDATE' }] })),
    requestUserPasswordReset: vi.fn(() => of({})),
  };
  TestBed.configureTestingModule({ providers: [{ provide: AdminApi, useValue: api }, { provide: ActivatedRoute, useValue: { snapshot: {data: {customerDetail}}, paramMap: of(convertToParamMap({ id: '7' })) } }] });
  return { page: TestBed.runInInjectionContext(() => new UserDetailPage()), api };
}
describe('User details', () => {
  afterEach(()=>TestBed.resetTestingModule());
  it('uses customer navigation and identity while loading the full real profile',()=>{
    const {page,api}=setup(true);
    expect(page.backLink()).toBe('/admin/customers');
    expect(page.formattedId()).toBe('CUST-000007');
    expect(api.userDetails).toHaveBeenCalledWith(7);
    expect(api.userDetailsActivity).toHaveBeenCalledWith(7);
  });
  it('includes actions on the selected user and filters unrelated activity', () => {
    const { page, api } = setup();
    expect(api.userDetailsActivity).toHaveBeenCalledWith(7);
    expect(page.activity()).toHaveLength(2);
    expect(page.names()).toEqual({ first: 'John', last: 'Doe' });
  });
  it('keeps the profile visible if audit lookup fails', () => {
    const { page, api } = setup();
    api.userDetailsActivity.mockReturnValue(throwError(() => new Error('Unavailable')));
    page.load(7);
    expect(page.user()?.['id']).toBe(7); expect(page.activityUnavailable()).toBe(true);
  });
  it('does not invent permissions, groups or session counts', () => {
    const { page } = setup();
    expect(page.groups()).toEqual([]); expect(page.permissions()).toEqual([]);
    expect(page.securityFields()).toContainEqual(['Session Active', '—']);
  });
  it('shows editor fields and actual security metadata',()=>{
    const {page}=setup();page.user.set({fullName:'John Doe',gender:'MALE',birthdate:'1990-05-15',jobTitle:'Sales Manager',twoFactorRequired:true,activeSessions:1,loginAttempts:0,language:'en-US'});
    expect(page.personalFields()).toContainEqual(['Gender','Male']);
    expect(page.personalFields()).toContainEqual(['Date of Birth','May 15, 1990']);
    expect(page.securityFields()).toContainEqual(['Session Active','1 active session']);
    expect(page.securityFields()).toContainEqual(['Two-Factor Authentication','Enabled']);
    expect(page.language()).toBe('English (US)');
  });
  it('shows a clear permission message without exposing internal API details', () => {
    const { page, api } = setup();
    api.userDetails.mockReturnValue(throwError(() => ({
      status: 403,
      error: { message: 'API not configured for permission check: GET /api/v1/user/43/details' },
    })));
    page.load(43);
    expect(page.user()).toBeNull();
    expect(page.error()).toContain('You do not have permission');
    expect(page.error()).not.toContain('/api/');
    expect(page.error()).not.toContain('API not configured');
    expect(page.busy()).toBe(false);
  });
  it('resets the selected account password', () => {
    const { page, api } = setup(); page.resetPassword();
    expect(api.requestUserPasswordReset).toHaveBeenCalledWith('john@example.test');
  });
});
