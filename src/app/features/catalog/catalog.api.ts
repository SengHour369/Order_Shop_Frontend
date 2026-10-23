import { AuthService } from "../../core/auth/auth.service";
import { inject, Injectable } from "@angular/core";
import { map, switchMap } from "rxjs";
import { ApiClient } from "../../core/api/api-client";
import {
  CatalogPage,
  Envelope,
  Product,
  SpringPage,
} from "../../core/api/models";
@Injectable({ providedIn: "root" })
export class CatalogApi {
  private api = inject(ApiClient);
  private auth = inject(AuthService);
  list(page = 1, search = "") {
    if (!this.auth.session()) return this.api.get<CatalogPage<Product>>("/api/v1/storefront/products", {page, search});
    return this.api.data<CatalogPage<Product>>("/api/v1/products/get/all", {
      page,
      size: 12,
      criteria_type: search ? 1 : 4,
      criteria_value: search,
      is_active: true,
    });
  }
  category(name: string, page = 1) {
    if (!this.auth.session()) return this.api.get<CatalogPage<Product>>("/api/v1/storefront/products", {page, category: name});
    return this.api
      .data<{ id: number }>("/api/v1/categories/name/", {}, { name })
      .pipe(
        switchMap((category) =>
          this.api.data<CatalogPage<Product>>("/api/v1/products/get/all", {
            criteria_type: 3,
            criteria_value: String(category.id),
            is_active: true,
            page,
            size: 12,
          }),
        ),
      );
  }
  promotionPage(id: number, page = 1) {
    return this.api
      .get<Envelope<SpringPage<Product>>>(
        "/api/v1/promotions/" + id + "/products",
        { page, size: 12 },
      )
      .pipe(
        map((row) => {
          if (Number(row.code) >= 400) throw new Error(row.message);
          return {
            payload: row.data.content,
            total_items: row.data.totalElements,
            total_pages: row.data.totalPages,
            current_page: page,
            page_size: 12,
          };
        }),
      );
  }
  forSku(id: number) { return this.api.get<Product>((this.auth.session() ? "/api/v1/products/sku/" : "/api/v1/storefront/skus/") + id); }
  detail(id: number) {
    if (!this.auth.session()) return this.api.get<Product>("/api/v1/storefront/products/" + id);
    return this.api.data<Product>("/api/v1/products/get/all", {
      criteria_type: 5,
      criteria_value: String(id),
      page: 1,
      size: 1,
    });
  }
  activePromotions(page = 1, size = 20) {
    return this.api
      .get<Envelope<SpringPage<{ id: number; name: string }>>>(
        "/api/v1/promotions/active",
        { page, size },
      )
      .pipe(
        map((row) => {
          if (Number(row.code) >= 400) throw new Error(row.message);
          return row.data.content || [];
        }),
      );
  }
  promotionProducts(id: number, page = 1, size = 20) {
    return this.api
      .get<Envelope<SpringPage<Product>>>(
        "/api/v1/promotions/" + id + "/products",
        { page, size },
      )
      .pipe(
        map((row) => {
          if (Number(row.code) >= 400) throw new Error(row.message);
          return row.data.content || [];
        }),
      );
  }
  attributes() {
    return this.api.get<unknown[]>("/api/v1/attributes");
  }
  attribute(id: number) {
    return this.api.get<unknown>("/api/v1/attributes/" + id);
  }
  attributeByName(name: string) {
    return this.api.get<unknown>(
      "/api/v1/attributes/name/" + encodeURIComponent(name),
    );
  }
  attributeValues(attributeId: number) {
    return this.api.get<unknown[]>(
      "/api/v1/attribute-values/attribute/" + attributeId,
    );
  }
  attributeValue(attributeId: number, value: string) {
    return this.api.get<unknown>("/api/v1/attribute-values", {
      attributeId,
      value,
    });
  }
}
