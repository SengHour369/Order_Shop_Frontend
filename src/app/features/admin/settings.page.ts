import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
import { AdminApi } from "./admin.api";
import { StoreSettings } from "./report.models";
@Component({
  imports: [FormsModule, RouterLink, Status],
  template: `
    <section>
      <div class="adm-page-head">
        <div>
          <h2>Settings</h2>
          <p>Store contact details shared across administrator sessions.</p>
        </div>
      </div>
      <app-status [busy]="busy()" [error]="error()" [message]="message()" />
      <form (ngSubmit)="save()">
        <fieldset class="adm-panel" [disabled]="busy() || !canEdit">
          <legend>Store information</legend>
          <div class="adm-form-grid">
            <label
              >Store name<input
                name="storeName"
                [(ngModel)]="settings.storeName"
                maxlength="120"
                required
            /></label>
            <label
              >Contact email<input
                name="email"
                type="email"
                [(ngModel)]="settings.email"
                maxlength="254"
                required
            /></label>
            <label
              >Phone<input
                name="phone"
                [(ngModel)]="settings.phone"
                maxlength="40"
            /></label>
            <label
              >Timezone<input
                name="timezone"
                [(ngModel)]="settings.timezone"
                placeholder="Asia/Bangkok"
                maxlength="80"
                required
            /></label>
            <label
              >Address<textarea
                name="address"
                [(ngModel)]="settings.address"
                maxlength="500"
              ></textarea>
            </label>
          </div>
          <div class="adm-actions">
            <button class="adm-btn adm-primary">Save changes</button
            ><button type="button" class="adm-btn" (click)="load()">
              Reload saved settings
            </button>
          </div>
        </fieldset>
        @if (!canEdit) {
          <p>
            Administrators can update store settings. Managers have read access.
          </p>
        }
      </form>
      <article class="adm-panel" style="margin-top:16px">
        <h3>Account security</h3>
        <a class="adm-btn" routerLink="/account/security">Change password</a>
      </article>
    </section>
  `,
})
export class AdminSettingsPage extends PageState {
  private api = inject(AdminApi);
  canEdit = inject(AuthService).session()?.role === "ADMIN";
  settings: StoreSettings = {
    storeName: "",
    email: "",
    phone: "",
    address: "",
    timezone: "Asia/Bangkok",
  };
  constructor() {
    super();
    this.load();
  }
  load() {
    this.run(this.api.settings(), (settings) => {
      if (settings) this.settings = { ...settings };
    });
  }
  save() {
    if (!this.canEdit) return;
    this.run(this.api.saveSettings(this.settings), (settings) => {
      this.settings = { ...settings };
      this.message.set("Store settings saved.");
    });
  }
}
