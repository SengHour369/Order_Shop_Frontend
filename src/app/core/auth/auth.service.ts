import { inject, Injectable, signal } from "@angular/core";
import { map, tap, throwError } from "rxjs";
import { ApiClient } from "../api/api-client";
import { Session } from "../api/models";
@Injectable({ providedIn: "root" })
export class AuthService {
  private api = inject(ApiClient);
  // Keep bearer credentials in memory; re-authenticate after a full page reload.
  readonly session = signal<Session | null>(null);
  login(CriteriaValue: string, Password: string) {
    return this.api
      .post<Session>("/api/v1/public/email/username/login", {
        CriteriaValue,
        Password,
      })
      .pipe(tap((s) => this.accept(s)));
  }
  verify(email: string, code: string) {
    return this.api
      .post<Session>("/api/v1/public/verify", {}, { email, code })
      .pipe(tap((s) => this.accept(s)));
  }
  accept(s: Session) {
    if (!s.access_token || !s.id)
      throw new Error("The server did not return a valid session.");
    this.session.set(s);
  }
  clear() {
    this.session.set(null);
  }
  userId() {
    const s = this.session();
    if (!s) throw new Error("Please sign in.");
    return s.id;
  }
  refresh() {
    const original = this.session();
    if (!original) return throwError(() => new Error("Please sign in."));
    return this.api
      .post<Session>("/api/v1/public/refresh", {
        refreshToken: original.refresh_token,
      })
      .pipe(
        map((s) => {
          if (this.session()?.refresh_token !== original.refresh_token) {
            throw new Error(
              "The session changed while refreshing. Please try again.",
            );
          }
          const renewed = { ...original, ...s };
          this.accept(renewed);
          return renewed;
        }),
      );
  }
  logout() {
    return this.api.post("/api/v1/public/logout", {
      refreshToken: this.session()?.refresh_token,
    });
  }
  checkUser(email: string) {
    return this.api.post<Session>("/api/v1/public/check-user", {}, { email });
  }
  registerAccount(body: {
    username: string;
    password: string;
    email: string;
    phone: string;
    full_name: string;
  }) {
    return this.api.post("/api/v1/public/accounts/register", body);
  }
}
