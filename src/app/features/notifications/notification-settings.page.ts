import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { NotificationsApi } from "./notifications.api";
import { AuthService } from "../../core/auth/auth.service";
import { Icon } from "../../shared/icon";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
import { SignInCard } from "../../shared/sign-in-card";
@Component({
  imports: [RouterLink, FormsModule, Icon, Status, SignInCard],
  template: `<div class="page-heading">
      <div>
        <h1>Notification Settings</h1>
        <p>Manage the updates you receive from E-Shop.</p>
      </div>
      <a class="button outline" routerLink="/account/notifications"
        >Back to Notifications</a
      >
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (!auth.session()) {
      <app-sign-in-card
        action="manage your notification preferences"
        path="/account/notification-settings"
      />
    }
    <form class="panel" (ngSubmit)="save()">
      <div class="section-title">
        <span class="icon-circle"><app-icon name="bell" /></span>
        <div>
          <h2>Notification Channels</h2>
          <p>Choose how you receive assistant updates.</p>
        </div>
      </div>
      <label class="setting-row"
        ><span class="icon-circle"><app-icon name="mail" /></span
        ><span class="grow"
          ><strong>Email Notifications</strong>
          <p>Receive email updates for your assistant requests.</p></span
        ><span class="switch-label"
          ><input
            type="checkbox"
            name="aiEmail"
            [(ngModel)]="email"
            [disabled]="!ready() || busy()"
            aria-label="Email updates for assistant requests" /><span
            class="switch"
          ></span></span
      ></label>
      <p class="availability-note">
        Order and account updates are available in your notification inbox. More
        channel and scheduling preferences are coming soon.
      </p>
      <div class="dialog-actions">
        <a class="button outline" routerLink="/account/notifications">Cancel</a
        ><button
          class="primary"
          [disabled]="!ready() || busy() || email === saved()"
        >
          {{ busy() ? "Saving…" : "Save Changes" }}
        </button>
      </div>
    </form>`,
})
export class NotificationSettingsPage extends PageState {
  auth = inject(AuthService);
  api = inject(NotificationsApi);
  ready = signal(false);
  saved = signal(false);
  email = false;
  constructor() {
    super();
    if (this.auth.session())
      this.run(this.api.preferences(), (p) => {
        this.email = p.aiEmail;
        this.saved.set(p.aiEmail);
        this.ready.set(true);
      });
  }
  save() {
    if (!this.ready() || this.busy()) return;
    const desired = this.email;
    this.run(this.api.setPreferences(desired), () => {
      this.saved.set(desired);
      this.message.set("Notification preferences saved.");
    });
  }
}
