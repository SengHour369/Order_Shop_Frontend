import { inject, Injectable } from "@angular/core";
import { unwrap } from "../../core/api/response";
import { map } from "rxjs";
import { ApiClient } from "../../core/api/api-client";
import { AuthService } from "../../core/auth/auth.service";
import { Address, Envelope, SpringPage } from "../../core/api/models";
@Injectable({ providedIn: "root" })
export class AddressesApi {
  private api = inject(ApiClient);
  private auth = inject(AuthService);
  list() {
    return this.api
      .get<Envelope<Address>[]>("/api/v1/addresses/user/" + this.auth.userId())
      .pipe(map((rows) => rows.map(unwrap)));
  }
  page(page = 0, size = 5) {
    return this.api
      .get<SpringPage<Envelope<Address>>>(
        "/api/v1/addresses/user/" + this.auth.userId() + "/paged",
        { page, size, sort: "id,desc" },
      )
      .pipe(
        map((result) => ({ ...result, content: result.content.map(unwrap) })),
      );
  }
  create(body: Omit<Address, "id">) {
    return this.api.data<Address>(
      "/api/v1/addresses/user/" + this.auth.userId(),
      body,
    );
  }
  detail(id: number) {
    return this.api
      .get<Envelope<Address>>("/api/v1/addresses/" + id)
      .pipe(map(unwrap));
  }
  update(id: number, body: Omit<Address, "id">) {
    return this.api.http
      .put<Envelope<Address>>(
        this.api.url("/api/v1/addresses/" + id + "/user/" + this.auth.userId()),
        body,
      )
      .pipe(map(unwrap));
  }
  remove(id: number) {
    return this.api.http.delete(
      this.api.url("/api/v1/addresses/" + id + "/user/" + this.auth.userId()),
    );
  }
}
