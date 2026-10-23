import { PermissionService } from '../../../core/auth/permission.service';
import { StorefrontAccessSettings } from './storefront-access-settings';
import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../../core/auth/auth.service";
import { PageState } from "../../../shared/utils/page-state";
import { Status } from "../../../shared/components/status";
import { AdminApi } from "../api/admin.api";
import { StoreSettings } from "../reports/report.models";
@Component({
  imports: [StorefrontAccessSettings, PageAccessDenied, TranslatePipe, FormsModule, RouterLink, Status],
  template: `@if (accessDenied()) { <app-page-access-denied /> } @else {
    <section>
      <div class="adm-page-head">
        <div>
          <h2>{{ "Settings" | translate }}</h2>
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
              >{{ "Phone" | translate }}<input
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
              >{{ "Address" | translate }}<textarea
                name="address"
                [(ngModel)]="settings.address"
                maxlength="500"
              ></textarea>
            </label>
          </div>
          <div class="adm-actions">
            <button class="adm-btn adm-primary">{{ "Save changes" | translate }}</button
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
      @if (permissions.has('STOREFRONT_ACCESS_VIEW')) {
        <app-storefront-access-settings />
      }
      <article class="adm-panel" style="margin-top:16px">
        <h3>{{ "Account security" | translate }}</h3>
        <a class="adm-btn" routerLink="/account/security">{{ "Change password" | translate }}</a>
      </article>
    </section>
   }`,
})
export class AdminSettingsPage extends PageState {
  private api = inject(AdminApi);
  protected permissions = inject(PermissionService);
  canEdit = ["ADMIN", "SUPER_ADMIN"].includes(inject(AuthService).session()?.role || "");
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
