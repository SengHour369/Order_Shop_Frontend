import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { AssistantPage } from "./assistant.page";
import { AuthService } from "../../core/auth/auth.service";

describe("Assistant reference chat", () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { session: () => ({ username: "Admin", role: "ADMIN" }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it("keeps the conversation ID and uses the admin chat endpoint", () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    page.prompt = "Find shoes";
    page.send();
    const first = http.expectOne("/api/ai/admin/chat");
    expect(first.request.body).toEqual({
      message: "Find shoes",
      conversationId: null,
      language: "en",
    });
    first.flush({
      conversationId: "conversation-1",
      suggestions: [],
      cardType: "ProductList",
      result: {
        executionId: "run-1",
        status: "SUCCESS",
        message: "Matching shoes",
        data: [],
      },
    });
    page.prompt = "Show more";
    page.send();
    const next = http.expectOne("/api/ai/admin/chat");
    expect(next.request.body.conversationId).toBe("conversation-1");
    next.flush({
      conversationId: "conversation-1",
      suggestions: [],
      result: {
        executionId: "run-2",
        status: "SUCCESS",
        message: "More shoes",
        data: [],
      },
    });
    expect(page.current()?.messages.length).toBe(4);
    expect(page.conversations().length).toBe(1);
  });
  it("displays structured input requests from a 422 response", () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    page.prompt = "Find order";
    page.send();
    http
      .expectOne("/api/ai/admin/chat")
      .flush(
        {
          conversationId: "conversation-2",
          suggestions: [],
          result: {
            executionId: "run-3",
            status: "NEEDS_INPUT",
            message: "Enter an order number",
            data: null,
          },
        },
        { status: 422, statusText: "Unprocessable Entity" },
      );
    expect(page.current()?.messages.at(-1)?.text).toBe("Enter an order number");
    expect(page.error()).toBe("");
  });
  it("prefills shortcuts without sending and keeps new conversations separate", () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    page.choose("Show low stock items");
    expect(page.prompt).toBe("Show low stock items");
    expect(page.current()).toBeNull();
    page.newConversation();
    expect(page.prompt).toBe("");
  });
  it("keeps currencies separate and derives average value from the reported order count", () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    page.summarySales.set([{ month: 1, count: 2, amount: 150, currency: "USD" }]);
    expect(page.metrics()[0].value).toBe("USD 150.00");
    expect(page.metrics()[2].value).toBe("USD 75.00");
    page.summarySales.update(rows => [...rows!, { month: 1, count: 1, amount: 4000, currency: "KHR" }]);
    expect(page.metrics()[0].value).toBe("Multiple currencies");
    expect(page.metrics()[2].value).toBe("Multiple currencies");
  });
  it("uses the returned SKU values in a readable product table", () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    expect(page.records([{ id: 3, name: "Headphones", skus: [{ id: 5, effectivePrice: 23, basePrice: 28, available: 7 }] }]))
      .toEqual([{ product: "Headphones", price: 23, available: 7, id: 3 }]);
    expect(page.metrics().every(metric => metric.value === "—")).toBe(true);
  });
  it('renders current product prices, images, and unknown stock without inventing specifications', () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    const products = page.products({ products: [{ id: 9, name: 'Laptop', images: ['/laptop.png'], skus: [{ id: 17, effectivePrice: 699, available: 2 }] }, { id: 10, name: 'Unknown stock', skus: [{ id: 18, basePrice: 749 }] }] });
    expect(products[0]).toMatchObject({ id:9, image:'/laptop.png', price:699, available:2, skuId:17 });
    expect(products[1].available).toBeNull();
    expect(products[1].image).toBe('/images/product-placeholder.svg');
    expect(page.products([{ id:1, total:20 }])).toEqual([]);
  });
  it('loads a saved conversation and uses its ID for the next turn', () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    page.selectConversation({ id:'saved', title:'Laptop recommendation', preview:'Find a laptop', time:new Date().toISOString() });
    http.expectOne('/api/ai/admin/conversations/saved').flush({ id:'saved', title:'Laptop recommendation', time:new Date().toISOString(), messages:[{ role:'user', text:'Find a laptop', time:new Date().toISOString() }] });
    expect(page.current()?.title).toBe('Laptop recommendation');
    page.prompt = 'Compare the options'; page.send();
    const request = http.expectOne('/api/ai/admin/chat');
    expect(request.request.body.conversationId).toBe('saved');
    request.flush({ conversationId:'saved', suggestions:[], result:{ status:'SUCCESS', message:'Comparison',data:null } });
  });
  it('renames through the backend and filters conversation titles and previews', () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    page.history.set([{ id:'saved',title:'Laptop recommendation',preview:'Find laptops under $800',time:new Date().toISOString() }]);
    page.conversationSearch = 'under $800'; expect(page.conversationGroups()[0].items).toHaveLength(1);
    page.conversationSearch = 'shoes'; expect(page.conversationGroups()).toEqual([]);
    page.current.set({localId:'saved',id:'saved',title:'Laptop recommendation',time:new Date(),messages:[]});
    page.conversations.set([page.current()!]); page.beginRename(); page.conversationTitle = 'Programming laptops'; page.renameConversation();
    const request = http.expectOne('/api/ai/admin/conversations/saved');
    expect(request.request.method).toBe('PATCH'); expect(request.request.body).toEqual({ title:'Programming laptops' });
    request.flush({}); expect(page.current()?.title).toBe('Programming laptops'); expect(page.renameMode).toBe(false);
  });
  it('connects history and actual model information independently of chat errors', () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance; page.loadWorkspace();
    http.expectOne('/api/ai/admin/conversations').flush([], {status:503,statusText:'Unavailable'});
    http.expectOne('/api/ai/admin/info').flush({provider:'OLLAMA',model:'local-model',configured:true,historyMinutes:30});
    expect(page.historyError()).toContain('unavailable'); expect(page.modelInfo()?.model).toBe('local-model'); expect(page.error()).toBe('');
  });
  it('does not submit oversized prompts or attach unsupported files', async () => {
    const page = TestBed.createComponent(AssistantPage).componentInstance;
    page.prompt = 'x'.repeat(4001); page.send(); http.expectNone('/api/ai/admin/chat');
    const input = { files:[new File(['x'],'image.png')], value:'image.png' };
    await page.attachText({target:input} as unknown as Event);
    expect(page.attachmentError).toContain('text'); expect(input.value).toBe('');
  });
});
