import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { AssistantQuota } from '../assistant-quota';
import { RichMessage } from '../rich-message';
import { DragLauncher } from '../floating/drag-launcher';
import { LauncherWelcome } from '../floating/launcher-welcome';
import { conversationId as requestId } from '../../../shared/utils/conversation-id';
import { afterRenderEffect, Component, DestroyRef, ElementRef, effect, inject, signal, viewChild, } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyPipe } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subscription, timeout } from "rxjs";
import { AssistantApi, ChatResponse } from "../assistant.api";
import { AuthService } from "../../../core/auth/auth.service";
import { CustomerStore } from "../../../core/stores/customer.store";
import { CartApi } from "../../cart/cart.api";
import { Icon } from "../../../shared/components/icon";
import { ProductImage } from "../../../shared/components/product-image";
import { ChatMessage, ChatProduct, toChatProduct } from "./chat-message";
import { ChatCheckout } from '../chat-checkout/chat-checkout';
import { CheckoutAttempt } from '../../checkout/checkout-attempt';
@Component({
    selector: "app-customer-chat",
    imports: [LauncherWelcome, RichMessage, DragLauncher, TranslatePipe, FormsModule, RouterLink, CurrencyPipe, Icon, ProductImage, ChatCheckout],
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
    readonly cartFeedback = signal("");
    readonly checkoutVisible = signal(false);
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
                this.messages.set([]);
                this.conversationId = null;
                this.prompt = "";
                this.failedPrompt = "";
                this.busy.set(false);
                this.error.set("");
                this.needsSignIn.set(false);
                this.cartFeedback.set("");
                this.checkoutVisible.set(false);
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
                if (response.result.status === "FAILURE") {
                    // A definitive provider failure is already charged. An explicit retry is new work.
                    this.failedKey=requestId();
                    this.error.set(response.result.message || "The assistant could not respond. Please try again shortly.");
                    this.busy.set(false);
                    this.scroll();
                    return;
                }
                this.messages.update((items) => [...items, this.present(response)]);
                this.failedPrompt = "";
                this.busy.set(false);
                this.scroll();
            },
            error: (e) => {
                if(e.status>=500 && e.status!==504)this.failedKey=requestId();
                this.busy.set(false);
                this.needsSignIn.set(e.status === 401);
                this.error.set(e.status === 401
                    ? "Please sign in to continue chatting with the assistant."
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
        const rows = Array.isArray(result.data)
            ? result.data
            : result.data
                ? [result.data]
                : [];
        return {
            role: "assistant",
            text: result.message || "No response was returned.",
            cardType: response.cardType,
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
                        r["return_number"] ??
                        r["title"];
                    const status = r["status"] ?? r["message"];
                    return typeof title === "string" && typeof status === "string"
                        ? [{ title, detail: status }]
                        : [];
                })
                    .slice(0, 10)
                : [],
        };
    }
    selectVariant(product: ChatProduct, id: number) {
        const variant = product.variants.find(v => v.id === Number(id));
        if (!variant)
            return;
        Object.assign(product, { skuId: variant.id, price: variant.price, originalPrice: variant.originalPrice, available: variant.available, quantity: 1 });
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
        this.cartBusy.set(product.skuId);
        this.cartFeedback.set("");
        this.cartRequest = this.cart
            .add(product.skuId, product.quantity)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
            next: (cart) => {
                this.store.cartCount.set(cart.total_items);
                this.cartFeedback.set(product.name + " added to cart.");
                this.cartBusy.set(null);
                this.checkout()?.load();
            },
            error: () => {
                this.cartFeedback.set("Could not add this item. Please try again.");
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
