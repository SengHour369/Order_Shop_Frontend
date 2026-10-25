import {TestBed} from '@angular/core/testing';
import {provideHttpClient,withFetch,withInterceptors} from '@angular/common/http';
import {provideRouter,Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {finalize,tap} from 'rxjs';
import {routes} from '../../app.routes';
import {AuthService} from '../../core/auth/auth.service';
import {authInterceptor} from '../../core/auth/auth.interceptor';
import {LanguageService} from '../../core/i18n/language.service';
import type {Session} from '../../core/api/models';

// Real guards, real services, real components and real HTTPS. No mocked network responses.
// These are page-loading checks under jsdom, not certification of every mutation or browser behavior.
const env=(globalThis as unknown as {process?:{env:Record<string,string|undefined>}}).process?.env??{};
const sessionRaw=env['ESHOP_TEST_SESSION'];
const base=env['ESHOP_TEST_BASE_URL']??'https://localhost:8443';
const pages=['','orders','cancellations','returns','payments','refunds','transactions','customers','customers/add','customer-groups','customer-groups/add','products','products/add','categories','categories/add','brands','brands/add','inventory','inventory/stock-in','inventory/stock-out','inventory/adjustments','inventory/warehouses','sales-report','payment-report','tax-report','promotions','promotions/add','activity','settings','groups','groups/add','users','branches','review-authorization','my-requests','imports','import-approvals','import-executions','live-tests','storefront-access','guest-activity','guest-reviews','notifications','automation','ai-automation',...JSON.parse(env['ESHOP_TEST_DETAIL_ROUTES']??'[]') as string[]];
describe.skipIf(!sessionRaw)('Admin pages against real HTTPS',()=>{
 let harness:RouterTestingHarness|undefined;
 let pending=0;
 let failures:{path:string;status:number}[]=[];
 beforeEach(()=>{
  pending=0;failures=[];expect(new URL(base).protocol).toBe('https:');
  TestBed.configureTestingModule({providers:[provideRouter(routes),provideHttpClient(withFetch(),withInterceptors([authInterceptor,(req,next)=>{pending++;return next(req.clone({url:base+req.url,setHeaders:{Origin:base}})).pipe(tap({error:e=>failures.push({path:req.url,status:e.status})}),finalize(()=>pending--));}]))]});
  TestBed.inject(AuthService).accept(JSON.parse(sessionRaw!) as Session);
  TestBed.inject(LanguageService).setLanguage('en');
 });
 afterEach(()=>{harness?.fixture.destroy();harness=undefined;TestBed.resetTestingModule();});
 it.each(pages)('loads /admin/%s using the real account and service data',async(page)=>{
  const path='/admin'+(page?'/'+page:'');harness=await RouterTestingHarness.create(path);
  await harness.fixture.whenStable();await vi.waitFor(()=>expect(pending).toBe(0),{timeout:20000});harness.detectChanges();
  expect(TestBed.inject(Router).url).toBe(path);expect(failures,'Failed actual HTTPS requests for '+path).toEqual([]);
  const element=harness.routeNativeElement!;expect(element.querySelector('h1,h2')).toBeTruthy();
  const alerts=Array.from(element.querySelectorAll('[role="alert"]')).map(node=>node.textContent?.trim()).filter(Boolean);
  expect(alerts,'Visible admin errors for '+path).toEqual([]);
 },60000);
});
