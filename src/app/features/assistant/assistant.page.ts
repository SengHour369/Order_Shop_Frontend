import { AssistantQuota } from './assistant-quota';
import { LanguageSelect } from "../../core/i18n/language-select";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { conversationId } from "../../shared/utils/conversation-id";
import { Component, DestroyRef, ElementRef, inject, OnInit, signal, viewChild, Injectable, effect } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { catchError, forkJoin, of } from "rxjs";
import { FormsModule } from "@angular/forms";
import { DatePipe, JsonPipe } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { AdminApi, InventorySummary, OrderSummary } from "../admin/api/admin.api";
import { MonthlyReport } from "../admin/reports/report.models";
import { AssistantApi, AiResult, AdminChatSummary, AdminTranscript, AssistantInfo } from "./assistant.api";
import { AssistantProduct } from './assistant-product';
import { AuthService } from "../../core/auth/auth.service";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
import { Icon } from "../../shared/components/icon";

export interface ChatMessage {
  requestKey?:string;
  feedback?:'up'|'down';
  role: "user" | "assistant";
  text: string;
  time: Date;
  result?: AiResult;
  suggestions?: string[];
  comparison?: boolean;
}
export interface Conversation {
  localId: string;
  id: string | null;
  title: string;
  time: Date;
  messages: ChatMessage[];
}

