import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PermissionService } from '../../../core/auth/permission.service';
import { LiveTestsPage } from './live-tests.page';
describe('Real HTTP test administration',()=>{
 let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:PermissionService,useValue:{has:()=>true}}]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>{http.verify();TestBed.resetTestingModule();});
 it('starts a backend run and renders failed and blocked results without invented success',()=>{
  const f=TestBed.createComponent(LiveTestsPage);http.expectOne('/api/v1/admin/live-tests/runs').flush([]);f.detectChanges();
  expect(f.nativeElement.textContent).toContain('No real test runs yet');
  f.componentInstance.start();
  const request=http.expectOne('/api/v1/admin/live-tests/runs');expect(request.request.method).toBe('POST');expect(request.request.body).toEqual({guestSession:false});
  request.flush({id:'run-1',status:'FAILED',startedAt:'2026-10-20T00:00:00Z',finishedAt:'2026-10-20T00:00:01Z',steps:[{key:'khqr',title:'Real KHQR',status:'BLOCKED',httpStatus:200,durationMs:12,detail:'Receiving account required'},{key:'workflow',title:'Workflow API',status:'FAILED',httpStatus:500,durationMs:5,detail:'Service returned HTTP 500'}]});
  f.detectChanges();expect(f.nativeElement.textContent).toContain('Receiving account required');expect(f.nativeElement.textContent).toContain('HTTP 500');expect(f.componentInstance.count('PASSED')).toBe(0);
 });
 it('loads only server supplied history and report details',()=>{
  const f=TestBed.createComponent(LiveTestsPage);http.expectOne('/api/v1/admin/live-tests/runs').flush([{id:'existing',status:'BLOCKED',startedAt:'2026-10-20T00:00:00Z'}]);
  http.expectOne('/api/v1/admin/live-tests/runs/existing').flush({id:'existing',status:'BLOCKED',startedAt:'2026-10-20T00:00:00Z',steps:[]});
  f.detectChanges();expect(f.componentInstance.report()?.id).toBe('existing');expect(f.nativeElement.textContent).toContain('BLOCKED');
 });
});
