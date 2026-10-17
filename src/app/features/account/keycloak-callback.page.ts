import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { KeycloakService } from "../../core/auth/keycloak.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

@Component({ standalone: true, imports: [RouterLink, TranslatePipe],
  template: `<section class="panel" style="max-width:520px;margin:80px auto;padding:32px" aria-live="polite">
    <h1>{{ "Keycloak sign-in" | translate }}</h1>
    @if (error()) { <p role="alert">{{ error() | translate }}</p><a routerLink="/auth">{{ "Back to Sign In" | translate }}</a> }
    @else { <p>{{ "Completing secure sign-in…" | translate }}</p> }
  </section>` })
export class KeycloakCallbackPage {
  private sso = inject(KeycloakService);
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly error = signal("");
  constructor() { void this.finish(); }
  private async finish() {
    try {
      this.auth.accept(await this.sso.complete());
      const returnUrl=this.sso.takeReturnUrl();
      if(this.auth.secondFactorChallenge()) await this.router.navigate(['/auth'], {queryParams:{mode:'Two-factor',returnUrl},replaceUrl:true});
      else await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    } catch {
      this.error.set("Sign-in failed. Your Keycloak identity must be linked to an active E-Shop account by an administrator.");
    }
  }
}
