import { voiceDestination } from './voice-navigation';
import { ChatVoice } from '../../assistant/customer-chat/chat-voice';
import { LanguageService } from '../../../core/i18n/language.service';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavigationEnd } from '@angular/router';
import { PermissionService } from "../../../core/auth/permission.service";
import { FloatingAssistant } from '../../assistant/floating/floating-assistant';
import { LanguageSelect } from "../../../core/i18n/language-select";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { AuthService } from "../../../core/auth/auth.service";
import { Icon } from "../../../shared/components/icon";
const groups = [
  {label:'Automation',items:[{path:'/admin/ai-automation',label:'AI Automation',icon:'robot',exact:true}]},
  { label:'Approvals', items:[
    {path:'/admin/my-requests',label:'My Requests',icon:'list',exact:true},
    {path:'/admin/review-authorization',label:'Review Authorization',icon:'check',exact:true},
    {path:'/admin/import-executions',label:'Request Executions',icon:'list',exact:true},
    {path:'/admin/branches',label:'Branches & Access',icon:'bank',exact:true},
  ]},
  {
    label: "AI Assistant",
    items: [{ path: "/admin/assistant", label: "AI Assistant", icon: "robot", exact: false }],
  },
  {
    label: "Overview",
    items: [
      { path: "/admin", label: "Dashboard", icon: "grid", exact: true },
    ],
  },
  {
    label: "Orders",
    items: [
      { path: "/admin/orders", label: "Orders", icon: "list", exact: false },
      {
        path: "/admin/cancellations",
        label: "Cancellations",
        icon: "close",
        exact: false,
      },
      {
        path: "/admin/returns",
        label: "Returns",
        icon: "refresh",
        exact: false,
      },
    ],
  },
  {
    label: "Payments",
    items: [
      {
        path: "/admin/payments",
        label: "Payment Details",
        icon: "card",
        exact: false,
      },
      {
        path: "/admin/refunds",
        label: "Refunds",
        icon: "refresh",
        exact: false,
      },
      {
        path: "/admin/transactions",
        label: "Transactions",
        icon: "list",
        exact: false,
      },
      { path: "/admin/automation", label: "Automation", icon: "refresh", exact: false },
      { path: "/admin/bakong", label: "Bakong", icon: "bank", exact: false },
    ],
  },
  {
    label: "Customers",
    items: [
      {
        path: "/admin/customers",
        label: "Customers",
        icon: "user",
        exact: false,
      },
      {
        path: "/admin/customer-groups",
        label: "Customer Groups",
        icon: "user",
        exact: false,
      },
    ],
  },
  {
    label: "Products",
    items: [
      { path: "/admin/products", label: "Products", icon: "bag", exact: false },
      {
        path: "/admin/categories",
        label: "Categories",
        icon: "tag",
        exact: false,
      },
      { path: "/admin/brands", label: "Brands", icon: "bank", exact: false },
      {
        path: "/admin/inventory",
        label: "Inventory",
        icon: "box",
        exact: true,
      },
      {
        path: "/admin/inventory/stock-in",
        label: "Stock In",
        icon: "plus",
        exact: true,
      },
      {
        path: "/admin/inventory/stock-out",
        label: "Stock Out",
        icon: "download",
        exact: true,
      },
      {
        path: "/admin/inventory/adjustments",
        label: "Adjustments",
        icon: "edit",
        exact: true,
      },
      {
        path: "/admin/inventory/warehouses",
        label: "Warehouses",
        icon: "box",
        exact: true,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        path: "/admin/sales-report",
        label: "Sales Report",
        icon: "chart",
        exact: false,
      },
      {
        path: "/admin/payment-report",
        label: "Payment Report",
        icon: "chart",
        exact: false,
      },
      {
        path: "/admin/tax-report",
        label: "Tax Report",
        icon: "chart",
        exact: false,
      },
    ],
  },
  {
    label: "Communication",
    items: [{path:"/admin/notifications",label:"Notifications",icon:"bell",exact:false}],
  },
  {
    label: "Settings",
    items: [
      {path:"/admin/live-tests",label:"Live Tests",icon:"list",exact:false},
      {path:"/admin/storefront-access",label:"Storefront Access",icon:"settings",exact:false},
      {path:"/admin/guest-activity",label:"Guest Activity",icon:"list",exact:false},
      {path:"/admin/guest-reviews",label:"Review Moderation",icon:"star",exact:false},
      {
        path: "/admin/groups",
        label: "Access Groups",
        icon: "user",
        exact: false,
      },
      {
        path: "/admin/settings",
        label: "Settings",
        icon: "settings",
        exact: false,
      },
      {
        path: "/admin/promotions",
        label: "Promotions",
        icon: "tag",
        exact: false,
      },
      {
        path: "/admin/activity",
        label: "Service Activity",
        icon: "list",
        exact: false,
      },
      {
        path: "/admin/users",
        label: "Users & Roles",
        icon: "user",
        exact: false,
      },
    ],
  },
];
@Component({
  providers: [ChatVoice],
  imports: [CanAccessDirective, FloatingAssistant, LanguageSelect, TranslatePipe, RouterOutlet, RouterLink, RouterLinkActive, Icon, FormsModule],
  styles: [`.ai-subnav{display:grid;padding:0 8px 8px 38px;gap:3px}.ai-subnav a{font-size:12px;padding:8px 12px;color:#64749a;text-decoration:none;border-radius:6px}.ai-subnav a.active{color:var(--admin-brand, #00834a);background:var(--admin-soft, #edf8f2)}.adm-nav button.adm-link{width:100%;border:0;background:var(--admin-soft, #edf8f2);color:var(--admin-brand, #00834a);cursor:pointer;text-align:left}`],
  template: `<div class="adm admin-refresh admin-unified-layout">
    @if (mobile()) {
      <button
        class="adm-overlay"
        [attr.aria-label]='"Close menu" | translate'
        (click)="mobile.set(false)"
      ></button>
    }
    <aside
      class="adm-side"
      [class.collapsed]="collapsed()"
      [class.open]="mobile()"
    >
      <div class="adm-brand">
        <span class="adm-mark"><app-icon name="bag" /></span>
        <strong>ShopAdmin</strong><button class="user-editor-menu" type="button" aria-label="Toggle sidebar" (click)="collapsed.set(!collapsed())"><app-icon name="menu" /></button>
      </div>
      <nav class="adm-nav">
        @for (group of groups(); track group.label) {
          @if (group.label === 'AI Assistant') {
            @if (access.allowsMenu('/admin/assistant')) {
              <button class="adm-link" (click)="aiExpanded.set(!aiExpanded())" [attr.aria-expanded]="aiExpanded()"><app-icon name="robot" /><span>{{ "AI Assistant" | translate }}</span><app-icon name="down" /></button>
              @if (aiExpanded() && !collapsed()) {
                <div class="ai-subnav" aria-label="AI Assistant sections">
                  @for (section of aiSections; track section[0]) {
                    <a routerLink="/admin/assistant" [queryParams]="{ view: section[0] }" routerLinkActive="active" (click)="mobile.set(false)" *appCanRoute="'/admin/assistant'">{{ (section[1]) | translate }}</a>
                  }
                </div>
              }
            }
          } @else { <p class="adm-group">{{ (group.label) | translate }}</p> }
          @for (item of (group.label === "AI Assistant" ? [] : group.items); track item.label) {
            <a
              class="adm-link"
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              [title]="item.label | translate"
              (click)="mobile.set(false)"
             *appCanRoute="item.path">
              <app-icon [name]="item.icon" /><span>{{ (item.label) | translate }}</span>
            </a>
          }
        }
      </nav>
      <a class="adm-shop" routerLink="/"
        ><app-icon name="bag" /><span>{{ "Open shop" | translate }}</span></a
      >
    </aside>
    <div class="adm-main">
      <header class="adm-top">
        <div style="display:flex;align-items:center;gap:8px">
          <button
            class="adm-icon-btn adm-hide-sm"
            (click)="collapsed.set(!collapsed())"
            [attr.aria-label]="
              (collapsed() ? 'Expand sidebar' : 'Collapse sidebar'
            ) | translate"
            [attr.aria-expanded]="!collapsed()"
          >
            <app-icon
              name="chevron"
              [style.transform]="collapsed() ? 'none' : 'rotate(180deg)'"
            />
          </button>
          <button
            class="adm-icon-btn adm-only-sm"
            (click)="mobile.set(true)"
            [attr.aria-label]='"Open menu" | translate'
          >
            <app-icon name="list" />
          </button>

          <div>
            <h1>{{ (title()) | translate }}</h1>
            <div class="adm-crumbs">
              <span>{{ "Dashboard" | translate }}</span>
              @if (title() !== "Dashboard") {
                <span>›</span>@if (title() === 'Notification Details') {<a routerLink="/admin/notifications" *appCanRoute="'/admin/notifications'">Notifications</a><span>›</span>}@if (isCustomerGroupScreen() && !isAccessGroupCreate()) {<a routerLink="/admin/customers" *appCanRoute="'/admin/customers'">Customers</a><span>›</span><a routerLink="/admin/customer-groups" *appCanRoute="'/admin/customer-groups'">Customer Groups</a><span>›</span>}@if (isCustomerGroupsList()) {<a routerLink="/admin/customers" *appCanRoute="'/admin/customers'">Customers</a><span>›</span>}@if (isCustomerCreate() || isCustomerDetail()) {<a routerLink="/admin/customers" *appCanRoute="'/admin/customers'">Customers</a><span>›</span>}@if (isUserEdit() || isUserDetail()) {<a routerLink="/admin/users" *appCanRoute="'/admin/users'">{{ "Users & Roles" | translate }}</a><span>›</span>}@if (isOrderDetail()) {<a routerLink="/admin/orders" *appCanRoute="'/admin/orders'">{{ "Orders" | translate }}</a><span>›</span>}@if (isTransactionDetail()) {<a routerLink="/admin/transactions" *appCanRoute="'/admin/transactions'">{{ "Transactions" | translate }}</a><span>›</span>}<span>{{ (title()) | translate }}</span>
              }
            </div>
          </div>
        </div>
        @if (access.allows("/admin/products") || access.allows("/admin/orders") || access.allows("/admin/customers") || access.allows("/admin/transactions") || access.allows("/admin/refunds")) {
        <form class="adm-search" (ngSubmit)="search()">
          <app-icon name="search" />
          <input
            name="q"
            [attr.aria-label]='"Search orders, customers, or products" | translate'
            [(ngModel)]="query"
            [placeholder]="
              (isTransactionDetail() ? 'Search by order ID, transaction ID, customer...' : isRefund()
                ? 'Search orders, customers, products, refunds...'
                : 'Search orders, customers, products...'
            ) | translate"
          />
          <button type="button" class="search-voice" (click)="voiceSearch()" [disabled]="searchVoice.pending()" [attr.aria-pressed]="searchVoice.recording()" [attr.aria-label]="(searchVoice.recording() ? 'Stop voice search recording' : 'Record voice search') | translate" [title]="(searchVoice.recording() ? 'Stop recording' : 'Voice search') | translate"><app-icon [name]="searchVoice.recording() ? 'stop' : 'mic'" /></button>
          @if(searchVoice.error()){<span class="search-voice-note search-voice-error" role="alert">{{ searchVoice.error() }}</span>}
          @else if(searchVoice.recording() || searchVoice.pending()){<span class="search-voice-note" role="status">{{ (searchVoice.recording() ? 'Speak the page to open, then click Stop. Audio is sent for transcription.' : 'Preparing voice search…') | translate }}</span>}
          @else if(voiceSearchReady()){<span class="search-voice-note" role="status">{{ 'I could not identify a page. Please name one, such as Orders, Customers or Products.' | translate }}<button type="button" class="search-voice" aria-label="Dismiss voice search message" (click)="voiceSearchReady.set(false)">×</button></span>}
        </form>
        }
        <div style="display:flex;align-items:center;gap:8px">
          <app-language-select />
          @if (access.allowsMenu("/admin/notifications")) {
          <a
            class="adm-icon-btn"
            routerLink="/admin/notifications"
            [attr.aria-label]='"Notifications" | translate'
             *appCanRoute="'/admin/notifications'"><app-icon name="bell"
          /></a>
          }
          <span
            class="adm-hide-sm"
            style="width:1px;height:24px;background:var(--admin-border, #e4e9ed)"
          ></span>
          <div style="position:relative">
            <button
              class="adm-profile"
              [attr.aria-expanded]="menu()"
              [attr.aria-label]='"Account menu" | translate'
              (click)="menu.set(!menu())"
            >
              <span class="adm-avatar">{{ initials() }}</span>
              <span class="adm-hide-sm"
                >{{ auth.session()?.username || "Admin"
                }}<small>{{ auth.session()?.role || "Admin" }}</small></span
              >
              <app-icon class="adm-hide-sm" name="down" />
            </button>
            @if (menu()) {
              <div class="adm-menu">
                <p>
                  <strong>{{ auth.session()?.username }}</strong
                  ><br />{{ auth.session()?.email }}
                </p>
                @if (access.allowsMenu("/admin/settings")) {
                <a routerLink="/admin/settings" (click)="menu.set(false)"
                   *appCanRoute="'/admin/settings'">{{ "Settings" | translate }}</a
                >
                }
                <button class="danger" (click)="logout()">{{ "Log out" | translate }}</button>
              </div>
            }
          </div>
        </div>
      </header>
      <div class="adm-body"><router-outlet /></div>
      @if(access.allowsMenu('/admin/assistant')) {<app-floating-assistant/>}
    </div>
  </div>`,
})
export class AdminLayout {
  readonly searchVoice=inject(ChatVoice);
  private language=inject(LanguageService);
  readonly voiceSearchReady=signal(false);
  auth = inject(AuthService);
  private router = inject(Router);
  access = inject(PermissionService);
  private currentUrl = toSignal(this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => event.urlAfterRedirects)), {initialValue:this.router.url});
  groups = computed(() => groups.map(group => ({...group, items: group.items.filter(item =>
    this.access.allowsMenu(item.path)
  )})).filter(group => group.items.length));
  aiExpanded = signal(true);
  aiSections = [['chat','Chat Bot'],['control','Control Center'],['conversations','Conversations'],['executions','Tool Execution'],['tools','Tools'],['permissions','Permissions'],['settings','Settings']];
  collapsed = signal(false);
  mobile = signal(false);
  menu = signal(false);
  query = "";
  isAccessGroupCreate() { return this.router.url.startsWith('/admin/groups/'); }
  isCustomerGroupScreen() { return this.router.url.startsWith("/admin/customer-groups/") || this.router.url.startsWith("/admin/groups/"); }
  isUserDetail() { return /^\/admin\/users\/\d+\/?(?:\?|$)/.test(this.currentUrl()); }
  isCustomerGroupsList() { return this.currentUrl().split('?')[0] === "/admin/customer-groups"; }

  isCustomerDetail() { return /^\/admin\/customers\/\d+\/?(?:[?#]|$)/.test(this.currentUrl()); }
  isCustomerCreate() { return this.currentUrl().startsWith("/admin/customers/add"); }
  isUserEdit() { return this.currentUrl().startsWith("/admin/users/edit/"); }
  isOrderDetail() { return /^\/admin\/orders\/\d+\/?(?:\?|$)/.test(this.router.url); }
  isTransactionDetail() { return /^\/admin\/transactions\/[^/?]+/.test(this.router.url); }
  isRefund() {
    return this.router.url.startsWith("/admin/refunds");
  }
  constructor(){effect(()=>{this.currentUrl();this.searchVoice.reset();this.voiceSearchReady.set(false);});}
  voiceSearch(){
    if(this.searchVoice.recording()){this.searchVoice.finish();return;}
    if(this.searchVoice.pending())return;
    this.voiceSearchReady.set(false);
    void this.searchVoice.start(this.language.language(),text=>{this.query=text.trim();this.followVoiceCommand(this.query);});
  }
  followVoiceCommand(text:string){
    const destination=voiceDestination(text);
    if(!destination){this.voiceSearchReady.set(true);return;}
    if(!this.access.allows(destination)){this.searchVoice.error.set('You do not have permission to open this page.');return;}
    this.voiceSearchReady.set(false);
    void this.router.navigate([destination]);
  }
  search() {
    if(this.searchVoice.recording()||this.searchVoice.pending())return;
    this.voiceSearchReady.set(false);
    const q = this.query.trim();
    if (!q) return;
    const preferred = this.isTransactionDetail() || /^txn|^tx-/i.test(q) ? '/admin/transactions'
      : this.isRefund() || /^ref/i.test(q) ? '/admin/refunds'
      : /^ord/i.test(q) || /^\d{4,}$/.test(q) ? '/admin/orders'
      : q.includes('@') ? '/admin/customers' : '/admin/products';
    const destination = [preferred, '/admin/products', '/admin/orders', '/admin/customers']
      .find(path => this.access.allows(path));
    if (destination) void this.router.navigate([destination], { queryParams: { q } });
  }

  title() {
    if (this.isCustomerDetail()) return "Customer Details";
    if (this.isCustomerCreate()) return "Add Customer";
    if (this.router.url.startsWith('/admin/notifications/')) return 'Notification Details';
    if (this.router.url.startsWith('/admin/groups/')) return this.router.url.includes('/add') ? 'Create Group' : this.router.url.includes('/edit/') ? 'Edit Group' : 'Group Details';
    if (this.isCustomerGroupScreen()) return this.router.url.includes('/add') ? 'Create Customer Group' : this.router.url.includes('/edit/') ? 'Edit Customer Group' : 'Group Details';
    if (this.isUserDetail()) return "User Details";
    if (this.isUserEdit()) return "Edit User";
    if (this.isOrderDetail()) return "Order Details";
    if (this.isTransactionDetail()) return "Transaction Details";
    const path = this.router.url.split("?")[0];
    const item = groups
      .flatMap((group) => group.items)
      .sort((a, b) => b.path.length - a.path.length)
      .find((entry) =>
        entry.exact ? path === entry.path : path.startsWith(entry.path),
      );
    if (path.endsWith("/add")) return "Add " + (item?.label || "Record");
    if (path.includes("/edit")) return "Edit " + (item?.label || "Record");

    return item?.label || "Admin";
  }
  initials() {
    return (this.auth.session()?.username || "A").slice(0, 2).toUpperCase();
  }
  logout() {
    this.auth.logout().subscribe({
      next: () => this.leave(),
      error: () => this.leave(),
    });
  }
  private leave() {
    this.auth.clear();
    void this.router.navigateByUrl("/auth");
  }
}

