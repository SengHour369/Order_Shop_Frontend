import { inject } from "@angular/core";
import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import {
  catchError,
  finalize,
  Observable,
  shareReplay,
  switchMap,
  throwError,
} from "rxjs";
import { AuthService } from "./auth.service";
import { Session } from "../api/models";
import { environment } from "../../../environments/environment";
let refresh$: Observable<Session> | null = null;
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const api = request.url.startsWith(environment.apiBaseUrl + "/api/");
  const publicPath =
    request.url.includes("/public/") && !request.url.endsWith("/public/logout");
  if (!api || publicPath || !auth.session()) return next(request);
  const original = auth.session()!;
  const authorized = request.clone({
    setHeaders: { Authorization: `Bearer ${auth.session()!.access_token}` },
  });
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);
      if (!auth.session() || auth.session()?.id !== original.id)
        return throwError(() => error);
      refresh$ ??= auth.refresh().pipe(
        finalize(() => (refresh$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      return refresh$.pipe(
        catchError((e) => {
          if (auth.session()?.refresh_token === original.refresh_token)
            auth.clear();
          return throwError(() => e);
        }),
        switchMap((s) =>
          next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${s.access_token}` },
            }),
          ),
        ),
      );
    }),
  );
};
