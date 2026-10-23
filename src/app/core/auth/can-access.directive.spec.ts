import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CanAccessDirective } from './can-access.directive';
import { PermissionService } from './permission.service';
@Component({ imports: [CanAccessDirective], template: `
  <button *appCan="'PRODUCT_VIEW'">View</button>
  <button *appCan="'PRODUCT_CREATE'">Create</button>
  <button *appCan="'PRODUCT_UPDATE'">Edit</button>
  <button *appCan="'PRODUCT_DELETE'">Delete</button>
  <button *appCan="['RETURN_VIEW', 'RETURN_APPROVE']">Approve</button>
  <button *appCanAny="['REFUND_PROCESS', 'REFUND_CANCEL']">Refund actions</button>
` })
class ActionButtons {}
describe('Buttons follow group permission grants', () => {
  const grants = signal<string[]>([]);
  beforeEach(() => {
    grants.set(['PRODUCT_VIEW']);
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: PermissionService, useValue: { has: (code: string) => grants().includes(code) } },
    ] });
  });
  afterEach(() => TestBed.resetTestingModule());
  it('renders only View for a View-only user, with no hidden mutation buttons', () => {
    const fixture = TestBed.createComponent(ActionButtons); fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('button'), (button: any) => button.textContent)).toEqual(['View']);
  });
  it('adds only granted actions and removes them when group permissions are revoked', () => {
    const fixture = TestBed.createComponent(ActionButtons); fixture.detectChanges();
    const labels = () => Array.from(fixture.nativeElement.querySelectorAll('button'), (button: any) => button.textContent);
    grants.set(['PRODUCT_VIEW', 'PRODUCT_DELETE']); fixture.detectChanges();
    expect(labels()).toEqual(['View', 'Delete']);
    grants.set(['PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE']); fixture.detectChanges();
    expect(labels()).toEqual(['View', 'Create', 'Edit']);
    grants.set([]); fixture.detectChanges(); expect(labels()).toEqual([]);
  });
  it('requires approval permission for Approve even when Returns View is granted', () => {
    const fixture = TestBed.createComponent(ActionButtons);
    grants.set(['RETURN_VIEW']); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    grants.set(['RETURN_VIEW', 'RETURN_APPROVE', 'REFUND_CANCEL']); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Approve');
    expect(fixture.nativeElement.textContent).toContain('Refund actions');
  });
});