@Injectable({providedIn:'root'})
class AssistantSession {
  conversations=signal<Conversation[]>([]);current=signal<Conversation|null>(null);
  private auth=inject(AuthService);private account:number|null|undefined=this.auth.session()?.id??null;
  constructor(){effect(()=>{const account=this.auth.session()?.id??null;if(account!==this.account){this.account=account;this.conversations.set([]);this.current.set(null);}});}
}
@Component({
  imports: [LanguageSelect, TranslatePipe, FormsModule, JsonPipe, DatePipe, RouterLink, Status, Icon],
  templateUrl: "./assistant.html",
  styleUrl: "./assistant.css",
})
export class AssistantPage extends PageState implements OnInit {
  private api = inject(AssistantApi);
  private adminApi = inject(AdminApi);
  private router = inject(Router);
  private lifetime = inject(DestroyRef);
  private chatScroll = viewChild<ElementRef<HTMLElement>>("chatScroll");
  private promptInput = viewChild<ElementRef<HTMLTextAreaElement>>("promptInput");
  private recentPanel = viewChild<ElementRef<HTMLElement>>("recentPanel");
  auth = inject(AuthService);
  quota=inject(AssistantQuota);
  mobileMenu = false;
  sidebarCollapsed = false;
  conversationDrawer = false;
  conversationSearch = '';
  history = signal<AdminChatSummary[]>([]);
  historyLoading = signal(false);
  historyError = signal('');
  modelInfo = signal<AssistantInfo | null>(null);
  modelError = signal('');
  language = 'en';
  renameMode = false;
  conversationTitle = '';
  attachmentName = '';
  attachmentError = '';
  speechAvailable = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  listening = signal(false);
  private speech: { start(): void; stop(): void; onresult: ((event: { results: { transcript: string }[][] }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; lang: string } | null = null;
  navGroups = [
    { title: 'Overview', items: [['Dashboard','home','/admin']] },
    { title: 'Orders', items: [['Orders','bag','/admin/orders'],['Returns','refresh','/admin/returns'],['Cancellations','close','/admin/cancellations']] },
    { title: 'Payments', items: [['Payment Details','card','/admin/payments'],['Refunds','refresh','/admin/refunds'],['Transactions','list','/admin/transactions']] },
    { title: 'Customers', items: [['Customers','user','/admin/customers'],['Customer Groups','user','/admin/customer-groups']] },
    { title: 'Products', items: [['Products','box','/admin/products'],['Categories','list','/admin/categories'],['Brands','tag','/admin/brands'],['Inventory','box','/admin/inventory'],['Promotions','tag','/admin/promotions']] },
    { title: 'Reports', items: [['Sales Report','chart','/admin/sales-report'],['Payment Report','card','/admin/payment-report'],['Tax Report','list','/admin/tax-report']] },
    { title: 'Settings', items: [['Settings','settings','/admin/settings'],['Users & Roles','user','/admin/users']] },
  ];
  showAllActions = false;
  searchQuery = "";
  summaryLoading = signal(false);
  summaryError = signal(false);
  summaryOrders = signal<OrderSummary | null>(null);
  summaryInventory = signal<InventorySummary | null>(null);
  summarySales = signal<MonthlyReport[] | null>(null);
  summaryPayments = signal<MonthlyReport[] | null>(null);
  year = new Date().getFullYear();
  navigation = [
    { label: "Dashboard", icon: "home", path: "/admin" },
    { label: "Orders", icon: "list", path: "/admin/orders" },
    { label: "Products", icon: "box", path: "/admin/products" },
    { label: "Categories", icon: "user", path: "/admin/categories" },
    { label: "Inventory", icon: "wallet", path: "/admin/inventory" },
    { label: "Promotions", icon: "tag", path: "/admin/promotions" },
    { label: "Customers", icon: "user", path: "/admin/customers" },
    { label: "Returns", icon: "refresh", path: "/admin/returns" },
    { label: "Payments", icon: "card", path: "/admin/payments" },
    { label: "Notifications", icon: "bell", path: "/account/notifications" },
  ];
  extraActions = [
    ["Order Summary", "list", "Show order counts by status", "green"],
    ["Store Policies", "shield", "Explain the return policy", "purple"],
  ];
  prompt = "";
  topic = "Product Search";
  private sessionState=inject(AssistantSession);
  conversations=this.sessionState.conversations;
  current=this.sessionState.current;
  showTools = false;
  showSources = false;
  showAllConversations = false;
  administrator = this.auth.session()?.role === "ADMIN";
  shortcuts = [
    {
      title: "Check Orders",
      description: "Show today’s orders",
      icon: "list",
      color: "blue",
      prompt: "Show orders for today",
    },
    {
      title: "Product Search",
      description: "Find laptops under $800",
      icon: "search",
      color: "purple",
      prompt: "Find laptops under $800",
    },
    {
      title: "Inventory",
      description: "Which products are low in stock?",
      icon: "bag",
      color: "orange",
      prompt: "Show low stock items",
    },
    {
      title: "Promotion",
      description: "Show active promotions",
      icon: "tag",
      color: "pink",
      prompt: "Show active promotions",
    },
    {
      title: "Returns",
      description: "How does return policy work?",
      icon: "refresh",
      color: "magenta",
      prompt: "Explain the return policy",
    },
    {
      title: "Analytics",
      description: "Sales summary this month",
      icon: "chart",
      color: "blue",
      prompt: "Show revenue summary for this month",
    },
  ];
  actions = [
    ["Search Products", "search", "Search products", "blue"],
    ["Check Orders", "cart", "Show orders for today", "purple"],
    ["Low Stock Items", "cart", "Show low stock items", "orange"],
    ["Active Promotions", "tag", "Show active promotions", "pink"],
    ["Customer Info", "user", "Find customer information", "blue"],
    ["Return Requests", "refresh", "Show return requests", "pink"],
    ["Sales Analytics", "chart", "Show revenue summary for today", "blue"],
    ["Generate Report", "list", "Show order counts by status", "blue"],
  ];
  ngOnInit() {
    if (this.administrator) this.loadWorkspace();
    this.lifetime.onDestroy(() => this.speech?.stop());
  }
  loadWorkspace() {
    this.historyLoading.set(true);
    this.historyError.set('');
    this.api.conversations().pipe(takeUntilDestroyed(this.lifetime)).subscribe({
      next: rows => { this.history.set(rows); this.historyLoading.set(false); },
      error: () => { this.historyError.set('Conversation history is unavailable. Your current chat still works.'); this.historyLoading.set(false); }
    });
    this.api.info().pipe(takeUntilDestroyed(this.lifetime)).subscribe({
      next: info => { this.modelInfo.set(info); this.modelError.set(''); },
      error: () => this.modelError.set('Model information is unavailable.')
    });
  }
  conversationGroups() {
    const local = this.conversations().map(item => ({ id: item.id || item.localId, title: item.title, time: item.time.toISOString(), preview: item.messages[0]?.text || '' }));
    const ids = new Set(local.map(item => item.id));
    const rows = [...local, ...this.history().filter(item => !ids.has(item.id))]
      .filter(item => (item.title + ' ' + item.preview).toLowerCase().includes(this.conversationSearch.trim().toLowerCase()))
      .sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups = new Map<string, AdminChatSummary[]>();
    for (const item of rows) {
      const date = new Date(item.time);
      const label = date.toDateString() === today ? 'Today' : date.toDateString() === yesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { month:'short',day:'numeric',year:'numeric' });
      groups.set(label, [...(groups.get(label) || []), item]);
    }
    return [...groups].map(([label, items]) => ({ label, items }));
  }
  selectConversation(item: AdminChatSummary) {
    if (this.busy()) return;
    const local = this.conversations().find(value => value.id === item.id || value.localId === item.id);
    if (local) { this.open(local); this.conversationDrawer = false; return; }
    this.run(this.api.conversation(item.id), transcript => {
      const conversation = this.fromTranscript(transcript);
      this.conversations.update(items => [conversation, ...items]);
      this.open(conversation); this.conversationDrawer = false; this.scrollChat();
    });
  }
  private fromTranscript(item: AdminTranscript): Conversation {
    return { localId: item.id, id: item.id, title: item.title, time: new Date(item.time), messages: item.messages.map(turn => ({ ...turn, time: new Date(turn.time) })) };
  }
  beginRename() { this.conversationTitle = this.current()?.title || ''; this.renameMode = true; }
  renameConversation() {
    const conversation = this.current(); const title = this.conversationTitle.trim();
    if (!conversation || !title || title.length > 80 || this.busy()) return;
    const update = () => {
      conversation.title = title; this.current.set({ ...conversation });
      this.conversations.update(items => items.map(item => item.localId === conversation.localId ? { ...conversation } : item));
      this.renameMode = false;
    };
    if (conversation.id) this.run(this.api.rename(conversation.id, title), update); else update();
  }
  products(data: unknown): AssistantProduct[] {
    let values: unknown[] = [];
    if (Array.isArray(data)) values = data;
    else if (data && typeof data === 'object') {
      const object = data as Record<string, unknown>;
      if (Array.isArray(object['skus'])) values = [object];
      else for (const key of ['content','items','products','records','data','payload']) {
        const result = this.products(object[key]); if (result.length) return result;
      }
    }
    return values.filter((value): value is Record<string, unknown> => !!value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>)['skus']) && typeof (value as Record<string, unknown>)['name'] === 'string' && Number.isInteger((value as Record<string, unknown>)['id']))
      .map(value => {
        const skus = value['skus'] as Record<string, unknown>[];
        const sku = skus.find(item => item['is_default'] === true) || skus[0];
        const images = value['images'] || value['main_image'];
        const number = (value: unknown) => value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
        return { id: Number(value['id']), name: String(value['name']), description: typeof value['description'] === 'string' ? value['description'] : '', image: Array.isArray(images) && typeof images[0] === 'string' ? images[0] : '/images/product-placeholder.svg', skuId: number(sku?.['id']), price: number(sku?.['effectivePrice'] ?? sku?.['finalPrice'] ?? sku?.['basePrice'] ?? sku?.['price']), available: number(sku?.['available'] ?? sku?.['quantity']), sku: String(sku?.['sku'] || '') };
      });
  }
  async attachText(event: Event) {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
    this.attachmentError = '';
    if (!file || this.busy()) return;
    if (!/\.(txt|csv|md|json)$/i.test(file.name) || file.size > 12000) { this.attachmentError = 'Choose a text, CSV, Markdown or JSON file under 12 KB.'; return; }
    try {
      const text = await file.text();
      const prompt = this.prompt + '\n\nAttached text (' + file.name + '):\n' + text;
      if (prompt.length > 4000) { this.attachmentError = 'This file is too long. Chat messages support up to 4,000 characters.'; return; }
      this.prompt = prompt.trim(); this.attachmentName = file.name;
    } catch { this.attachmentError = 'Could not read this file.'; }
  }
  dictate() {
    if (this.listening()) { this.speech?.stop(); return; }
    if (this.busy()) return;
    type Recognition = NonNullable<AssistantPage['speech']>;
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) { this.attachmentError = 'Voice input is not supported by this browser. Please type your message.'; return; }
    const speech = new Recognition(); this.speech = speech; speech.lang = this.language === 'km' ? 'km-KH' : 'en-US';
    speech.onresult = event => { this.prompt = (this.prompt + ' ' + event.results[0][0].transcript).trim().slice(0,4000); };
    speech.onerror = () => { this.attachmentError = 'Voice input could not start. Check microphone access or type your message.'; this.listening.set(false); };
    speech.onend = () => this.listening.set(false);
    try { speech.start(); this.listening.set(true); } catch { speech.onerror(); }
  }
  loadSummary() {
    if (!this.administrator || this.summaryLoading()) return;
    this.summaryLoading.set(true);
    this.summaryError.set(false);
    const safe = <T>(source: import("rxjs").Observable<T>) => source.pipe(catchError(() => {
      this.summaryError.set(true);
      return of(null);
    }));
    forkJoin({
      orders: safe(this.adminApi.ordersSummary()),
      inventory: safe(this.adminApi.inventorySummary()),
      sales: safe(this.adminApi.monthlyReport("sales", this.year)),
      payments: safe(this.adminApi.monthlyReport("payment", this.year)),
    }).pipe(takeUntilDestroyed(this.lifetime)).subscribe(result => {
      this.summaryOrders.set(result.orders);
      this.summaryInventory.set(result.inventory);
      this.summarySales.set(result.sales);
      this.summaryPayments.set(result.payments);
      this.summaryLoading.set(false);
    });
  }
  private money(rows: MonthlyReport[] | null, average = false) {
    if (rows === null) return "—";
    const currencies = [...new Set(rows.map(row => row.currency || "Unspecified"))];
    if (currencies.length > 1) return "Multiple currencies";
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    const count = rows.reduce((sum, row) => sum + Number(row.count), 0);
    const currency = currencies[0];
    if (!currency || currency === "Unspecified") return rows.length ? "Currency unavailable" : "No sales yet";
    const amount = average ? (count ? total / count : 0) : total;
    return currency + " " + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  metrics() {
    const number = (value: number | undefined) => value == null ? "—" : value.toLocaleString("en-US");
    return [
      { label: "Total Sales", value: this.money(this.summarySales()), note: "Order value · " + this.year, icon: "wallet", color: "blue", path: "/admin/sales-report" },
      { label: "Orders", value: number(this.summaryOrders()?.totalOrders), note: "All time", icon: "bag", color: "green", path: "/admin/orders" },
      { label: "Average Order Value", value: this.money(this.summarySales(), true), note: "Per order · " + this.year, icon: "chart", color: "orange", path: "/admin/sales-report" },
      { label: "Units in Stock", value: number(this.summaryInventory()?.total_stock), note: "Current inventory", icon: "box", color: "purple", path: "/admin/inventory" },
      { label: "Refunded Orders", value: number(this.summaryOrders()?.refunded), note: "All time", icon: "refresh", color: "pink", path: "/admin/refunds" },
      { label: "Payments", value: this.money(this.summaryPayments()), note: "Reported payments · " + this.year, icon: "wallet", color: "teal", path: "/admin/payment-report" },
    ];
  }
  search() {
    const q = this.searchQuery.trim();
    if (!q) return;
    const route = /^ord/i.test(q) ? "/admin/orders" : q.includes("@") ? "/admin/customers" : "/admin/products";
    void this.router.navigate([this.administrator ? route : "/shop"], { queryParams: { q } });
  }
  scrollToRecent() {
    this.mobileMenu = false;
    this.recentPanel()?.nativeElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  private scrollChat() {
    setTimeout(() => {
      const element = this.chatScroll()?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }
  tools = [
    [
      "PRODUCT_SEARCH",
      "Search products by name or category",
      "search",
      "orange",
    ],
    ["PRODUCT_GET", "Get product details", "box", "green"],
    ["INVENTORY_LOW_STOCK", "Check low stock items", "bag", "orange"],
    ["ADMIN_ORDER_LIST", "Search orders", "list", "blue"],
    ["ORDER_GET", "Get order details", "cart", "orange"],
    ["ADMIN_PAYMENT_LIST", "Check payment records", "card", "blue"],
    ["ADMIN_RETURN_LIST", "Search return requests", "refresh", "purple"],
    ["PROMOTION_GET", "Get promotion information", "tag", "orange"],
    ["ADMIN_USER_LIST", "Get customer information", "user", "blue"],
    ["ADMIN_REVENUE_SUMMARY", "Get sales analytics", "chart", "blue"],
  ];
  sources = [
    ["Product Information", "box", "orange"],
    ["E-Shop Policies", "list", "blue"],
    ["FAQ", "help", "green"],
    ["Category Descriptions", "tag", "purple"],
    ["User Guide", "list", "orange"],
  ];
  choose(prompt: string) {
    if (!this.busy()) {
      this.prompt = prompt;
      this.promptInput()?.nativeElement.focus();
    }
  }
  newConversation() {
    if (this.busy()) return;
    this.current.set(null);
    this.prompt = "";
    this.attachmentName = '';
    this.conversationDrawer = false;
    this.renameMode = false;
    this.error.set("");
    this.scrollChat();
  }
  open(conversation: Conversation) {
    if (this.busy()) return;
    this.current.set(conversation);
    this.prompt = "";
    this.attachmentName = '';
    this.attachmentError = '';
    this.renameMode = false;
    this.error.set("");
  }
  send() {
    const prompt = this.prompt.trim();
    if (!prompt || prompt.length > 4000 || this.busy() || this.quota.exhausted()) return;
    this.speech?.stop();
    this.listening.set(false);
    let conversation = this.current();
    if (!conversation) {
      conversation = {
        localId: conversationId(),
        id: null,
        title: prompt.slice(0,80),
        time: new Date(),
        messages: [],
      };
      this.conversations.update((items) => [conversation!, ...items]);
    }
    const active = conversation;
    active.messages.push({ role: "user", text: prompt, time: new Date() });
    this.current.set({ ...active });
    this.prompt = "";
    this.attachmentName = '';
    this.attachmentError = '';
    this.scrollChat();
    this.run(
      this.api.chat(prompt, active.id, this.administrator, this.language),
      (response) => {
        active.id = response.conversationId;
        active.time = new Date();
        active.messages.push({
          role: "assistant",
          requestKey:response.requestKey,
          text: response.result.message,
          result: response.result,
          suggestions: response.suggestions,
          time: new Date(),
        });
        this.current.set({ ...active });
        this.conversations.update((items) =>
          items.map((item) =>
            item.localId === active.localId ? active : item,
          ),
        );
        this.scrollChat();
      },
    );
  }
  check(message: ChatMessage) {
    if (!message.result?.executionId || this.busy()) return;
    this.run(this.api.status(message.result.executionId), (progress) => {
      const result = progress as Partial<AiResult>;
      if (typeof result.status === "string") {
        message.result = { ...message.result!, ...result };
        if (typeof result.message === "string") message.text = result.message;
        this.current.update((current) => (current ? { ...current } : null));
      }
    });
  }
  records(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data))
      return data.filter((item) => item && typeof item === "object").map(item => {
        if (!Array.isArray(item.skus)) return item;
        const sku = item.skus.find((value: Record<string, unknown>) => value["is_default"] === true) || item.skus[0];
        return { product: item.name, price: sku?.effectivePrice ?? sku?.basePrice, available: sku?.available, id: item.id };
      });
    if (!data || typeof data !== "object") return [];
    const value = data as Record<string, unknown>;
    for (const key of ["content", "items", "products", "records", "data"]) {
      if (value[key] !== data) {
        const rows = this.records(value[key]);
        if (rows.length) return rows;
      }
    }
    return [];
  }
  columns(rows: Record<string, unknown>[]) {
    return [...new Set(rows.flatMap((row) => Object.keys(row)))]
      .filter((key) => !/password|token|secret/i.test(key))
      .slice(0, 5);
  }
  cell(value: unknown) {
    return value == null
      ? "—"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  }
  exportResult(result: AiResult) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "assistant-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
