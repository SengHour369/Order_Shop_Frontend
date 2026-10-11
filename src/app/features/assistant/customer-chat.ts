import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyPipe } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subscription, timeout } from "rxjs";
import { AssistantApi, ChatResponse } from "./assistant.api";
import { AuthService } from "../../core/auth/auth.service";
import { CustomerStore } from "../../core/state/customer.store";
import { CartApi } from "../cart/cart.api";
import { Icon } from "../../shared/icon";
import { ProductImage } from "../../shared/product-image";

interface ChatProduct {
  id: number;
  name: string;
  skuId?: number;
  price?: number;
  originalPrice?: number;
  available?: number;
  image: string;
}
interface Message {
  role: "user" | "assistant";
  text: string;
  products?: ChatProduct[];
  suggestions?: string[];
  cardType?: string;
  rows?: { title: string; detail: string }[];
}
@Component({
  selector: "app-customer-chat",
  imports: [FormsModule, RouterLink, CurrencyPipe, Icon, ProductImage],
  templateUrl: "./customer-chat.html",
  styleUrl: "./customer-chat.css",
})
export class CustomerChat {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly api = inject(AssistantApi);
  private readonly cart = inject(CartApi);
  private readonly store = inject(CustomerStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>("chatDialog");
  readonly input = viewChild<ElementRef<HTMLTextAreaElement>>("messageInput");
  readonly log = viewChild<ElementRef<HTMLElement>>("chatLog");
  readonly opened = signal(false);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly needsSignIn = signal(false);
  readonly messages = signal<Message[]>([]);
  readonly cartBusy = signal<number | null>(null);
  readonly cartFeedback = signal("");
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
    if (this.busy()) return;
    this.messages.set([]);
    this.conversationId = null;
    this.prompt = "";
    this.error.set("");
    this.failedPrompt = "";
    this.needsSignIn.set(false);
    this.cartFeedback.set("");
    this.input()?.nativeElement.focus();
  }
  send() {
    const value = this.prompt.trim();
    if (!value || value.length > 4000 || this.busy()) return;
    this.messages.update((items) => [...items, { role: "user", text: value }]);
    this.prompt = "";
    this.ask(value);
  }
  retry() {
    if (this.failedPrompt && !this.busy()) this.ask(this.failedPrompt);
  }
  private ask(value: string) {
    this.busy.set(true);
    this.error.set("");
    this.needsSignIn.set(false);
    this.failedPrompt = value;
    this.scroll();
    // Always use the customer endpoint, including staff browsing the storefront.
    this.request = this.api
      .chat(value, this.conversationId, false, this.language)
      .pipe(timeout(210000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.conversationId = response.conversationId || this.conversationId;
          if (response.result.status === "FAILURE") {
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
          this.busy.set(false);
          this.needsSignIn.set(e.status === 401);
          this.error.set(
            e.status === 401
              ? "Please sign in to continue chatting with the assistant."
              : e.status === 429
                ? "The assistant is receiving too many requests. Please try again shortly."
                : e.name === "TimeoutError"
                  ? "The assistant is taking longer than expected. Please try again."
                  : "The assistant could not respond. Please try again shortly.",
          );
          this.scroll();
        },
      });
  }
  private present(response: ChatResponse): Message {
    const result = response.result;
    const productCard =
      response.cardType === "ProductList" ||
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
            .map((row) => this.product(row))
            .filter((p): p is ChatProduct => !!p)
            .slice(0, 6)
        : [],
      rows:
        !productCard && response.cardType !== "ConfirmationCard"
          ? rows
              .flatMap((row) => {
                if (!row || typeof row !== "object") return [];
                const r = row as Record<string, unknown>;
                const title =
                  r["order_number"] ??
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
  private product(value: unknown): ChatProduct | null {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    if (typeof row["id"] !== "number" || typeof row["name"] !== "string")
      return null;
    const skus = Array.isArray(row["skus"])
      ? (row["skus"] as Record<string, unknown>[])
      : [];
    const sku = skus.find((s) => s["is_default"] === true) || skus[0];
    const price =
      sku?.["effectivePrice"] ??
      sku?.["finalPrice"] ??
      sku?.["basePrice"] ??
      sku?.["price"];
    const base = sku?.["basePrice"] ?? sku?.["price"];
    const available = sku?.["available"] ?? sku?.["quantity"];
    const images = row["main_image"];
    return {
      id: row["id"],
      name: row["name"],
      skuId: typeof sku?.["id"] === "number" ? sku["id"] : undefined,
      price: typeof price === "number" ? price : undefined,
      originalPrice: typeof base === "number" ? base : undefined,
      available: typeof available === "number" ? available : undefined,
      image:
        Array.isArray(images) && typeof images[0] === "string"
          ? images[0]
          : "/images/product-placeholder.svg",
    };
  }
  add(product: ChatProduct) {
    if (!product.skuId || this.cartBusy() || (product.available ?? 0) < 1)
      return;
    if (!this.auth.session()) {
      this.close();
      void this.router.navigate(["/auth"], {
        queryParams: { returnUrl: "/shop/" + product.id },
      });
      return;
    }
    this.cartBusy.set(product.skuId);
    this.cartFeedback.set("");
    this.cartRequest = this.cart
      .add(product.skuId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cart) => {
          this.store.cartCount.set(cart.total_items);
          this.cartFeedback.set(product.name + " added to cart.");
          this.cartBusy.set(null);
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
      if (log) log.scrollTop = log.scrollHeight;
    });
  }
}
