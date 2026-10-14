import { PermissionService, isImportRoute } from "../../../core/auth/permission.service";
import { LanguageSelect } from "../../../core/i18n/language-select";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, computed, inject, signal } from "@angular/core";
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
  { label:'Excel Imports', items:[
    {path:'/admin/imports',label:'Upload & Analyze',icon:'upload',exact:true},
    {path:'/admin/import-approvals',label:'Pending Excel Imports',icon:'check',exact:true},
    {path:'/admin/import-executions',label:'Import Executions',icon:'list',exact:true},
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
    label: "Settings",
    items: [
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
  imports: [LanguageSelect, TranslatePipe, RouterOutlet, RouterLink, RouterLinkActive, Icon, FormsModule],
  styles: [`.ai-subnav{display:grid;padding:0 8px 8px 38px;gap:3px}.ai-subnav a{font-size:12px;padding:8px 12px;color:#64749a;text-decoration:none;border-radius:6px}.ai-subnav a.active{color:#0866ff;background:#eaf3ff}.adm-nav button.adm-link{width:100%;border:0;background:#eff6ff;color:#0866ff;cursor:pointer;text-align:left}`],
  template: `<div class="adm admin-refresh">
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
        <span class="adm-mark"><app-icon name="cart" /></span>
        <strong>ShopAdmin</strong>
      </div>
      <nav class="adm-nav">
        @for (group of groups(); track group.label) {
          @if (group.label === 'AI Assistant') {
            @if (auth.session()?.role === 'ADMIN') {
              <button class="adm-link" (click)="aiExpanded.set(!aiExpanded())" [attr.aria-expanded]="aiExpanded()"><app-icon name="robot" /><span>{{ "AI Assistant" | translate }}</span><app-icon name="down" /></button>
              @if (aiExpanded() && !collapsed()) {
                <div class="ai-subnav" aria-label="AI Assistant sections">
                  @for (section of aiSections; track section[0]) {
                    <a routerLink="/admin/assistant" [queryParams]="{ view: section[0] }" routerLinkActive="active" (click)="mobile.set(false)">{{ (section[1]) | translate }}</a>
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
            >
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
                <span>›</span><span>{{ (title()) | translate }}</span>
              }
            </div>
          </div>
        </div>
        <form class="adm-search" (ngSubmit)="search()">
          <app-icon name="search" />
          <input
            name="q"
            [attr.aria-label]='"Search orders, customers, or products" | translate'
            [(ngModel)]="query"
            [placeholder]="
              (isRefund()
                ? 'Search orders, customers, products, refunds...'
                : 'Search orders, customers, products...'
            ) | translate"
          />
        </form>
        <div style="display:flex;align-items:center;gap:8px">
          <app-language-select />
          <a
            class="adm-icon-btn"
            routerLink="/account/notifications"
            [attr.aria-label]='"Notifications" | translate'
            ><app-icon name="bell"
          /></a>
          <span
            class="adm-hide-sm"
            style="width:1px;height:24px;background:#e2e8f0"
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
                <a routerLink="/admin/settings" (click)="menu.set(false)"
                  >{{ "Settings" | translate }}</a
                >
                <button class="danger" (click)="logout()">{{ "Log out" | translate }}</button>
              </div>
            }
          </div>
        </div>
      </header>
      <div class="adm-body"><router-outlet /></div>
    </div>
  </div>`,
})
export class AdminLayout {
  auth = inject(AuthService);
  private router = inject(Router);
  access = inject(PermissionService);
  groups = computed(() => groups.map(group => ({...group, items: group.items.filter(item =>
    this.access.allows(item.path) && (['ADMIN','MANAGER'].includes(this.auth.session()?.role||'') || isImportRoute(item.path)) && (!["/admin/users", "/admin/activity", "/admin/promotions", "/admin/groups"].includes(item.path) || this.auth.session()?.role === "ADMIN")
  )})).filter(group => group.items.length));
  aiExpanded = signal(true);
  aiSections = [['chat','Chat Bot'],['control','Control Center'],['conversations','Conversations'],['executions','Tool Execution'],['tools','Tools'],['permissions','Permissions'],['settings','Settings']];
  collapsed = signal(false);
  mobile = signal(false);
  menu = signal(false);
  query = "";
  isRefund() {
    return this.router.url.startsWith("/admin/refunds");
  }
  search() {
    const q = this.query.trim();
    if (!q) return;
    if (this.isRefund() || /^ref/i.test(q)) {
      void this.router.navigate(["/admin/refunds"], { queryParams: { q } });
      return;
    }
    if (/^ord/i.test(q) || /^\d{4,}$/.test(q)) {
      void this.router.navigate(["/admin/orders"], { queryParams: { q } });
      return;
    }
    if (q.includes("@")) {
      void this.router.navigate(["/admin/customers"], { queryParams: { q } });
      return;
    }
    void this.router.navigate(["/admin/products"], { queryParams: { q } });
  }
  title() {
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

