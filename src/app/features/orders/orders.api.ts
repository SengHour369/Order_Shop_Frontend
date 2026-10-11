import { inject, Injectable } from "@angular/core";
import { unwrap } from "../../core/api/response";
import { map } from "rxjs";
import { ApiClient } from "../../core/api/api-client";
import { AuthService } from "../../core/auth/auth.service";
import { Checkout, Envelope, Order, SpringPage } from "../../core/api/models";
@Injectable({ providedIn: "root" })
export class OrdersApi {
  private api = inject(ApiClient);
  private auth = inject(AuthService);
  list(page = 0) {
    return this.api
      .post<SpringPage<Envelope<Order>>>(
        "/api/v1/orders/user/id/",
        {},
        { userId: this.auth.userId(), page, size: 10 },
      )
      .pipe(map((p) => ({ ...p, content: p.content.map(unwrap) })));
  }
  history(page = 0, status = "") {
    return this.api
      .post<SpringPage<Envelope<Order>>>(
        "/api/v1/orders/user/history",
        {},
        {
          userId: this.auth.userId(),
          page,
          size: 10,
          ...(status ? { status } : {}),
        },
      )
      .pipe(map((p) => ({ ...p, content: p.content.map(unwrap) })));
  }
  detail(orderId: number) {
    return this.api.data<Order>(
      "/api/v1/orders/user/detail",
      {},
      { userId: this.auth.userId(), orderId },
    );
  }
  checkout(body: Checkout) {
    return this.api.data<Order>("/api/v1/orders/user/from-cart", body, {
      userId: this.auth.userId(),
    });
  }
  cancel(id: number) {
    return this.api.data<Order>(
      "/api/v1/orders/user/cancel",
      {},
      { userId: this.auth.userId(), id },
    );
  }
}
