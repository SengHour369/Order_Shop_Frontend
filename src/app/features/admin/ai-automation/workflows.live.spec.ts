import {TestBed,ComponentFixture} from '@angular/core/testing';
import {provideHttpClient,withFetch,withInterceptors} from '@angular/common/http';
import {provideRouter} from '@angular/router';
import {WorkflowsPage} from './workflows.page';

// Opt in explicitly. Every response comes from the running HTTPS shop; no HTTP test backend.
// This renders Angular in jsdom. It does not certify browser cookie or certificate behavior.
const env=(globalThis as unknown as {process?:{env:Record<string,string|undefined>}}).process?.env??{};
const token=env['ESHOP_TEST_TOKEN'];
const base=env['ESHOP_TEST_BASE_URL']??'https://localhost:8443';
describe.skipIf(!token)('Admin workflow UI against real HTTPS',()=>{
 let fixture:ComponentFixture<WorkflowsPage>;
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+token,Origin:base};
 async function request(path:string,method='GET',body?:unknown){const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error'});expect(response.ok,'Real HTTPS status '+response.status+' for '+path).toBe(true);return response.json();}
 const buttons=()=>Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
 function click(label:string){fixture.detectChanges();const button=buttons().find(b=>b.textContent?.trim()===label);expect(button,'Missing UI control '+label).toBeTruthy();expect(button!.disabled,'Disabled UI control '+label).toBe(false);button!.click();fixture.detectChanges();}
 function input(selector:string,value:string,event='input'){const field=fixture.nativeElement.querySelector(selector) as HTMLInputElement;expect(field,'Missing input '+selector).toBeTruthy();field.value=value;field.dispatchEvent(new Event(event,{bubbles:true}));fixture.detectChanges();}
 async function idle(){await vi.waitFor(()=>expect(fixture.componentInstance.busy()).toBe(false),{timeout:20000});fixture.detectChanges();expect(fixture.componentInstance.error()).toBe('');}
 async function start(name:string){click('＋ Create Workflow');input('input[formControlName="name"]',name);input('textarea[formControlName="description"]','Read a real catalog product and verify actual execution records.');input('select[formControlName="module"]','catalog-service','change');click('Next →');click('Next →');}
 beforeEach(async()=>{
  expect(new URL(base).protocol).toBe('https:');
  TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(withFetch(),withInterceptors([(req,next)=>next(req.clone({url:base+req.url,setHeaders:{Authorization:'Bearer '+token,Origin:base}}))]))]});
  fixture=TestBed.createComponent(WorkflowsPage);fixture.detectChanges();
  await vi.waitFor(()=>expect(fixture.componentInstance.summary()).not.toBeNull(),{timeout:20000});await idle();
 });
 afterEach(()=>{fixture?.destroy();TestBed.resetTestingModule();});
 it('creates, validates, saves, publishes and executes using actual admin controls and real catalog data',async()=>{
  const products=await request('/api/v1/products/get/all','POST',{page:1,size:1,criteria_type:0,criteria_value:''});const product=products.data.payload[0];expect(product?.id).toBeGreaterThan(0);
  const name='HTTPS admin UI verification '+Date.now();await start(name);
  const tool=buttons().find(b=>b.classList.contains('tool-choice')&&b.querySelector('strong')?.textContent==='PRODUCT_GET');expect(tool).toBeTruthy();tool!.click();fixture.detectChanges();
  click('✓ Validate');await vi.waitFor(()=>expect(fixture.componentInstance.validation()).not.toBeNull(),{timeout:20000});fixture.detectChanges();expect(fixture.componentInstance.validation()?.valid).toBe(false);expect(fixture.nativeElement.textContent).toContain('Validation failed');
  input('input[aria-label="id"]',String(product.id),'change');click('✓ Validate');await idle();expect(fixture.componentInstance.validation()?.valid).toBe(true);
  click('Next →');click('Next →');click('▷ Publish Workflow');await idle();const draft=fixture.componentInstance.draft()!;expect(draft.id).toBeTruthy();const saved=await request('/api/ai/admin/workflows/'+draft.id);expect(saved.definition.steps[0].parameters.id).toBe(product.id);
  expect(fixture.componentInstance.versions()).toHaveLength(1);click('▷ Run Read-only Version');await idle();const detail=fixture.componentInstance.runDetail()!;expect(detail.run.status).toBe('SUCCEEDED');expect(detail.steps[0].status).toBe('SUCCEEDED');expect(detail.steps[0].outputSha256).toMatch(/^[0-9a-f]{64}$/);expect(fixture.nativeElement.textContent).toContain('SUCCEEDED');expect(fixture.componentInstance.runLogs().length).toBeGreaterThan(0);
  click('← Back to Executions');await idle();click('Workflows');await idle();input('input[aria-label="Search workflows"]',name);input('select[aria-label="Module filter"]','catalog-service','change');input('select[aria-label="Trigger filter"]','MANUAL','change');input('select[aria-label="Status filter"]','PUBLISHED','change');click('Filter');await idle();expect(fixture.componentInstance.total()).toBe(1);expect(fixture.componentInstance.rows()[0].status).toBe('PUBLISHED');expect(fixture.nativeElement.textContent).toContain(name);
 },60000);
 it('keeps cancellation usable while a real delayed execution request is running',async()=>{
  await start('HTTPS admin UI cancellation '+Date.now());click('Steps');click('DelayWait up to 30 seconds per execution');
  input('input[type="number"]','10','change');click('Next →');click('Next →');click('▷ Publish Workflow');await idle();click('▷ Run Read-only Version');const id=fixture.componentInstance.activeExecution()!;expect(id).toBeTruthy();
  await vi.waitFor(async()=>{const result=await fetch(base+'/api/ai/admin/workflows/executions/'+id,{headers});expect(result.ok).toBe(true);const detail=await result.json();expect(detail.steps[0].status).toBe('RUNNING');},{timeout:10000});click('Cancel running execution');await idle();expect(fixture.componentInstance.runDetail()?.run.status).toBe('CANCELLED');
 },60000);
 for(const type of ['EVENT','SCHEDULED'])it('configures '+type+' through actual UI and records a real background read',async()=>{
  const products=await request('/api/v1/products/get/all','POST',{page:1,size:1,criteria_type:0,criteria_value:''});const product=products.data.payload[0];expect(product?.id).toBeGreaterThan(0);
  click('＋ Create Workflow');input('input[formControlName="name"]','HTTPS automatic '+type+' '+Date.now());input('textarea[formControlName="description"]','Run a real catalog read in the persistent background worker.');input('select[formControlName="module"]','catalog-service','change');
  const option=buttons().find(b=>b.classList.contains('choice')&&b.textContent?.includes(type==='EVENT'?'Event Based':'Scheduled'))!;expect(option.disabled).toBe(false);option.click();fixture.detectChanges();click('Next →');
  if(type==='EVENT')input('input[aria-label="Custom event name"]','catalog.https.'+Date.now());
  else{const now=new Date();const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);input('input[aria-label="First run time"]',local);input('input[aria-label="Repeat interval minutes"]','0');}
  click('Next →');const tool=buttons().find(b=>b.classList.contains('tool-choice')&&b.querySelector('strong')?.textContent==='PRODUCT_GET')!;tool.click();fixture.detectChanges();input('input[aria-label="id"]',String(product.id),'change');click('Next →');click('Next →');click('Publish & Activate');await idle();
  const registration=fixture.componentInstance.trigger()!;expect(registration.id).toBeTruthy();expect(registration.triggerType).toBe(type);expect(fixture.nativeElement.textContent).toContain('Automatic Trigger');
  if(type==='EVENT'){click('Send Custom Event');await idle();}
  await vi.waitFor(async()=>{const jobs=await request('/api/ai/admin/workflows/triggers/'+registration.id+'/jobs');expect(jobs.items[0]?.status).toBe('SUCCEEDED');},{timeout:25000,interval:750});
  click('Refresh Trigger');await idle();expect(fixture.componentInstance.triggerJobs()[0].status).toBe('SUCCEEDED');
  if(type==='EVENT'){
   click('Pause Trigger');await idle();expect(fixture.componentInstance.trigger()?.state).toBe('PAUSED');
   click('Renew & Activate');await idle();expect(fixture.componentInstance.trigger()?.state).toBe('ACTIVE');
   click('Send Custom Event');await idle();await vi.waitFor(async()=>{const jobs=await request('/api/ai/admin/workflows/triggers/'+registration.id+'/jobs');expect(jobs.items).toHaveLength(2);expect(jobs.items[0].status).toBe('SUCCEEDED');},{timeout:25000,interval:750});
   click('Refresh Trigger');await idle();
  }
  click('View Execution');await idle();expect(fixture.componentInstance.runDetail()?.steps[0].outputSha256).toMatch(/^[0-9a-f]{64}$/);
  // Leave the accepted test subscription paused; its durable evidence remains available.
  await request('/api/ai/admin/workflows/triggers/'+registration.id+'/pause','POST',{});
 },60000);

});
