import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { ApiClient } from "../../core/api/api-client";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
@Component({
  standalone: true,
  imports: [FormsModule, Status, Icon, RouterLink],
  templateUrl: "./account.html",
})
export class AccountPage extends PageState {
  auth = inject(AuthService);
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
  }
  submit() {
    if (
      (this.mode === "Register" || this.mode === "Reset password") &&
      this.password !== this.confirmation
    ) {
      this.error.set("Your passwords do not match.");
      return;
    }
    if (this.mode === "Sign in")
      this.run(this.auth.login(this.username, this.password), () =>
        this.done(),
      );
    else if (this.mode === "Register")
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
        this.api.post("/api/v1/public/forgot-password", { email: this.email }),
        () =>
          this.message.set("Check your email for password reset instructions."),
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
