import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CheckoutPage } from '../checkout/checkout.page';
import { GuestCheckoutPage } from './guest-checkout.page';
@Component({imports: [CheckoutPage, GuestCheckoutPage], template: `@if (auth.session()) {<app-checkout-entry-customer />} @else {<app-guest-checkout />}`})
export class CheckoutEntry { auth = inject(AuthService); }
