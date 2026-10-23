import { TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting, } from "@angular/common/http/testing";
import { CustomerChat } from "./customer-chat";
import { AuthService } from "../../../core/auth/auth.service";
import { Session } from "../../../core/api/models";
describe("Customer floating AI chat", () => {
    let http: HttpTestingController;
    let session: ReturnType<typeof signal<Session | null>>;
    const response = (data: unknown = null, cardType = "KnowledgeCard") => ({
        conversationId: "conversation-1",
        cardType,
        suggestions: ["Search products"],
        result: {
            executionId: "run-1",
            status: "SUCCESS",
            message: "Here is your answer.",
            data,
        },
    });
    beforeEach(() => {
        session = signal<Session | null>(null);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: AuthService,
                    useValue: { session, userId: () => session()!.id },
                },
            ],
        });
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => {http.match("/api/ai/quota").forEach(r=>r.flush({dailyLimit:5,used:0,remaining:5,unlimited:true,resetAt:"2026-10-16T00:00:00+07:00"}));http.verify();});
    function create() {
        const fixture = TestBed.createComponent(CustomerChat);
        fixture.detectChanges();
        return fixture;
    }
    it('keeps a voice transcript editable until Send and preserves the conversation', () => {
        const fixture=create(), chat=fixture.componentInstance;
        chat.conversationId='existing-conversation';
        chat.voiceLanguage='km';
        vi.spyOn(chat.voice,'start').mockImplementation(async (_language, review) => review('តម្លៃប៉ុន្មាន?'));
        chat.recordVoice();
        expect(chat.prompt).toBe('តម្លៃប៉ុន្មាន?');
        expect(chat.voiceDraft()).toBe(true);
        expect(chat.messages()).toHaveLength(0);
        http.expectNone('/api/ai/chat');
        chat.prompt='តើផលិតផលនេះមានតម្លៃប៉ុន្មាន?';
        chat.send();
        const request=http.expectOne('/api/ai/chat');
        expect(request.request.body.message).toBe('តើផលិតផលនេះមានតម្លៃប៉ុន្មាន?');
        expect(request.request.body.conversationId).toBe('existing-conversation');
        expect(request.request.body.language).toBe('km');
        request.flush(response());
        expect(chat.voiceDraft()).toBe(false);
    });
    it('prevents submission during voice recording or transcription', () => {
        const chat=create().componentInstance;
        chat.prompt='Find shoes';
        chat.voice.recording.set(true); chat.send();
        chat.voice.recording.set(false); chat.voice.pending.set(true); chat.send();
        http.expectNone('/api/ai/chat');
        expect(chat.prompt).toBe('Find shoes');
        chat.voice.pending.set(false);
    });
    it('renders a My Orders reply as the native embedded customer table without raw payloads',()=>{
        session.set({id:7,username:'Customer',email:'customer@example.test',role:'USER',access_token:'test',refresh_token:'test'});
        const fixture=create(),chat=fixture.componentInstance;
        chat.prompt='Show my orders';chat.send();
        http.expectOne('/api/ai/chat').flush(response([{id:30,order_number:'ORD-30',status:'DELIVERED'}],'OrderList'));
        fixture.detectChanges();
        http.expectOne(r=>r.url==='/api/v1/orders/user/history'&&r.params.get('userId')==='7').flush({content:[{data:{id:30,order_number:'ORD-30',status:'DELIVERED',order_date:'2026-10-22T10:00:00',total_amount:39,paymentMethod:'KHQR',items:[]}}],totalPages:1});
        fixture.detectChanges();
        const table=fixture.nativeElement.querySelector('app-customer-orders table');
        expect(table.textContent).toContain('ORD-30');expect(table.textContent).toContain('View Details');
        expect(fixture.nativeElement.querySelector('pre,code')).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('"order_number"');
    });
    it('archives real conversations and reopens them without charging another AI request',()=>{
        const fixture=create(),chat=fixture.componentInstance;
        chat.prompt='Find a laptop';chat.send();http.expectOne('/api/ai/chat').flush(response());
        expect(chat.history()[0].title).toBe('Find a laptop');
        chat.newChat();expect(chat.messages()).toEqual([]);
        chat.openHistory('conversation-1');expect(chat.messages()).toHaveLength(2);
        expect(chat.conversationId).toBe('conversation-1');http.expectNone('/api/ai/chat');
    });
    it('clears visible conversation history on an account change',()=>{
        const fixture=create(),chat=fixture.componentInstance;
        chat.prompt='Guest search';chat.send();http.expectOne('/api/ai/chat').flush(response());
        expect(chat.history()).toHaveLength(1);
        session.set({id:9,username:'Other',email:'other@example.test',role:'USER',access_token:'other',refresh_token:'other'});fixture.detectChanges();
        expect(chat.history()).toEqual([]);expect(chat.messages()).toEqual([]);
    });
    it('does not open or send a chat for the welcome hint and reuses the same dialog after closing',()=>{
        const fixture=create(),chat=fixture.componentInstance;
        const dialog=fixture.nativeElement.querySelector('dialog');
        dialog.showModal=vi.fn();dialog.close=vi.fn();
        const button=fixture.nativeElement.querySelector('.ai-launcher') as HTMLButtonElement;
        expect(chat.opened()).toBe(false);expect(button.hidden).toBe(false);http.expectNone('/api/ai/chat');
        button.click();fixture.detectChanges();expect(dialog.showModal).toHaveBeenCalledOnce();expect(button.hidden).toBe(true);
        chat.messages.set([{role:'assistant',text:'Preserved conversation'}]);chat.conversationId='existing-chat';
        chat.close();fixture.detectChanges();expect(button.hidden).toBe(false);expect(document.activeElement).toBe(button);
        expect(chat.messages()[0].text).toBe('Preserved conversation');expect(chat.conversationId).toBe('existing-chat');
        button.click();fixture.detectChanges();expect(dialog.showModal).toHaveBeenCalledTimes(2);http.expectNone('/api/ai/chat');
    });
    it('moves the customer launcher with touch without opening the chatbot',()=>{
        const fixture=create();const button=fixture.nativeElement.querySelector('.ai-launcher') as HTMLButtonElement;
        Object.defineProperty(button,'getBoundingClientRect',{value:()=>({left:200,top:200,width:58,height:58})});
        const pointer=(type:string,x:number,y:number)=>{const event=new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'touch'},isPrimary:{value:true}});button.dispatchEvent(event);};
        pointer('pointerdown',210,210);pointer('pointermove',10000,10000);pointer('pointerup',10000,10000);button.click();fixture.detectChanges();
        expect(fixture.componentInstance.opened()).toBe(false);expect(parseFloat(button.style.left)).toBeLessThanOrEqual(window.innerWidth-66);expect(parseFloat(button.style.top)).toBeLessThanOrEqual(window.innerHeight-66);
        http.expectNone('/api/ai/chat');
    });
    it("allows guests to chat, preserves conversation context and selected language, and blocks duplicate sends", () => {
        const chat = create().componentInstance;
        chat.language = "km";
        chat.prompt = "Find headphones";
        chat.send();
        chat.prompt = "Duplicate";
        chat.send();
        const first = http.expectOne("/api/ai/chat");
        expect(first.request.body).toEqual({
            message: "Find headphones",
            conversationId: null,
            language: "km",
        });
        first.flush(response());
        chat.prompt = "Show more";
        chat.send();
        const next = http.expectOne("/api/ai/chat");
        expect(next.request.body.conversationId).toBe("conversation-1");
        next.flush(response());
        expect(chat.messages().length).toBe(4);
        http.expectNone("/api/ai/admin/chat");
    });
    it("renders backend SKU prices and adds the exact SKU only after an explicit click", () => {
        session.set({
            id: 7,
            username: "Buyer",
            email: "buyer@example.com",
            role: "CUSTOMER",
            access_token: "test",
            refresh_token: "test",
        });
        const fixture = create();
        const chat = fixture.componentInstance;
        chat.prompt = "Find headphones";
        chat.send();
        http
            .expectOne("/api/ai/chat")
            .flush(response([
            {
                id: 24,
                name: "Headphones",
                skus: [
                    { id: 88, basePrice: 49, effectivePrice: 39, available: 3 },
                ],
            },
        ], "ProductList"));
        fixture.detectChanges();
        const product = chat.messages()[1].products![0];
        expect(product.price).toBe(39);
        expect(product.originalPrice).toBe(49);
        http.expectNone((r) => r.url.includes("/items"));
        chat.add(product);
        const add = http.expectOne("/api/v1/cart/user/id/items?userId=7");
        expect(add.request.body).toEqual({ product_id: 88, quantity: 1 });
        add.flush({
            code: "200",
            message: "OK",
            data: { total_items: 1, items: [], total_price: 39, id: 1 },
        });
        expect(chat.cartFeedback()).toContain("added to cart");
    });
    it('renders live images, promotion and bilingual product actions', () => {
        const fixture = create(), chat = fixture.componentInstance;
        chat.language = 'km'; chat.opened.set(true); chat.prompt = 'រកទូរស័ព្ទ'; chat.send();
        http.expectOne('/api/ai/chat').flush(response([{id: 24, name: 'Phone Pro', images: ['https://example.test/phone.png'],
          skus: [{id: 88, effectivePrice: 240, basePrice: 600, available: 5, hasPromotion: true, promotionName: 'Phone sale'}]}], 'ProductList'));
        fixture.detectChanges();
        const card = fixture.nativeElement.querySelector('.chat-product') as HTMLElement;
        expect(card.querySelector('img')!.getAttribute('src')).toBe('https://example.test/phone.png');
        expect(card.textContent).toContain('Phone sale'); expect(card.textContent).toContain('មើលព័ត៌មានលម្អិត');
        expect(card.textContent).toContain('បន្ថែមទៅកន្ត្រក');
        expect(card.querySelector('a')).toBeNull();
        expect(card.querySelector('button.chat-detail')).not.toBeNull();
        http.expectNone(r => r.url.includes('/items'));
    });
    it('sorts and filters genuine product cards while leaving unknown prices unavailable',async()=>{
        const fixture=create(),chat=fixture.componentInstance;chat.prompt='Find shoes';chat.send();
        http.expectOne('/api/ai/chat').flush(response([
          {id:1,name:'Expensive shoes',skus:[{id:11,basePrice:100,available:3}]},
          {id:2,name:'Affordable shoes',skus:[{id:12,basePrice:50,available:0}]},
          {id:3,name:'Unknown price shoes',skus:[{id:13,available:2}]}
        ],'ProductList'));fixture.detectChanges();
        await fixture.whenStable();
        const sorting=fixture.nativeElement.querySelector('[aria-label="Sort product results"]') as HTMLSelectElement;
        sorting.value='price-asc';sorting.dispatchEvent(new Event('change'));await fixture.whenStable();fixture.detectChanges();
        let cards=fixture.nativeElement.querySelectorAll('.chat-products .chat-product');
        expect(cards[0].textContent).toContain('Affordable shoes');expect(cards[2].textContent).toContain('Unknown price shoes');
        (fixture.nativeElement.querySelector('.stock-filter input') as HTMLInputElement).click();await fixture.whenStable();fixture.detectChanges();cards=fixture.nativeElement.querySelectorAll('.chat-products .chat-product');
        expect(cards.length).toBe(2);expect(cards[0].textContent).toContain('Expensive shoes');
        expect(fixture.nativeElement.querySelector('.collection-heading').textContent).toContain('2 products shown');
    });
    it('never offers add to cart for unavailable stock', () => {
        const fixture = create(), chat = fixture.componentInstance;
        chat.opened.set(true); chat.prompt = 'Find phone'; chat.send();
        http.expectOne('/api/ai/chat').flush(response([{id: 24, name: 'Phone', skus: [{id: 88, effectivePrice: 240, available: 0}]}], 'ProductList'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('button.chat-add')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Out of stock');
        chat.add(chat.messages()[1].products![0]);
        http.expectNone(r => r.url.includes('/items'));
    });
    it('keeps product cards usable with a compact call bar and routes clicks into the same call',()=>{
        const fixture=create(),chat=fixture.componentInstance;chat.opened.set(true);chat.conversationId='existing-chat';
        chat.live.status.set('LISTENING');chat.live.opened.set(false);
        vi.spyOn(chat.live,'isConnected').mockReturnValue(true);const selected=vi.spyOn(chat.live,'selectProduct').mockResolvedValue();
        chat.messages.set([{role:'assistant',text:'Actual catalog',products:[{id:24,name:'Actual product',image:'/real.png',quantity:1,skuId:88,available:3,variants:[{id:88,label:'Blue',available:3},{id:89,label:'Black',price:80,available:2}]}]}]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.call-bar')).not.toBeNull();expect(fixture.nativeElement.querySelector('section.call')).toBeNull();
        chat.details(chat.messages()[0].products![0]);expect(selected).toHaveBeenCalledWith(24,88);
        chat.selectVariant(chat.messages()[0].products![0],89);expect(selected).toHaveBeenCalledWith(24,89);expect(chat.messages()[0].products![0].price).toBe(80);
        http.expectNone('/api/v1/storefront/products/24');expect(chat.conversationId).toBe('existing-chat');chat.live.end();
    });
    it('loads actual details and SKU attributes inside the conversation', () => {
        const fixture = create(), chat = fixture.componentInstance;
        chat.details({id:24});
        const request = http.expectOne('/api/v1/storefront/products/24');
        expect(request.request.method).toBe('GET');
        request.flush({id:24,name:'Phone',description:'Catalog description',main_image:['/phone.png','/back.png'],skus:[{id:88,price:300,finalPrice:240,inventory:{availableQuantity:2},quantity:8,attributes:[{name:'Color',attributes:[{value:'Blue'}]}]}]});
        fixture.detectChanges();
        expect(chat.messages()[0].products![0].available).toBe(2);
        expect(fixture.nativeElement.textContent).toContain('Color: Blue');
        expect(fixture.nativeElement.querySelectorAll('.chat-gallery img').length).toBe(2);
    });
    it('does not execute a cancellation until its confirmation button is used', () => {
        session.set({id:7,username:'Buyer',email:'buyer@example.test',role:'CUSTOMER',access_token:'test',refresh_token:'test'});
        const fixture=create(),chat=fixture.componentInstance;
        chat.prompt='Cancel order ORD-1';chat.send();
        http.expectOne('/api/ai/chat').flush({...response({confirmationId:'review-1',parameters:{orderNumber:'ORD-1'}},'ConfirmationCard'), result:{executionId:'run-1',status:'NEEDS_INPUT',message:'Review cancellation',intent:'ORDER_CANCEL',data:{confirmationId:'review-1',parameters:{orderNumber:'ORD-1'}}}});
        http.expectNone('/api/ai/confirm/review-1');
        chat.confirmAction(chat.messages()[1]);
        http.expectOne('/api/ai/confirm/review-1').flush({executionId:'review-1',status:'SUCCESS',intent:'ORDER_CANCEL',message:'Cancelled',data:{id:1,orderNumber:'ORD-1',status:'CANCELLED'}});
        expect(chat.messages().at(-1)?.text).toBe('Cancelled');
        expect(chat.messages()[1].confirmationId).toBeUndefined();
    });
    it('uses visual recognition and asks for catalog candidate selection without scanning codes', () => {
        session.set({id:7,username:'Buyer',email:'buyer@example.test',role:'CUSTOMER',access_token:'test',refresh_token:'test'});
        const fixture=create(),chat=fixture.componentInstance;
        const file=new File(['photo'],'photo.png',{type:'image/png'});
        chat.photo({target:{files:[file],value:'photo.png'}} as unknown as Event);
        const request=http.expectOne('/api/ai/visual-search');
        expect((request.request.body as FormData).get('image')).toBe(file);
        request.flush({status:'SUCCESS',data:{matchType:'AI_IMAGE',exact:false,requiresSelection:true,message:'Select product',candidates:[{productId:24,name:'Catalog phone',confidence:0.55}]}});
        expect(chat.messages()[0].visualCandidates![0].productId).toBe(24);
        http.expectNone('/api/v1/product-scanner/scan');
        http.expectNone('/api/v1/products/get/all');
    });
    it('reuses the cart addition key after an uncertain server result',()=>{
        session.set({id:7,username:'Buyer',email:'buyer@example.test',role:'CUSTOMER',access_token:'test',refresh_token:'test'});
        const chat=create().componentInstance;
        const product={id:24,name:'Phone',skuId:88,available:5,image:'/phone.png',quantity:1,variants:[]};
        chat.add(product);const first=http.expectOne('/api/v1/cart/user/id/items?userId=7');const key=first.request.headers.get('Idempotency-Key');
        first.flush({}, {status:503,statusText:'Unavailable'});
        chat.add(product);const second=http.expectOne('/api/v1/cart/user/id/items?userId=7');
        expect(second.request.headers.get('Idempotency-Key')).toBe(key);
        second.flush({data:{id:1,total_items:1,total_price:39,items:[]}});
    });
    it("shows checkout guidance without placing an order or taking payment", () => {
        const fixture = create();
        const chat = fixture.componentInstance;
        chat.prompt = "How do I place an order and pay?";
        chat.send();
        http.expectOne('/api/ai/chat').flush(response(null, 'CheckoutGuide'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.in-chat-action')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('app-chat-checkout')).toBeNull();
        chat.openCheckout();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-chat-checkout')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('a[href="/account/payments"]')).toBeTruthy();
        http.expectNone(r => r.url.includes('/checkout') || r.url.includes('/payments'));
    });
    it('lets the user select a variant and quantity before adding to the cart', () => {
        session.set({ id: 7, username: 'Buyer', email: 'buyer@example.com', role: 'CUSTOMER', access_token: 'test', refresh_token: 'test' });
        const fixture = create();
        const chat = fixture.componentInstance;
        chat.prompt = 'Buy headphones';
        chat.send();
        http.expectOne('/api/ai/chat').flush(response([{ id: 24, name: 'Headphones', skus: [
                    { id: 88, sku: 'BLACK', basePrice: 39, available: 2 }, { id: 89, sku: 'WHITE', basePrice: 49, available: 5 },
                ] }], 'ProductList'));
        const product = chat.messages()[1].products![0];
        chat.selectVariant(product, 89);
        product.quantity = 3;
        expect(product.price).toBe(49);
        chat.add(product);
        const request = http.expectOne('/api/v1/cart/user/id/items?userId=7');
        expect(request.request.body).toEqual({ product_id: 89, quantity: 3 });
        request.flush({ data: { id: 1, total_items: 3, total_price: 147, items: [] } });
        product.quantity = 6;
        chat.add(product);
        http.expectNone(r => r.url.includes('/items'));
    });
    it("keeps structured clarification responses and retries transport failures without duplicating the user bubble", () => {
        const chat = create().componentInstance;
        chat.prompt = "My order";
        chat.send();
        http
            .expectOne("/api/ai/chat")
            .flush({
            ...response(),
            result: {
                executionId: "r",
                status: "NEEDS_INPUT",
                message: "Which order number?",
                data: null,
            },
        }, { status: 422, statusText: "Unprocessable Entity" });
        expect(chat.messages()[1].text).toBe("Which order number?");
        expect(chat.error()).toBe("");
        chat.prompt = "ORD-1";
        chat.send();
        http
            .expectOne("/api/ai/chat")
            .flush("Unavailable", { status: 503, statusText: "Unavailable" });
        expect(chat.busy()).toBe(false);
        expect(chat.error()).toBeTruthy();
        chat.retry();
        http.expectOne("/api/ai/chat").flush(response());
        expect(chat.messages().filter((m) => m.role === "user").length).toBe(2);
    });
    it("offers retry for structured provider failures without duplicating messages", () => {
        const chat = create().componentInstance;
        chat.prompt = "Find headphones";
        chat.send();
        http.expectOne("/api/ai/chat").flush({
            ...response(),
            cardType: "ErrorCard",
            result: { status: "FAILURE", message: "AI intent detection is unavailable.", data: null },
        }, { status: 502, statusText: "Bad Gateway" });
        expect(chat.error()).toContain("unavailable");
        expect(chat.busy()).toBe(false);
        expect(chat.messages().length).toBe(1);
        chat.retry();
        const retry = http.expectOne("/api/ai/chat");
        expect(retry.request.body.message).toBe("Find headphones");
        retry.flush(response());
        expect(chat.error()).toBe("");
        expect(chat.messages().length).toBe(2);
    });
    it('keeps sending disabled after a new chat when the server quota is exhausted',()=>{
        const fixture=create();const chat=fixture.componentInstance;
        chat.quota.apply({dailyLimit:5,used:5,remaining:0,unlimited:false,resetAt:'2099-01-01T00:00:00+07:00'});
        chat.prompt='Another question';chat.send();http.expectNone('/api/ai/chat');chat.newChat();fixture.detectChanges();
        expect(chat.quota.exhausted()).toBe(true);expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    });
    it("clears private conversation state and cancels pending requests when the account changes", () => {
        session.set({
            id: 7,
            username: "Buyer",
            email: "buyer@example.com",
            role: "CUSTOMER",
            access_token: "test",
            refresh_token: "test",
        });
        const fixture = create();
        const chat = fixture.componentInstance;
        chat.prompt = "Show my orders";
        chat.send();
        const pending = http.expectOne("/api/ai/chat");
        session.set(null);
        fixture.detectChanges();
        expect(pending.cancelled).toBe(true);
        expect(chat.messages()).toEqual([]);
        expect(chat.conversationId).toBeNull();
        expect(chat.busy()).toBe(false);
    });
});

