import { TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { CustomerChat } from "./customer-chat";
import { AuthService } from "../../core/auth/auth.service";
import { Session } from "../../core/api/models";

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
  afterEach(() => http.verify());
  function create() {
    const fixture = TestBed.createComponent(CustomerChat);
    fixture.detectChanges();
    return fixture;
  }
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
      .flush(
        response(
          [
            {
              id: 24,
              name: "Headphones",
              skus: [
                { id: 88, basePrice: 49, effectivePrice: 39, available: 3 },
              ],
            },
          ],
          "ProductList",
        ),
      );
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
  it("shows checkout guidance without placing an order or taking payment", () => {
    const fixture=create(); const chat=fixture.componentInstance;
    chat.prompt="How do I place an order and pay?"; chat.send();
    http.expectOne('/api/ai/chat').flush(response(null, 'CheckoutGuide'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/cart"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/checkout"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/account/payments"]')).toBeTruthy();
    http.expectNone(r => r.url.includes('/checkout') || r.url.includes('/payments'));
  });
  it("keeps structured clarification responses and retries transport failures without duplicating the user bubble", () => {
    const chat = create().componentInstance;
    chat.prompt = "My order";
    chat.send();
    http
      .expectOne("/api/ai/chat")
      .flush(
        {
          ...response(),
          result: {
            executionId: "r",
            status: "NEEDS_INPUT",
            message: "Which order number?",
            data: null,
          },
        },
        { status: 422, statusText: "Unprocessable Entity" },
      );
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
