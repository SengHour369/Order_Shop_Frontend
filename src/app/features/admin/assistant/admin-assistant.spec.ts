import { of } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { PermissionService } from '../../../core/auth/permission.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminAssistantPage } from './admin-assistant.page';
import { AuthService } from '../../../core/auth/auth.service';

describe('Admin chatbot workflows', () => {
  let http: HttpTestingController;
  let loginRole="ADMIN";
  beforeEach(() => {
    loginRole="ADMIN";
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide:PermissionService,useValue:{has:()=>true,allows:()=>true} },
      { provide: AuthService, useValue: { session: () => ({ role:loginRole,username:'Admin' }) } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {http.match("/api/ai/quota").forEach(r=>r.flush({dailyLimit:5,used:0,remaining:5,unlimited:true,resetAt:"2026-10-16T00:00:00+07:00"}));http.match('/api/v1/user/approval-options').forEach(r=>r.flush({reviewers:[],defaultReviewerId:null}));http.verify();});
  function page() { return TestBed.createComponent(AdminAssistantPage).componentInstance; }
  it('opens the existing call overlay and exposes a voice recording button',()=>{
    const fixture=TestBed.createComponent(AdminAssistantPage);fixture.detectChanges();
    http.expectOne('/api/ai/admin/conversations').flush([]);
    http.expectOne('/api/ai/admin/info').flush({configured:false});
    const button=fixture.nativeElement.querySelector('[aria-label="Call AI"]');expect(button).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-label="Record voice message"]')).toBeTruthy();
    button.click();http.expectOne('/api/ai/voice/usage').flush({remainingToday:5,dailyLimit:5});fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-voice-call [role="dialog"]')).toBeTruthy();
    fixture.componentInstance.live.close();
  });
  it('preserves native UI instructions from the voice bridge and returns to chat',()=>{
    const component=page();
    vi.spyOn(component.live,'start').mockImplementation(async(_id,display,established)=>{
      established('voice-chat');display({conversationId:'voice-chat',cardType:'WorkspaceCard',suggestions:[],presentation:{schemaVersion:'1.0',blocks:[{kind:'payments.list'}]},result:{executionId:null,status:'SUCCESS',intent:'ADMIN_PAYMENT_LIST',message:'Payments',data:null}});
    });
    component.view.set('control');component.startCall();
    expect(component.view()).toBe('chat');expect(component.current()?.messages.at(-1)?.result?.presentation?.blocks).toEqual([{kind:'payments.list'}]);expect(component.current()?.id).toBe('voice-chat');
  });
  it('offers a product draft when Khmer product information is pasted without a command',()=>{
    const component=page();component.prompt='ឈ្មោះ៖ SOVIA-F\nម៉ាក៖ SOVINA\nប្រភេទ៖ អាហារបំប៉ន\nចំនួន៖ 15 គ្រាប់';component.send();
    expect(component.current()?.messages.at(-1)?.productSource).toContain('SOVIA-F');expect(component.draft()).toBeNull();http.expectNone('/api/ai/admin/chat');
    component.startProduct(component.current()!.messages.at(-1)!.productSource);expect(component.draft()?.name).toBe('SOVIA-F');expect(component.draft()?.price).toBeNull();
  });
  it('puts a Khmer voice transcript into the editable admin prompt without submitting it',()=>{
    const component=page();vi.spyOn(component.voice,'start').mockImplementation(async(_language,review)=>review('សួស្តី'));
    component.recordVoice();expect(component.prompt).toBe('សួស្តី');expect(component.language).toBe('km');
    http.expectNone('/api/ai/admin/chat');
  });
  it('always uses the admin endpoint on the guarded admin page, even with a legacy USER login role',()=>{loginRole='USER';const component=page();component.prompt='Show low stock';component.send();http.expectOne('/api/ai/admin/chat').flush({conversationId:'admin-mode',suggestions:[],result:{status:'SUCCESS',message:'Read-only result',data:null}});http.expectNone('/api/ai/chat');});
  it('retains the active conversation when closing and reopening the existing page',()=>{
    const first=TestBed.createComponent(AdminAssistantPage);first.componentInstance.prompt='Hello';first.componentInstance.send();
    http.expectOne('/api/ai/admin/chat').flush({conversationId:'saved',suggestions:[],result:{status:'SUCCESS',message:'Hello back',data:null}});
    first.destroy();const reopened=page();expect(reopened.current()?.id).toBe('saved');expect(reopened.current()?.messages.at(-1)?.text).toBe('Hello back');
  });
  it('regenerates with a new request key and stores authenticated response feedback',()=>{
    const component=page();component.prompt='Hello';component.send();const first=http.expectOne('/api/ai/admin/chat');const key=first.request.headers.get('Idempotency-Key');
    first.flush({conversationId:'saved',suggestions:[],result:{status:'SUCCESS',message:'Hello back',data:null}});
    const turn=component.current()!.messages[1];component.vote(turn,'up');const feedback=http.expectOne('/api/ai/feedback');expect(feedback.request.body).toEqual({requestKey:key,rating:'up'});feedback.flush({rating:'up'});expect(turn.feedback).toBe('up');
    component.regenerate(1);const second=http.expectOne('/api/ai/admin/chat');expect(second.request.headers.get('Idempotency-Key')).not.toBe(key);second.flush({conversationId:'saved',suggestions:[],result:{status:'SUCCESS',message:'New answer',data:null}});
  });
  it('renders the admin workspace and loads real model/history APIs', () => {
    const fixture = TestBed.createComponent(AdminAssistantPage); fixture.detectChanges();
    http.expectOne('/api/ai/admin/conversations').flush([]);
    http.expectOne('/api/ai/admin/info').flush({ model:'qwen2.5:1.5b',provider:'Ollama',configured:true,historyMinutes:30 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('AI Assistant');
    expect(fixture.nativeElement.querySelector('[aria-label="Message AI assistant"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('qwen2.5:1.5b');
  });
  it('shows processing while chat is waiting and uses the admin endpoint', () => {
    const component = page(); component.prompt = 'Show low stock'; component.send();
    expect(component.locked()).toBe(true);
    const request = http.expectOne('/api/ai/admin/chat');
    expect(request.request.body.message).toBe('Show low stock');
    request.flush({ conversationId:'chat-1',suggestions:[],result:{ status:'SUCCESS',message:'Current stock',data:[],executionId:'run-1' } });
    expect(component.locked()).toBe(false);
    expect(component.current()?.messages.at(-1)?.text).toBe('Current stock');
  });
  it('opens the native product form draft without creating a product',()=>{
    const component=page();component.prompt='Create product named Phone, price $1,200, stock 20';component.send();
    expect(component.draft()?.name).toBe('Phone');expect(component.draft()?.price).toBe(1200);expect(component.draft()?.quantity).toBe(20);
    http.expectNone('/api/ai/admin/chat');http.expectNone(request=>request.url.includes('/products/create/'));
  });
  it('accepts follow-up field data while the real Create Product form stays in chat',async()=>{
    const api=TestBed.inject(AdminApi);vi.spyOn(api,'allCategories').mockReturnValue(of([{id:1,name:'Wearables'}]));vi.spyOn(api,'allBrands').mockReturnValue(of([{id:2,name:'Watches',categoryId:1}]));
    const f=TestBed.createComponent(AdminAssistantPage),component=f.componentInstance;component.startProduct();f.detectChanges();
    http.expectOne('/api/ai/admin/conversations').flush([]);http.expectOne('/api/ai/admin/info').flush({provider:'test',model:'test',configured:true,historyMinutes:30});await f.whenStable();f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-label="Message AI assistant"]').disabled).toBe(false);
    component.prompt='set name to Smart Watch Pro, price $199, stock 100, category Wearables, subcategory Watches';component.send();f.detectChanges();await f.whenStable();f.detectChanges();
    expect(f.nativeElement.querySelector('input[name="name"]').value).toBe('Smart Watch Pro');
    expect(f.nativeElement.querySelector('.sku-grid input[type="number"][step="1"]').value).toBe('100');
    expect(component.current()?.messages.at(-1)?.text).toContain('Updated');expect(component.current()?.messages.at(-1)?.text).toContain('No product has been submitted');
    component.prompt='ឈ្មោះ៖ SOVIA-F\nម៉ាក៖ SOVINA\nប្រភេទ៖ អាហារបំប៉ន\nចំនួន៖ 15 គ្រាប់\nDong Quai Extract\nFish Collagen Peptide';component.send();f.detectChanges();await f.whenStable();f.detectChanges();
    expect(f.nativeElement.querySelector('input[name="name"]').value).toBe('SOVIA-F');
    expect(f.nativeElement.querySelector('textarea').value).toContain('Fish Collagen Peptide');
    expect(f.nativeElement.querySelector('.sku-grid input[type="number"][step="1"]').value).toBe('100');
    http.expectNone('/api/ai/admin/chat');http.expectNone(r=>r.url.includes('/products/create/') || r.url.includes('/api/ai/imports'));
  });
  it('opens known promotion commands without depending on AI inference',()=>{
    const component=page();component.shortcut('Create promotion');expect(component.promotionOpen()).toBe(true);http.expectNone('/api/ai/admin/chat');
    component.promotionOpen.set(false);component.prompt='Create a draft promotion';component.send();expect(component.promotionOpen()).toBe(true);http.expectNone('/api/ai/admin/chat');
    http.expectNone('/api/v1/admin/promotions');
  });
  it('uses the authorized order-list tool for today without AI intent detection',()=>{
    const component=page();component.prompt='Show orders for today';component.send();
    const request=http.expectOne('/api/ai/tools/ADMIN_ORDER_LIST');expect(request.request.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    http.expectNone('/api/ai/admin/chat');
    request.flush({executionId:null,status:'SUCCESS',intent:'ADMIN_ORDER_LIST',message:'Orders',data:[{id:12,order_number:'ORD-12',status:'PROCESSING'}]});
    expect(component.current()?.messages.at(-1)?.result?.presentation?.blocks[0].kind).toBe('orders.list');expect(component.locked()).toBe(false);
  });
  it('opens all-orders directly and looks up explicit order numbers without the model',()=>{
    const component=page();component.prompt='Show all orders';component.send();http.expectNone('/api/ai/admin/chat');
    expect(component.current()?.messages.at(-1)?.result?.presentation?.blocks).toEqual([{kind:'orders.list'}]);
    component.prompt='View order ORD-12';component.send();http.expectOne(r=>r.url==='/api/v1/orders/number/'&&r.params.get('orderNumber')==='ORD-12').flush({data:{id:12,order_number:'ORD-12'}});http.expectNone('/api/ai/admin/chat');
    expect(component.current()?.messages.at(-1)?.result?.intent).toBe('ORDER_GET');
  });
  it('looks up readable order codes without losing legacy lookup support',()=>{
    const component=page();component.prompt='View order anOrder_001';component.send();
    http.expectOne(r=>r.url==='/api/v1/orders/number/'&&r.params.get('orderNumber')==='anOrder_001').flush({data:{id:22,order_number:'anOrder_001'}});
    expect(component.current()?.messages.at(-1)?.result?.intent).toBe('ORDER_GET');http.expectNone('/api/ai/admin/chat');
  });
  it('reports a saved approval request without claiming a live product was created',()=>{
    const component=page();component.startProduct();component.productRequestSaved({id:'batch-1',status:'SUBMITTED'});
    expect(component.draft()).toBeNull();expect(component.current()?.messages.at(-1)?.text).toContain('not live yet');
    http.expectNone(request=>request.url.includes('/products/create/'));
  });
  it('requires review before incrementing stock and prevents duplicate submission', () => {
    const component = page(); component.inventoryId = 8; component.stockQuantity = 50;
    component.restock(); http.expectNone(request => request.url.includes('/inventory/restock'));
    component.reviewStock(); component.restock(); component.restock();
    const request = http.expectOne(request => request.url === '/api/v1/inventory/restock');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.params.get('id')).toBe('8');
    expect(request.request.body).toEqual({ quantity:50 });
    request.flush({ id:8,quantity:100 });
    expect(component.operations()[0].status).toBe('SUCCESS');
  });
  it('only confirms the server-issued action once', () => {
    const component = page();
    const turn = { role:'assistant' as const,text:'Review',time:new Date(),result:{ executionId:'exec-1',status:'NEEDS_INPUT',message:'Review',data:{ confirmationId:'confirmation-1',parameters:{ id:3 } } } };
    component.confirm(turn); component.confirm(turn);
    const request = http.expectOne('/api/ai/confirm/confirmation-1');
    request.flush({ executionId:'exec-2',status:'SUCCESS',message:'Promotion disabled',data:{} });
    expect(turn.text).toBe('Promotion disabled');
    expect(component.pending(turn)).toBeNull();
    expect(component.operations()[0].status).toBe('SUCCESS');
  });
  it('cancels a preview without sending a mutation', () => {
    const component = page();
    const turn = { role:'assistant' as const,text:'Review',time:new Date(),result:{ executionId:null,status:'NEEDS_INPUT',message:'Review',data:{ confirmationId:'confirmation-1' } } };
    component.cancel(turn); component.confirm(turn);
    expect(component.pending(turn)).toBeNull(); http.expectNone('/api/ai/confirm/confirmation-1');
  });
  it('renders server failures and releases the composer', () => {
    const component = page(); component.prompt = 'Hello'; component.send();
    http.expectOne('/api/ai/admin/chat').flush({ message:'Model unavailable' },{ status:503,statusText:'Unavailable' });
    expect(component.error()).toBe('Model unavailable'); expect(component.locked()).toBe(false);
  });
});

