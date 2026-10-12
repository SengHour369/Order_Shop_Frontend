import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { switchMap } from "rxjs";
import { NotificationsApi } from "./notifications.api";
import { Notice } from "../../core/api/models";
import { AuthService } from "../../core/auth/auth.service";
import { CustomerStore } from "../../core/stores/customer.store";
import { Icon } from "../../shared/components/icon";
import { SignInCard } from "../../shared/components/sign-in-card";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [TranslatePipe, DatePipe, RouterLink, Icon, SignInCard, Status],
  template: `<div class="page-heading">
      <div>
        <h1>
          {{ "Notifications" | translate }}
          @if (store.unread() !== null) {
            ({{ store.unread() }})
          }
        </h1>
        <p>Stay updated with your orders, deals, and account activity.</p>
      </div>
      <div class="actions">
        <button
          class="outline"
          [disabled]="!auth.session() || busy()"
          (click)="readAll()"
        >
          <app-icon name="check" />{{ "Mark All as Read" | translate }}</button
        ><a
          routerLink="/account/notification-settings"
          class="button icon-button"
          [attr.aria-label]='"Notification settings" | translate'
          ><app-icon name="settings"
        /></a>
      </div>
    </div>
    @if (!auth.session()) {
      <app-sign-in-card
        action="read your latest notifications"
        path="/account/notifications"
      />
    }
    <app-status [busy]="busy()" [error]="error()" />
    <div class="notification-layout" [class.has-detail]="selected()">
      <section>
        <div class="filter-tabs">
          <button
            class="tab"
            [class.active]="filter === 'all'"
            (click)="filter = 'all'"
          >
            All ({{ notices().length }})</button
          ><button
            class="tab"
            [class.active]="filter === 'unread'"
            (click)="filter = 'unread'"
          >
            Unread ({{ unreadOnPage() }})</button
          ><button
            class="tab"
            [class.active]="filter === 'read'"
            (click)="filter = 'read'"
          >
            Read
          </button>
        </div>
        <div class="notification-list">
          @for (n of filtered(); track n.id) {
            <button
              class="notification-row"
              [class.selected]="selected()?.id === n.id"
              [class.unread]="!n.read"
              (click)="select(n)"
            >
              <span class="icon-circle" [class.blue]="n.type?.includes('ORDER')"
                ><app-icon [name]="icon(n)"
              /></span>
              <div class="grow">
                <h3>
                  {{ n.title }}
                  @if (!n.read) {
                    <i class="unread-dot"></i>
                  }
                </h3>
                <p>{{ n.message }}</p>
              </div>
              <small>{{ n.createdAt | date: "mediumDate" }}</small
              ><app-icon name="chevron" />
            </button>
          } @empty {
            <div class="empty">
              <app-icon name="bell" />
              <h2>You're all caught up</h2>
              <p>Your latest updates will appear here.</p>
            </div>
          }
        </div>
        <div class="pagination">
          <button
            [disabled]="page <= 1 || busy()"
            (click)="page = page - 1; load()"
          >
            {{ "Previous" | translate }}</button
          ><span>Page {{ page }}</span
          ><button
            [disabled]="page >= pages || busy()"
            (click)="page = page + 1; load()"
          >
            {{ "Next" | translate }}
          </button>
        </div>
      </section>
      @if (selected(); as n) {
        <aside class="panel notification-detail">
          <div class="section-title">
            <span class="icon-circle"><app-icon [name]="icon(n)" /></span>
            <div class="grow">
              <h2>{{ n.title }}</h2>
              <p>{{ n.createdAt | date: "medium" }}</p>
            </div>
            <button
              class="icon-button"
              aria-label="Close notification"
              (click)="selected.set(null)"
            >
              <app-icon name="close" />
            </button>
          </div>
          <div class="notification-art"><app-icon [name]="icon(n)" /></div>
          <p>{{ n.message }}</p>
          @if (!n.read) {
            <button
              class="outline full"
              [disabled]="busy()"
              (click)="read(n.id)"
            >
              <app-icon name="check" />Mark as Read
            </button>
          }
          @if (n.resourceType === "ORDER" && numericId(n.resourceId)) {
            <a
              class="button primary full"
              [routerLink]="['/account/orders', n.resourceId]"
              >View Order Details</a
            >
          }
        </aside>
      }
    </div>`,
})
export class NotificationsPage extends PageState {
  api = inject(NotificationsApi);
  auth = inject(AuthService);
  store = inject(CustomerStore);
  notices = signal<Notice[]>([]);
  selected = signal<Notice | null>(null);
  page = 1;
  pages = 0;
  filter = "all";
  constructor() {
    super();
    this.load();
  }
  load() {
    if (!this.auth.session()) return;
    this.run(this.api.list(this.page), (r) => {
      this.notices.set(r.content);
      this.pages = r.totalPages;
      this.updateCount();
    });
  }
  updateCount() {
    this.api.count().subscribe({
      next: (r) => this.store.unread.set(r.count),
      error: () => this.store.unread.set(null),
    });
  }
  filtered() {
    return this.notices().filter(
      (n) =>
        this.filter === "all" || (this.filter === "read" ? n.read : !n.read),
    );
  }
  unreadOnPage() {
    return this.notices().filter((n) => !n.read).length;
  }
  select(n: Notice) {
    this.selected.set(n);
  }
  read(id: number) {
    this.run(
      this.api.read(id).pipe(switchMap(() => this.api.list(this.page))),
      (r) => {
        this.notices.set(r.content);
        this.selected.set(r.content.find((n) => n.id === id) || null);
        this.updateCount();
      },
    );
  }
  readAll() {
    this.run(
      this.api.readAll().pipe(switchMap(() => this.api.list(this.page))),
      (r) => {
        this.notices.set(r.content);
        if (this.selected())
          this.selected.set(
            r.content.find((n) => n.id === this.selected()!.id) || null,
          );
        this.updateCount();
      },
    );
  }
  icon(n: Notice) {
    return n.type?.includes("ORDER")
      ? "truck"
      : n.type?.includes("PAYMENT")
        ? "card"
        : n.type?.includes("SECURITY")
          ? "shield"
          : "bell";
  }
  numericId(id?: string) {
    return !!id && /^\d+$/.test(id);
  }
}
