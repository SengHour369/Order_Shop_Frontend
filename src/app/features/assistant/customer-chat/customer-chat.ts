import { LiveVoice } from './live-voice';
import { VoiceCall } from './voice-call';
import { ChatVoice } from './chat-voice';
import { OrdersPage } from '../../orders/orders.page';
import { AssistantResult } from '../assistant-result';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { AssistantQuota } from '../assistant-quota';
import { RichMessage } from '../rich-message';
import { DragLauncher } from '../floating/drag-launcher';
import { LauncherWelcome } from '../floating/launcher-welcome';
import { conversationId as requestId } from '../../../shared/utils/conversation-id';
import { afterRenderEffect, Component, DestroyRef, ElementRef, effect, inject, input, signal, viewChild, } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyPipe, DecimalPipe } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subscription, timeout, map } from "rxjs";
import { AssistantApi, ChatResponse } from "../assistant.api";
import { AuthService } from "../../../core/auth/auth.service";
import { CustomerStore } from "../../../core/stores/customer.store";
import { CartApi } from "../../cart/cart.api";
import { Icon } from "../../../shared/components/icon";
import { ProductImage } from "../../../shared/components/product-image";
import { ChatMessage, ChatProduct, toChatProduct } from "./chat-message";
import { CatalogApi } from '../../catalog/catalog.api';
import { ImageMatches } from '../../scanner/scanner.api';
import { ChatOrder } from "../chat-order";
import { PaymentQr } from '../../payments/payment-qr';
import { ChatCheckout } from '../chat-checkout/chat-checkout';
import { CheckoutAttempt } from '../../checkout/checkout-attempt';
@Component({
    selector: "app-customer-chat",
    providers: [ChatVoice, LiveVoice],
    imports: [VoiceCall, OrdersPage, AssistantResult, LauncherWelcome, RichMessage, DragLauncher, TranslatePipe, FormsModule, RouterLink, CurrencyPipe, DecimalPipe, Icon, ProductImage, ChatCheckout, PaymentQr, ChatOrder],
    templateUrl: "./customer-chat.html",
    styleUrl: "./customer-chat.css",
})
export class CustomerChat {
    readonly live = inject(LiveVoice);
    startCall() {
        this.voice.reset();
        void this.live.start(this.conversationId, response => {
            this.messages.update(rows => [...rows, this.present(response)]);
            if(response.cardType==='CartCard'&&response.result.status==='SUCCESS')this.openCheckout();
            this.saveConversation(); this.scroll();
        }, id => {this.conversationId = id; this.saveConversation();});
    }
    readonly voice = inject(ChatVoice);
    readonly voiceDraft = signal(false);
    voiceLanguage = "en";
    recordVoice() {
        if(this.live.isActive()) return;
        if(this.voice.recording()) { this.voice.finish(); return; }
        void this.voice.start(this.voiceLanguage, text => {
            this.prompt = (this.prompt ? this.prompt + " " : "") + text;
            this.language = this.voiceLanguage;
            this.voiceDraft.set(true); this.input()?.nativeElement.focus();
        });
    }
    readonly pageMode = input(false);
    readonly auth = inject(AuthService);
    readonly quota=inject(AssistantQuota);
    private failedKey=requestId();
    readonly router = inject(Router);
    private readonly api = inject(AssistantApi);
    private readonly cart = inject(CartApi);
    private readonly catalog = inject(CatalogApi);
    private readonly attempt = inject(CheckoutAttempt);
    readonly store = inject(CustomerStore);
    private readonly destroyRef = inject(DestroyRef);
    readonly dialog = viewChild<ElementRef<HTMLDialogElement>>("chatDialog");
    private readonly launcher = viewChild(DragLauncher);
    private readonly launcherButton = viewChild<ElementRef<HTMLButtonElement>>('launcherButton');
    readonly input = viewChild<ElementRef<HTMLTextAreaElement>>("messageInput");
    readonly log = viewChild<ElementRef<HTMLElement>>("chatLog");
    readonly opened = signal(false);
    readonly busy = signal(false);
    readonly error = signal("");
    readonly needsSignIn = signal(false);
    readonly messages = signal<ChatMessage[]>([]);
    readonly cartBusy = signal<number | null>(null);
    private pendingCartKeys = new Map<number,{key:string;quantity:number}>();
    readonly cartFeedback = signal("");
    readonly checkoutVisible = signal(false);
    readonly trackingOrderId = signal<number|null>(null);
    readonly checkout = viewChild(ChatCheckout);
    prompt = "";
    language = "en";
    conversationId: string | null = null;
    private request?: Subscription;
    private cartRequest?: Subscription;
    private failedPrompt = "";
    private account: number | null | undefined = undefined;
    readonly menuOpen = signal(false);
    readonly history = signal<{id:string;title:string;time:string;messages:ChatMessage[];image?:string}[]>([]);
    readonly startedAt = new Date().toISOString();
    search = '';
    readonly shortcuts = [
        {label:'Find Products',icon:'search',tone:'blue',prompt:'Help me find a product'},
        {label:'Scan Product',icon:'camera',tone:'blue',prompt:''},
        {label:'My Orders',icon:'box',tone:'blue',prompt:'Show my orders'},
        {label:'Make Payment',icon:'card',tone:'blue',prompt:'Show my pending order payments'},
        {label:'Track Order',icon:'truck',tone:'green',prompt:'What is the status of my latest order?'},
        {label:'Return Policy',icon:'help',tone:'blue',prompt:'Explain the return and refund policy'},
    ];
    runShortcut(action:{label:string;prompt:string}) {
        if(action.label==='Scan Product'){void this.router.navigate(['/scanner']);this.close();return;}
        this.choose(action.prompt);
    }
    saveProduct(product:ChatProduct){
        if(this.busy())return;
        this.catalog.detail(product.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next:value=>{if(!value){this.cartFeedback.set('Product is unavailable.');return;}const saved=this.store.has(value.id);if(this.store.toggle(value))this.cartFeedback.set(saved?'Removed from wishlist.':'Saved to wishlist.');else this.cartFeedback.set('Could not save your wishlist.');},
            error:()=>this.cartFeedback.set('Could not load this product. Please try again.'),
        });
    }
    initials(){return (this.auth.session()?.username||'You').slice(0,2).toUpperCase();}
    time(value?:string){return value?new Date(value).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'';}
    searchProducts(){if(this.search.trim()){this.choose(this.search.trim());this.send();}}
    private rememberChat(){
        if(!this.conversationId||!this.messages().length)return;
        const messages=this.messages().map(message=>({...message}));
        const entry={id:this.conversationId,title:messages.find(m=>m.role==='user')?.text||'Shopping conversation',time:new Date().toISOString(),messages,image:messages.flatMap(m=>m.products||[])[0]?.image};
        this.history.update(rows=>[entry,...rows.filter(row=>row.id!==entry.id)].slice(0,12));
    }
    openHistory(id:string){
        if(this.busy())return;const entry=this.history().find(row=>row.id===id);if(!entry)return;
        this.voice.reset(); this.live.close(); this.voiceDraft.set(false);
        this.rememberChat();this.conversationId=id;this.messages.set(entry.messages.map(message=>({...message,confirmationId:undefined})));this.checkoutVisible.set(false);this.trackingOrderId.set(null);this.error.set('');this.saveConversation();this.menuOpen.set(false);this.scroll();
    }
    constructor() {
        this.live.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
            if(event.conversationId!==this.conversationId || !('turnId' in event))return;
            this.messages.update(rows=>{
                const next=rows.map(row=>({...row}));
                let turn=next.find(row=>row.voiceTurnId===event.turnId);
                if(!turn){turn={role:event.type==='VOICE_TRANSCRIPT_UPDATED'?'user':'assistant',text:'',voiceTurnId:event.turnId};next.push(turn);}
                turn.text+=event.text;return next;
            });
            this.saveConversation();this.scroll();
        });
        let wasOpened = false;
        afterRenderEffect(() => {
            const opened = this.opened();
            if (!opened) {
                this.launcher()?.clamp();
                if (wasOpened) this.launcherButton()?.nativeElement.focus();
            }
            wasOpened = opened;
        });
        effect(() => {
            const id = this.auth.session()?.id ?? null;
            if (id !== this.account) {
                this.voice.reset(); this.live.close();
                this.account = id;
                this.request?.unsubscribe();
                this.cartRequest?.unsubscribe();
                this.cartBusy.set(null);
                this.pendingCartKeys.clear();
                this.messages.set([]);
                this.history.set([]);
                this.conversationId = this.restoreConversation(id);
                this.prompt = "";
                this.failedPrompt = "";
                this.busy.set(false);
                this.error.set("");
                this.needsSignIn.set(false);
                this.cartFeedback.set("");
                this.checkoutVisible.set(false);
                this.trackingOrderId.set(null);
            }
        });
    }
    open() {
        this.dialog()?.nativeElement.showModal();
        this.opened.set(true);
        this.input()?.nativeElement.focus();
        this.scroll();
    }
    close() {
        this.voice.reset(); this.live.close();
        if(this.pageMode()){void this.router.navigate(['/shop']);return;}
        this.dialog()?.nativeElement.close();
        this.opened.set(false);
    }
    choose(value: string) {
        if (!this.busy()) {
            this.prompt = value;
            this.input()?.nativeElement.focus();
        }
    }
    newChat() {
        if (this.busy())
            return;
        this.voice.reset(); this.live.close(); this.voiceDraft.set(false);
        this.rememberChat();
        this.messages.set([]);
        this.conversationId = null;
        this.saveConversation();
        this.prompt = "";
        this.error.set("");
        this.failedPrompt = "";
        this.needsSignIn.set(false);
        this.cartFeedback.set("");
        this.checkoutVisible.set(false);
        this.trackingOrderId.set(null);
        this.input()?.nativeElement.focus();
    }
    send() {
        const value = this.prompt.trim();
        if (!value || value.length > 4000 || this.busy() || this.quota.exhausted() || this.voice.recording() || this.voice.pending())
            return;
        this.messages.update((items) => [...items, { role: "user", text: value, time: new Date().toISOString() }]);
        this.prompt = "";
        this.voiceDraft.set(false);
        this.failedKey=requestId();
        this.ask(value);
    }
    retry() {
        if (this.failedPrompt && !this.busy() && !this.quota.exhausted())
            this.ask(this.failedPrompt);
    }
    private ask(value: string) {
        this.busy.set(true);
        this.error.set("");
        this.needsSignIn.set(false);
        this.failedPrompt = value;
        this.scroll();
        // Always use the customer endpoint, including staff browsing the storefront.
        this.request = this.api
            .chat(value, this.conversationId, false, this.language,this.failedKey)
            .pipe(timeout(210000), takeUntilDestroyed(this.destroyRef))
            .subscribe({
            next: (response) => {
                this.conversationId = response.conversationId || this.conversationId;
                this.saveConversation();
                if (response.result.status === "FAILURE") {
                    // A definitive provider failure is already charged. An explicit retry is new work.
                    this.failedKey=requestId();
                    this.error.set(response.result.message || "The assistant could not respond. Please try again shortly.");
                    this.busy.set(false);
                    this.scroll();
                    return;
                }
                this.messages.update((items) => [...items, {...this.present(response),time:new Date().toISOString()}]);
                if(this.voice.autoPlay()) this.voice.play(this.present(response).text);
                this.rememberChat();
                if (response.cardType === "CartCard") this.openCheckout();
                this.failedPrompt = "";
                this.busy.set(false);
                this.scroll();
            },
            error: (e) => {
                if(e.status>=500 && e.status!==504)this.failedKey=requestId();
                if(e.status===404){this.conversationId=null;this.saveConversation();this.failedKey=requestId();}
                this.busy.set(false);
                this.needsSignIn.set(e.status === 401);
                this.error.set(e.status === 401
                    ? "Please sign in to continue chatting with the assistant."
                    : e.status === 404 ? "Your conversation expired. Please send your message again."
                    : e.error?.code === 'AI_DAILY_LIMIT_EXCEEDED'
                        ? 'You have reached your daily AI request limit. Please try again tomorrow.'
                    : e.status === 429
                        ? "The assistant is receiving too many requests. Please try again shortly."
                        : e.name === "TimeoutError"
                            ? "The assistant is taking longer than expected. Please try again."
                            : "The assistant could not respond. Please try again shortly.");
                this.scroll();
            },
        });
    }
    private present(response: ChatResponse): ChatMessage {
        const result = response.result;
        const productCard = response.cardType === "ProductList" ||
            response.cardType === "ProductCard";
        const payload = result.data && typeof result.data === 'object' && !Array.isArray(result.data)
            ? result.data as Record<string,unknown> : null;
        const rows = Array.isArray(result.data) ? result.data
            : Array.isArray(payload?.['content']) ? payload!['content'] as unknown[]
            : result.data ? [result.data] : [];
        return {
            role: "assistant",
            text: result.message || "No response was returned.",
            cardType: response.cardType,
            data: !productCard && !['ConfirmationCard','KnowledgeCard'].includes(response.cardType) ? result.data : undefined,
            intent: result.intent,
            ordersList: response.cardType === 'OrderList' && result.status === 'SUCCESS',
            orderId: !!this.auth.session() && response.cardType === 'OrderCard' && result.status === 'SUCCESS'
                && typeof (payload?.['id'] ?? payload?.['orderId']) === 'number'
                && Number.isSafeInteger(payload?.['id'] ?? payload?.['orderId'])
                && Number(payload?.['id'] ?? payload?.['orderId']) > 0
                ? Number(payload?.['id'] ?? payload?.['orderId']) : undefined,
            confirmationId: response.cardType === 'ConfirmationCard' && result.data && typeof result.data === 'object' && typeof (result.data as Record<string, unknown>)['confirmationId'] === 'string'
                ? (result.data as Record<string, unknown>)['confirmationId'] as string : undefined,
            confirmationParameters: response.cardType === 'ConfirmationCard' ? this.confirmationSummary(result.data) : undefined,
            paymentOrderId: response.cardType === 'PaymentStatusCard' && result.data && typeof result.data === 'object' && typeof (result.data as Record<string, unknown>)['orderId'] === 'number'
                ? (result.data as Record<string, unknown>)['orderId'] as number : undefined,
            suggestions: (response.suggestions || [])
                .filter((s) => typeof s === "string")
                .slice(0, 4),
            products: productCard
                ? rows
                    .map((row) => toChatProduct(row))
                    .filter((p): p is ChatProduct => !!p)
                    .slice(0, 6)
                : [],
            rows: !productCard && response.cardType !== "ConfirmationCard"
                ? rows
                    .flatMap((row) => {
                    if (!row || typeof row !== "object")
                        return [];
                    const r = row as Record<string, unknown>;
                    const title = r["order_number"] ??
                        r["orderNumber"] ??
                        r["return_number"] ?? r["returnId"] ?? r["return_id"] ??
                        r["title"];
                    const status = response.cardType === "NotificationList" ? r["message"] ?? r["status"] : r["status"] ?? r["message"];
                    return typeof title === "string" && typeof status === "string"
                        ? [{ title, detail: status, orderId: (response.cardType === "OrderCard" || response.cardType === "OrderList") && typeof r["id"] === "number" ? r["id"] as number : undefined }]
                        : [];
                })
                    .slice(0, 10)
                : [],
        };
    }
    private restoreConversation(user:number|null):string|null {
        if(user===null)return null;
        try {const id=sessionStorage.getItem('eshop.ai.conversation.'+user);return id&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)?id:null;}catch{return null;}
    }
    private saveConversation(){
        const user=this.auth.session()?.id;if(!user)return;
        try{const key='eshop.ai.conversation.'+user;if(this.conversationId)sessionStorage.setItem(key,this.conversationId);else sessionStorage.removeItem(key);}catch{/* Server ownership remains authoritative when browser storage is unavailable. */}
    }
    private confirmationSummary(value: unknown) {
        if (!value || typeof value !== 'object') return '';
        const card = value as Record<string, unknown>, parameters = card['parameters'] as Record<string, unknown> | undefined;
        const labels: Record<string,string> = {skuId:'SKU',quantity:'Quantity',cartItemId:'Cart item',addressId:'Address',paymentMethod:'Payment method',orderNumber:'Order',orderId:'Order'};
        const parts = Object.entries(parameters || {}).filter(([key]) => labels[key]).map(([key,v]) => labels[key] + ': ' + String(v));
        const preview = card['preview'] as Record<string,unknown> | undefined;
        const cart = preview?.['cart'] as Record<string,unknown> | undefined;
        if (typeof cart?.['total_price'] === 'number') parts.push('Reviewed total: $' + cart['total_price']);
        if (typeof preview?.['paymentMethod'] === 'string') parts.push('Payment method: ' + preview['paymentMethod']);
        return parts.join(' · ') || this.productText('Review this action before confirming.', 'សូមពិនិត្យសកម្មភាពនេះមុនបញ្ជាក់។');
    }
    details(product: {id: number;skuId?:number}) {
        if(this.live.isConnected()){void this.live.selectProduct(product.id,product.skuId);return;}
        if (this.busy()) return;
        this.busy.set(true); this.error.set('');
        const details = this.auth.session() ? this.api.tool('PRODUCT_DETAIL',{id:product.id},requestId(),this.conversationId).pipe(map(result => {
            if (result.status !== 'SUCCESS') throw new Error('Product unavailable'); return result.data;
        })) : this.catalog.detail(product.id);
        this.request = details.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: value => {
                const card = value && typeof value === "object" && (value as Record<string,unknown>)["is_active"] === false ? null : toChatProduct(value);
                if (card) this.messages.update(items => [...items, {role: 'assistant', text: card.description || card.name, cardType: 'ProductCard', products: [card]}]);
                else this.error.set(this.productText('Product details are unavailable.', 'មិនអាចបង្ហាញព័ត៌មានផលិតផលបានទេ។'));
                this.busy.set(false); this.scroll();
            },
            error: () => { this.busy.set(false); this.error.set(this.productText('Could not load current product details.', 'មិនអាចទាញយកព័ត៌មានផលិតផលបានទេ។')); }
        });
    }
    photo(event: Event) {
        const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = '';
        if (!file || this.busy()) return;
        if (!this.auth.session()) { this.needsSignIn.set(true); this.error.set('Please sign in to use photo recognition.'); return; }
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
            this.error.set('Choose a JPEG, PNG or WebP image up to 8 MB.'); return;
        }
        this.busy.set(true); this.error.set('');
        this.request = this.api.visual(file).pipe(map(response=>{
            if(response.status!=='SUCCESS'||!response.data||typeof response.data!=='object'||!Array.isArray((response.data as ImageMatches).candidates))throw new Error('Visual recognition unavailable');
            return response.data as ImageMatches;
        }), timeout(60000), takeUntilDestroyed(this.destroyRef)).subscribe({
            next: result => {
                this.messages.update(items => [...items, {role:'assistant', text: result.candidates.length
                    ? this.productText('Select the catalog product that matches your photo. Recognition is a suggestion.', 'សូមជ្រើសផលិតផលដែលត្រូវនឹងរូបថតរបស់អ្នក។') : result.message,
                    visualCandidates: result.candidates.map(c => ({productId:c.productId,name:c.name,confidence:c.confidence}))}]);
                this.busy.set(false); this.scroll();
            },
            error: () => { this.busy.set(false); this.error.set('Visual recognition is unavailable. Please search by name.'); }
        });
    }
    confirmAction(message: ChatMessage) {
        if (!message.confirmationId || this.busy() || !this.auth.session()) return;
        this.busy.set(true); this.error.set('');
        this.request = this.api.confirm(message.confirmationId,this.conversationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: result => {
                message.confirmationId = undefined;
                this.live.refreshAfterConfirmation();
                const intent = result.intent || '';
                const cardType = ['PRODUCT_DETAIL','PRODUCT_VARIANTS'].includes(intent) ? 'ProductCard'
                    : intent.startsWith('CART_') || intent === 'CHECKOUT_PREVIEW' ? 'CartCard'
                    : intent.startsWith('PAYMENT_') ? 'PaymentStatusCard' : 'OrderCard';
                this.messages.update(items => [...items, this.present({conversationId:this.conversationId || '',cardType,suggestions:[],result})]);
                if (intent.startsWith('CART_')) { this.openCheckout(); this.checkout()?.load(); }
                this.busy.set(false); this.scroll();
            }, error: () => { this.busy.set(false); this.error.set('The action result is unknown. Check its current state before trying again.'); }
        });
    }
    productText(english: string, khmer: string) { return this.language === 'km' ? khmer : english; }
    selectVariant(product: ChatProduct, id: number) {
        const variant = product.variants.find(v => v.id === Number(id));
        if (!variant)
            return;
        if(this.live.isConnected())void this.live.selectProduct(product.id,variant.id);
        Object.assign(product, { skuId: variant.id, price: variant.price, originalPrice: variant.originalPrice, promotion: variant.promotion, discount:variant.discount,promotionStartAt:variant.promotionStartAt,promotionEndAt:variant.promotionEndAt, attributes: variant.attributes, available: variant.available, quantity: 1 });
    }
    validQuantity(product: ChatProduct) {
        return Number.isSafeInteger(product.quantity) && product.quantity > 0 && product.quantity <= Math.min(product.available ?? 0, 999);
    }
    cartLabels() {
        const labels: Record<number, {
            name: string;
            image: string;
        }> = {};
        for (const message of this.messages())
            for (const p of message.products || [])
                for (const sku of p.variants)
                    labels[sku.id] = { name: p.name + (p.variants.length > 1 ? ' · ' + sku.label : ''), image: p.image };
        return labels;
    }
    syncProductOrder(message:ChatMessage){this.live.displayedProducts(this.displayedProducts(message).map(p=>p.id));}
    displayedProducts(message: ChatMessage) {
        const products = [...(message.products || [])].filter(product => !message.inStockOnly || (product.available ?? 0) > 0);
        if (message.productSort === 'name') products.sort((a,b)=>a.name.localeCompare(b.name));
        if (message.productSort === 'price-asc' || message.productSort === 'price-desc') {
            const direction=message.productSort === 'price-asc' ? 1 : -1;
            products.sort((a,b)=>a.price === undefined ? (b.price === undefined ? 0 : 1) : b.price === undefined ? -1 : direction*(a.price-b.price));
        }
        return products;
    }
    openCheckout() { this.checkoutVisible.set(true); this.scroll(); }
    cartLocked() { return this.cartBusy() !== null || !!this.checkout()?.loading() || !!this.checkout()?.reviewing() || !!this.checkout()?.pending(); }
    add(product: ChatProduct) {
        if (!product.skuId || this.cartLocked() || !this.validQuantity(product))
            return;
        if (!this.auth.session()) {
            this.close();
            void this.router.navigate(["/auth"], {
                queryParams: { returnUrl: "/shop/" + product.id },
            });
            return;
        }
        if (this.attempt.read(this.auth.userId())) {
            this.cartFeedback.set('Resolve your pending checkout before changing the cart.');
            this.openCheckout();
            return;
        }
        const previous=this.pendingCartKeys.get(product.skuId);
        if(previous&&previous.quantity!==product.quantity){product.quantity=previous.quantity;this.cartFeedback.set('Retry the pending quantity first, then review your cart before making another change.');return;}
        const pending=previous || {key:requestId(),quantity:product.quantity};
        this.pendingCartKeys.set(product.skuId,pending);
        this.cartBusy.set(product.skuId);
        this.cartFeedback.set("");
        this.cartRequest = this.cart
            .add(product.skuId, product.quantity,pending.key)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
            next: (cart) => {
                this.store.cartCount.set(cart.total_items);
                this.pendingCartKeys.delete(product.skuId!);
                this.cartFeedback.set(product.name + this.productText(" added to cart.", " ត្រូវបានបន្ថែមទៅកន្ត្រក។"));
                this.cartBusy.set(null);
                this.checkout()?.load();
            },
            error: (error) => {
                const uncertain=!error.status||error.status>=500||error.status===408||error.status===504;
                if(!uncertain)this.pendingCartKeys.delete(product.skuId!);
                this.cartFeedback.set(uncertain ? this.productText("Cart result is uncertain. Retry this same item and quantity to check safely.","សូមព្យាយាមផលិតផល និងចំនួនដដែល ដើម្បីពិនិត្យលទ្ធផលកន្ត្រក។") : this.productText("Could not add this item. Check stock and try again.", "មិនអាចបន្ថែមផលិតផលនេះបានទេ។ សូមពិនិត្យស្តុក។"));
                this.cartBusy.set(null);
            },
        });
    }
    onKey(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            this.send();
        }
    }
    private scroll() {
        setTimeout(() => {
            const log = this.log()?.nativeElement;
            if (log)
                log.scrollTop = log.scrollHeight;
        });
    }
}
