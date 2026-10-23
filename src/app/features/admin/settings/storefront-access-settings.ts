import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '../../../core/api/api-client';
import { PermissionService } from '../../../core/auth/permission.service';
import { StorefrontAccess, StorefrontAccessService } from '../../../core/storefront/storefront-access.service';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';

@Component({
  selector: 'app-storefront-access-settings', imports: [FormsModule, Status],
  styleUrl: './storefront-access-settings.css',
  template: `<section class="access-panel" aria-labelledby="storefront-access-title">
    <header><div><span class="eyebrow">STOREFRONT ACCESS / GUEST ACCESS</span><h3 id="storefront-access-title">Guest shopping & checkout</h3><p>Control what visitors can do before signing in. Changes apply to the storefront after saving.</p></div></header>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (ready) {
      <form (ngSubmit)="save()"><fieldset [disabled]="busy() || !canEdit()"><legend class="sr-only">Guest access settings</legend>
        @for (option of options; track option.key) {
          <label class="setting-row"><span><strong>{{option.label}}</strong><small>{{option.hint}}</small></span><input type="checkbox" role="switch" [name]="option.key" [ngModel]="settings[option.key]" (ngModelChange)="change(option.key, $event)" [disabled]="option.key === 'requireDeliveryAddress'" [attr.aria-label]="option.label" /></label>
        }
      </fieldset><p class="rule">A valid delivery address is always required for physical products. Guest payment requires checkout; checkout requires a cart. Guest reviews require verified contact and moderator approval.</p>
      @if (canEdit()) {<div class="adm-actions"><button class="adm-btn adm-primary" [disabled]="busy()">Save guest settings</button><button type="button" class="adm-btn" [disabled]="busy()" (click)="load()">Reload</button></div>}
      @else {<p class="rule">Your account has read-only access to these settings.</p>}
      </form>
    } @else if (!busy()) { <button type="button" class="adm-btn" (click)="load()">Reload guest settings</button> }
  </section>`,
})
export class StorefrontAccessSettings extends PageState {
  private api = inject(ApiClient);
  private permissions = inject(PermissionService);
  private storefront = inject(StorefrontAccessService);
  canEdit = computed(() => this.permissions.has('STOREFRONT_ACCESS_UPDATE'));
  ready = false;
  settings: StorefrontAccess = {guestBrowsing: true, guestReviews: false, guestCart: false, guestCheckout: false, guestPayment: false, requireDeliveryAddress: true, requireGuestContactVerification: false, guestOrderTracking: false};
  options: {key: keyof StorefrontAccess; label: string; hint: string}[] = [
    {key:'guestBrowsing', label:'Allow guest product browsing', hint:'Show products, prices, promotions and public reviews without sign-in.'},
    {key:'guestReviews', label:'Allow guest product reviews', hint:'Accept verified-contact reviews into a moderation queue. Reviews are never published automatically.'},
    {key:'guestCart', label:'Allow guest cart', hint:'Keep each visitor’s cart in a secure browser session.'},
    {key:'guestCheckout', label:'Allow guest checkout', hint:'Place an order without creating an account.'},
    {key:'guestPayment', label:'Allow guest payment', hint:'Offer provider-verified ABA / KHQR payments for guest orders.'},
    {key:'requireDeliveryAddress', label:'Require delivery address', hint:'Always enforced for physical deliveries.'},
    {key:'requireGuestContactVerification', label:'Require guest contact verification', hint:'Verify the guest’s email before confirming checkout.'},
    {key:'guestOrderTracking', label:'Allow guest order tracking', hint:'Let visitors retrieve their own orders from this browser using scoped access.'},
  ];
  constructor() { super(); this.load(); }
  load() { this.run(this.api.get<StorefrontAccess>('/api/v1/admin/storefront/access-settings'), settings => {this.settings = {...settings}; this.ready = true;}); }
  change(key: keyof StorefrontAccess, value: boolean) {
    if (key === 'requireDeliveryAddress') return;
    this.settings = {...this.settings, [key]: value};
    if (key === 'guestPayment' && value) {this.settings.guestCheckout = true; this.settings.guestCart = true;}
    if (key === 'guestCheckout' && value) this.settings.guestCart = true;
    if (!this.settings.guestCart) this.settings.guestCheckout = false;
    if (!this.settings.guestCheckout) this.settings.guestPayment = false;
  }
  save() {
    if (!this.ready || !this.canEdit() || this.busy()) return;
    this.run(this.api.put<StorefrontAccess>('/api/v1/admin/storefront/access-settings', this.settings), settings => {
      this.settings = {...settings}; this.storefront.settings.set(settings); this.message.set('Guest access settings saved.');
    });
  }
}
