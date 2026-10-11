import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { Product } from "../../core/api/models";
import { CatalogApi } from "../catalog/catalog.api";
import { ProductCard } from "../../shared/product-card";
import { SignInCard } from "../../shared/sign-in-card";
import { Icon } from "../../shared/icon";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
@Component({
  imports: [RouterLink, ProductCard, SignInCard, Icon, Status],
  templateUrl: "./home.html",
})
export class HomePage extends PageState {
  auth = inject(AuthService);
  api = inject(CatalogApi);
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
    if (this.auth.session())
      this.run(this.api.list(), (r) =>
        this.products.set(r.payload.slice(0, 5)),
      );
  }
}
