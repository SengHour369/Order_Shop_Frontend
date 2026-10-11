import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { Envelope } from "./models";
import { unwrap } from "./response";
@Injectable({ providedIn: "root" })
export class ApiClient {
  readonly http = inject(HttpClient);
  url(path: string) {
    return environment.apiBaseUrl + path;
  }
  get<T>(path: string, params: Record<string, string | number> = {}) {
    return this.http.get<T>(this.url(path), { params });
  }
  post<T>(
    path: string,
    body: unknown = {},
    params: Record<string, string | number> = {},
  ) {
    return this.http.post<T>(this.url(path), body, { params });
  }
  put<T>(
    path: string,
    body: unknown = {},
    params: Record<string, string | number> = {},
  ) {
    return this.http.put<T>(this.url(path), body, { params });
  }
  patch<T>(
    path: string,
    body: unknown = {},
    params: Record<string, string | number> = {},
  ) {
    return this.http.patch<T>(this.url(path), body, { params });
  }
  delete<T>(path: string, params: Record<string, string | number> = {}) {
    return this.http.delete<T>(this.url(path), { params });
  }
  data<T>(
    path: string,
    body: unknown = {},
    params: Record<string, string | number> = {},
  ) {
    return this.post<Envelope<T>>(path, body, params).pipe(map(unwrap));
  }
}
