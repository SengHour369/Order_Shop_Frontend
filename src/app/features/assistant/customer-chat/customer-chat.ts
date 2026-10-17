import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { AssistantQuota } from '../assistant-quota';
import { RichMessage } from '../rich-message';
import { DragLauncher } from '../floating/drag-launcher';
import { LauncherWelcome } from '../floating/launcher-welcome';
import { conversationId as requestId } from '../../../shared/utils/conversation-id';
import { afterRenderEffect, Component, DestroyRef, ElementRef, effect, inject, signal, viewChild, } from "@angular/core";
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
    imports: [LauncherWelcome, RichMessage, DragLauncher, TranslatePipe, FormsModule, RouterLink, CurrencyPipe, DecimalPipe, Icon, ProductImage, ChatCheckout, PaymentQr, ChatOrder],
    templateUrl: "./customer-chat.html",
    styleUrl: "./customer-chat.css",
})
export class CustomerChat {
    readonly auth = inject(AuthService);
    readonly quota=inject(AssistantQuota);
    private failedKey=requestId();
    readonly router = inject(Router);
    private readonly api = inject(AssistantApi);
    private readonly cart = inject(CartApi);
    private readonly catalog = inject(CatalogApi);
    private readonly attempt = inject(CheckoutAttempt);
    private readonly store = inject(CustomerStore);
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
    readonly shortcuts = [
        {
            label: "Find products",
            icon: "search",
            tone: "blue",
            prompt: "Find wireless headphones under $50",
        },
        {
            label: "Track my order",
            icon: "box",
            tone: "orange",
            prompt: "What is the status of my latest order?",
        },
        {
            label: "Return & refund",
            icon: "refresh",
            tone: "pink",
            prompt: "Explain the return and refund policy",
        },
        {
            label: "Check stock",
            icon: "bag",
            tone: "green",
            prompt: "Find headphones and show available stock",
        },
        {
            label: "Compare products",
            icon: "chart",
            tone: "blue",
            prompt: "Help me compare headphones",
        },
        { label: "Order & payment", icon: "cart", tone: "purple", prompt: "How do I place an order and pay?" },
    ];
    constructor() {
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
                this.account = id;
                this.request?.unsubscribe();
                this.cartRequest?.unsubscribe();
                this.cartBusy.set(null);
                this.pendingCartKeys.clear();
                this.messages.set([]);
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
        this.messages.set([]);
        this.conversationId = null;
        this.saveConversation();
        this.prompt = "";
        this.error.set("");
        this.failedPrompt = "";
        this.needsSignIn.set(false);
        this.cartFeedback.set("");
        this.checkoutVisible.set(false);
        this.input()?.nativeElement.focus();
    }
    send() {
        const value = this.prompt.trim();
        if (!value || value.length > 4000 || this.busy() || this.quota.exhausted())
            return;
        this.messages.update((items) => [...items, { role: "user", text: value }]);
        this.prompt = "";
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
                this.messages.update((items) => [...items, this.present(response)]);
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
    details(product: {id: number}) {
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
        this.request = this.api.confirm(message.confirmationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: result => {
                message.confirmationId = undefined;
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
        Object.assign(product, { skuId: variant.id, price: variant.price, originalPrice: variant.originalPrice, promotion: variant.promotion, attributes: variant.attributes, available: variant.available, quantity: 1 });
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
