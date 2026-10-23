import { inject, Injectable, signal } from "@angular/core";
import { catchError, map, of, tap, throwError } from "rxjs";
import { ApiClient } from "../api/api-client";
import { Session } from "../api/models";
import { KeycloakService } from "./keycloak.service";
@Injectable({ providedIn: "root" })
export class AuthService {
  private api = inject(ApiClient);
  private sso = inject(KeycloakService);
  // Browser credentials live in HttpOnly cookies; only the profile stays in memory.
  readonly session = signal<Session | null>(null);
  readonly secondFactorChallenge = signal('');
  completeSecondFactor(code: string) {
    return this.api.post<Session>('/api/v1/public/session/second-factor', {challenge:this.secondFactorChallenge(),code}).pipe(tap(s=>this.accept(s)));
  }
  login(CriteriaValue: string, Password: string) {
    return this.api
      .post<Session>("/api/v1/public/session/login", {
        CriteriaValue,
        Password,
      })
      .pipe(
        tap((s) => this.accept(s)),
        catchError(error => throwError(() => error.status === 403
          ? new Error('Sign-in was blocked by the server. If you restarted the app or opened a new preview URL, add this browser origin to GATEWAY_CORS_ORIGINS on both the gateway and auth service, then recreate those services: ' + window.location.origin)
          : error)),
      );
  }
  verify(email: string, code: string) {
    return this.api
      .post<Session>("/api/v1/public/session/verify", {}, { email, code })
      .pipe(tap((s) => this.accept(s)));
  }
  accept(s: Session) {
    if (s.token_type === "MFA" && s.refresh_token) { this.session.set(null); this.secondFactorChallenge.set(s.refresh_token); return; }
    if ((!s.access_token && s.token_type !== "Cookie") || !s.id)
      throw new Error("The server did not return a valid session.");
    this.revision++;
    this.secondFactorChallenge.set('');
    this.session.set(s);
  }
  clear() {
    this.revision++;
    this.secondFactorChallenge.set('');
    this.session.set(null);
  }
  userId() {
    const s = this.session();
    if (!s) throw new Error("Please sign in.");
    return s.id;
  }
  private revision = 0;
  restore() {
    const revision = this.revision;
    return this.api.post<Session>('/api/v1/public/session/refresh', {}).pipe(
      tap(s => { if (revision === this.revision) this.accept(s); }),
      catchError(() => of(null)),
    );
  }
  refresh() {
    const original = this.session();
    if (!original) return throwError(() => new Error("Please sign in."));
    if (original.token_type === 'Cookie') {
      return this.api.post<Session>('/api/v1/public/session/refresh', {}).pipe(map(s => {
        if (this.session() !== original) throw new Error('The session changed while refreshing.');
        this.accept(s); return s;
      }));
    }
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
    const original = this.session();
    const cookie = original?.token_type === 'Cookie';
    this.clear();
    return this.api.http.post(this.api.url(cookie ? '/api/v1/public/session/logout' : "/api/v1/public/logout"), {
      refreshToken: original?.refresh_token,
    }, {headers: !cookie && original?.access_token ? {Authorization: `Bearer ${original.access_token}`} : {}}).pipe(tap(() => this.sso.endSession()));
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
