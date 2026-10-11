import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { ApiClient } from "../../core/api/api-client";
import { Icon } from "../../shared/icon";
import { SignInCard } from "../../shared/sign-in-card";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
@Component({
  imports: [RouterLink, Icon, SignInCard, Status],
  template: `<div class="page-heading">
      <div>
        <h1>Security</h1>
        <p>Keep your account safe and manage your password.</p>
      </div>
    </div>
    @if (!auth.session()) {
      <app-sign-in-card
        action="manage your account security"
        path="/account/security"
      />
    }
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    <div class="customer-security-layout">
      <section class="panel">
        <div class="section-title">
          <span class="icon-circle"><app-icon name="lock" /></span>
          <div>
            <h2>Change Password</h2>
            <p>Use a strong, unique password.</p>
          </div>
        </div>
        <p>We’ll send password reset instructions to your account email.</p>
        <label
          >Email Address<input
            [value]="auth.session()?.email || ''"
            readonly
            placeholder="Sign in to view your email"
        /></label>
        <ul class="security-checklist">
          <li><app-icon name="check" />Use a unique password</li>
          <li>
            <app-icon name="check" />Combine letters, numbers, and symbols
          </li>
          <li><app-icon name="check" />Keep your password private</li>
        </ul>
        <button
          class="primary full"
          [disabled]="!auth.session() || busy()"
          (click)="reset()"
        >
          <app-icon name="mail" />Send Password Reset Instructions</button
        ><a
          routerLink="/auth"
          [queryParams]="{ mode: 'Reset password' }"
          class="text-link small"
          >Already have a reset token?</a
        >
      </section>
      <div>
        <section class="panel">
          <div class="section-title">
            <span class="icon-circle"><app-icon name="mail" /></span>
            <h2>Email Verification</h2>
          </div>
          <p>{{ auth.session()?.email || "Sign in to view your email." }}</p>
          <a
            class="button outline full"
            routerLink="/auth"
            [queryParams]="{ mode: 'Verify' }"
            >Verify Email Address</a
          >
        </section>
        <section class="panel">
          <div class="section-title">
            <span class="icon-circle"><app-icon name="shield" /></span>
            <h2>Account Protection</h2>
          </div>
          <p>
            Only sign in on devices you trust. Sign out when using a shared
            device.
          </p>
          <p class="availability-note">
            Two-factor authentication and login history are not available yet.
          </p>
          <a class="button outline full" routerLink="/account/support"
            >Get Account Help</a
          >
        </section>
      </div>
    </div>`,
})
export class SecurityPage extends PageState {
  auth = inject(AuthService);
  api = inject(ApiClient);
  reset() {
    this.run(
      this.api.post("/api/v1/public/forgot-password", {
        email: this.auth.session()?.email,
      }),
      () =>
        this.message.set("Check your email for password reset instructions."),
    );
  }
}
