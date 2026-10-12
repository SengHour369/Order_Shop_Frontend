import { LanguageSelect } from "../../core/i18n/language-select";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { ChangeDetectorRef, Component, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { KeycloakService } from "../../core/auth/keycloak.service";
import { ApiClient } from "../../core/api/api-client";
import { PageState } from "../../shared/utils/page-state";
import { Icon } from "../../shared/components/icon";
import { Status } from "../../shared/components/status";
@Component({
  standalone: true,
  imports: [LanguageSelect, TranslatePipe, FormsModule, Status, Icon, RouterLink],
  templateUrl: "./account.html",
  styleUrl: "./account.scss",
})
export class AccountPage extends PageState {
  private readonly changeDetector = inject(ChangeDetectorRef);
  auth = inject(AuthService);
  sso = inject(KeycloakService);
  async signInWithKeycloak() {
    this.busy.set(true);
    try { await this.sso.login(this.route.snapshot.queryParamMap.get("returnUrl")); }
    catch { this.error.set("Keycloak is unavailable. Please try again."); this.busy.set(false); }
  }
  api = inject(ApiClient);
  router = inject(Router);
  route = inject(ActivatedRoute);
  modes = [
    "Sign in",
    "Register",
    "Verify",
    "Forgot password",
    "Reset password",
  ];
  mode = this.modes.includes(
    this.route.snapshot.queryParamMap.get("mode") || "",
  )
    ? this.route.snapshot.queryParamMap.get("mode")!
    : this.route.snapshot.queryParamMap.has("token")
      ? "Reset password"
      : "Sign in";
  username = "";
  rememberMe = false;
  constructor() {
    super();
    try { this.username = localStorage.getItem("eshop.rememberedUsername") || ""; this.rememberMe = !!this.username; } catch { /* Storage is optional. */ }
    this.route.queryParamMap?.pipe(takeUntilDestroyed()).subscribe(params => {
      const requested = params.get("mode");
      this.changeMode(requested && this.modes.includes(requested) ? requested : params.has("token") ? "Reset password" : "Sign in");
      this.token = params.get("token") || "";
    });
  }
  socialSignIn() {
    this.error.set("This sign-in provider is not configured. Please use your E-Shop account or Keycloak.");
  }
  password = "";
  confirmation = "";
  showPassword = false;
  email = "";
  fullName = "";
  phone = "";
  code = "";
  token = this.route.snapshot.queryParamMap.get("token") || "";
  done() {
    const url = this.route.snapshot.queryParamMap.get("returnUrl");
    void this.router.navigateByUrl(
      url?.startsWith("/") && !url.startsWith("//") ? url : "/shop",
    );
  }
  changeMode(mode: string) {
    this.mode = mode;
    this.error.set("");
    this.message.set("");
    this.password = "";
    this.confirmation = "";
    this.showPassword = false;
    this.changeDetector.markForCheck();
  }
  submit() {
    if (
      (this.mode === "Register" || this.mode === "Reset password") &&
      this.password !== this.confirmation
    ) {
      this.error.set("Your passwords do not match.");
      return;
    }
    if (this.mode === "Sign in") {
      try {
        if (this.rememberMe) localStorage.setItem("eshop.rememberedUsername", this.username);
        else localStorage.removeItem("eshop.rememberedUsername");
      } catch { /* Never store credentials; username preference is optional. */ }
      this.run(this.auth.login(this.username, this.password), () =>
        this.done(),
      );
    } else if (this.mode === "Register")
      this.run(
        this.api.post("/api/v1/public/register", {
          username: this.username,
          password: this.password,
          email: this.email,
          phone: this.phone,
          full_name: this.fullName,
        }),
        () => {
          this.mode = "Verify";
          this.password = "";
          this.message.set("Check your email for a verification code.");
        },
      );
    else if (this.mode === "Verify")
      this.run(this.auth.verify(this.email, this.code), () => this.done());
    else if (this.mode === "Forgot password")
      this.run(
        this.api.post("/api/v1/public/forgot-password", { email: this.email.trim() }),
        () =>
          this.message.set("If an account exists for this email, you will receive a password reset link."),
      );
    else
      this.run(
        this.api.post("/api/v1/public/reset-password", {
          token: this.token,
          newPassword: this.password,
        }),
        () => {
          this.mode = "Sign in";
          this.password = "";
          this.message.set("Password updated. Please sign in.");
        },
      );
  }
  resend() {
    this.run(
      this.api.post("/api/v1/public/resend", {}, { email: this.email }),
      () => this.message.set("A new code has been requested."),
    );
  }
  logout() {
    this.run(this.auth.logout(), () => {
      this.auth.clear();
      this.message.set("Signed out.");
    });
  }
}
