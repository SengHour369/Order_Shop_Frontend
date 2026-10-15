import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminAssistantPage } from './admin-assistant.page';
import { AuthService } from '../../../core/auth/auth.service';

describe('Admin chatbot workflows', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { session: () => ({ role:'ADMIN',username:'Admin' }) } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {http.match("/api/ai/quota").forEach(r=>r.flush({dailyLimit:5,used:0,remaining:5,unlimited:true,resetAt:"2026-10-16T00:00:00+07:00"}));http.verify();});
  function page() { return TestBed.createComponent(AdminAssistantPage).componentInstance; }
  function prepareProduct(component: AdminAssistantPage) {
    component.startProduct('Create product named Phone, price $1,200, color Black, storage 256GB, stock 20 at Phnom Penh Branch.');
    http.expectOne(request => request.url === '/api/v1/subcategories/get/all').flush({ data: { content:[{ id:3,name:'Phones' }] } });
    component.categories.set([{ id:3,name:'Phones' }]);
    component.draft()!.category = 3;
    component.productFiles = [new File(['image'], 'phone.png', { type:'image/png' })];
    component.reviewProduct();
  }
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
  it('prepares product details without creating until explicit confirmation', () => {
    const component = page(); prepareProduct(component);
    expect(component.draft()?.price).toBe(1200);
    expect(component.draft()?.color).toBe('Black');
    expect(component.draftStage()).toBe('review');
    http.expectNone(request => request.url.includes('/products/create/'));
    component.createProduct(); component.createProduct();
    const request = http.expectOne(request => request.url === '/api/v1/products/create/');
    const skus = JSON.parse(request.request.params.get('skus')!);
    expect(skus[0].operatorProductAttribute).toBe(true);
    expect(skus[0].inventory.quantity).toBe(20);
    expect(skus[0].product_attributes).toEqual([{ name:'Color',attributes:[{ value:'Black' }] },{ name:'Storage',attributes:[{ value:'256GB' }] }]);
    expect(request.request.body.getAll('files')).toHaveLength(1);
    expect(component.processing()).toContain('Creating');
    request.flush({ id:17,name:'Phone',skus:[] });
    expect(component.operations()[0].status).toBe('SUCCESS');
    expect(component.draft()).toBeNull();
  });
  it('requires image and catalog category before product review', () => {
    const component = page(); component.startProduct();
    http.expectOne(request => request.url === '/api/v1/subcategories/get/all').flush([]);
    component.reviewProduct();
    expect(component.draftStage()).toBe('edit');
    expect(component.draftError()).toContain('product image');
    http.expectNone(request => request.url.includes('/products/create/'));
  });
  it('prevents blind retry after an ambiguous product failure', () => {
    const component = page(); prepareProduct(component); component.createProduct();
    http.expectOne(request => request.url === '/api/v1/products/create/').flush({}, { status:502,statusText:'Bad gateway' });
    expect(component.uncertain()).toBe(true);
    expect(component.operations()[0].status).toBe('UNKNOWN');
    component.createProduct(); http.expectNone(request => request.url.includes('/products/create/'));
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

