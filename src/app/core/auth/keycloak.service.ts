import { inject, Injectable, signal } from "@angular/core";
import { firstValueFrom, timeout } from "rxjs";
import Keycloak from "keycloak-js";
import { ApiClient } from "../api/api-client";
import { Session } from "../api/models";

export function safeReturnUrl(value: string | null): string {
  return value?.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("\\") &&
  !/[\u0000-\u001f]/.test(value)
      ? value
      : "/shop";
}

@Injectable({ providedIn: "root" })
export class KeycloakService {
  private api = inject(ApiClient);
  private adapter?: Keycloak;
  private active = false;
  readonly enabled = signal(false);
  readonly error = signal("");

  // Runs before Angular routes consume the authorization-code callback.
  async initialize(): Promise<void> {
    try {
      const config = await firstValueFrom(
          this.api
              .get<{
                enabled: boolean;
                url: string;
                realm: string;
                clientId: string;
              }>("/api/v1/public/keycloak/config")
              .pipe(timeout(5000)),
      );
      if (!config.enabled) return;
      this.adapter = new Keycloak(config);
      await this.adapter.init({
        pkceMethod: "S256",
        flow: "standard",
        responseMode: "fragment",
        checkLoginIframe: false,
        messageReceiveTimeout: 5000,
      });
      this.enabled.set(true);
    } catch {
      this.error.set(
          "Keycloak is unavailable. Please use your E-Shop login or try again.",
      );
    }
  }

  async login(returnUrl: string | null): Promise<void> {
    if (!this.adapter || !this.enabled())
      throw new Error("Keycloak is unavailable.");
    sessionStorage.setItem("eshop.sso.returnUrl", safeReturnUrl(returnUrl));
    await this.adapter.login({
      redirectUri: location.origin + "/auth/keycloak/callback",
    });
  }

  async complete(): Promise<Session> {
    if (!this.adapter?.authenticated || !this.adapter.token)
      throw new Error(
          "Keycloak sign-in was not completed. Please try again.",
      );
    const session = await firstValueFrom(
        this.api
            .post<Session>("/api/v1/public/keycloak/exchange", {
              accessToken: this.adapter.token,
            })
            .pipe(timeout(15000)),
    );
    this.active = true;
    return session;
  }

  takeReturnUrl(): string {
    const url = safeReturnUrl(sessionStorage.getItem("eshop.sso.returnUrl"));
    sessionStorage.removeItem("eshop.sso.returnUrl");
    return url;
  }

  endSession(): void {
    if (!this.active || !this.adapter) return;
    this.active = false;
    void this.adapter.logout({ redirectUri: location.origin + "/auth" });
  }
}