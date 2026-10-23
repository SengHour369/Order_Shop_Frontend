import { of, switchMap } from 'rxjs';
import { StorefrontAccessService } from '../../core/storefront/storefront-access.service';
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { Product } from "../../core/api/models";
import { CatalogApi } from "../catalog/catalog.api";
import { ProductCard } from "../../shared/components/product-card";
import { SignInCard } from "../../shared/components/sign-in-card";
import { Icon } from "../../shared/components/icon";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [TranslatePipe, RouterLink, ProductCard, SignInCard, Icon, Status],
  templateUrl: "./home.html",
})
export class HomePage extends PageState {
  auth = inject(AuthService);
  api = inject(CatalogApi);
  private storefront = inject(StorefrontAccessService);
  products = signal<Product[]>([]);
  categories = [
    { name: "Electronics", icon: "laptop", tone: "lavender" },
    { name: "Fashion", icon: "shirt", tone: "pink" },
    { name: "Home & Living", icon: "sofa", tone: "mint" },
    { name: "Beauty & Health", icon: "beauty", tone: "pink" },
    { name: "Sports & Fitness", icon: "sports", tone: "mint" },
    { name: "Toys & Games", icon: "game", tone: "blue" },
    { name: "Groceries", icon: "bag", tone: "mint" },
    { name: "Automotive", icon: "box", tone: "lavender" },
    { name: "Office & Stationery", icon: "card", tone: "lavender" },
  ];
  constructor() {
    super();
    const products = this.auth.session() ? this.api.list() : this.storefront.load().pipe(
      switchMap(settings => {
        if (!settings.guestBrowsing) {
          this.accessDenied.set(true);
          return of({payload: [] as Product[]});
        }
        return this.api.list();
      }),
    );
    this.run(products, (r) =>
        this.products.set(r.payload.slice(0, 5)),
      );
  }
}
