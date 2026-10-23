import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PageState } from "../../../shared/utils/page-state";
import { Status } from "../../../shared/components/status";
import { Icon } from "../../../shared/components/icon";
import { AdminApi, Row } from "../api/admin.api";
import { stockQuantity } from "./stock-workflow";

interface WarehouseLocation {
  name: string;
  products: Row[];
  stock: number;
  reserved: number;
}

@Component({
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, FormsModule, RouterLink, Status, Icon],
  templateUrl: "./warehouses.html",
  styleUrls: ["../styles/reference.css", "../styles/operations.css"],
})
export class WarehousesPage extends PageState {
  private api = inject(AdminApi);
  locations = signal<WarehouseLocation[]>([]);
  selected = signal<WarehouseLocation | null>(null);
  query = "";
  stock = stockQuantity;

  constructor() {
    super();
    this.run(this.api.allInventory(), (rows) => {
      const locations = new Map<string, WarehouseLocation>();
      for (const row of rows) {
        const name = String(row["warehouse_location"] || "Unassigned");
        const location = locations.get(name) || {
          name,
          products: [],
          stock: 0,
          reserved: 0,
        };
        location.products.push(row);
        location.stock += stockQuantity(row);
        location.reserved += Number(row["reserved_qty"]) || 0;
        locations.set(name, location);
      }
      this.locations.set([...locations.values()]);
      this.selected.set(this.locations()[0] || null);
    });
  }

  visible() {
    return this.locations().filter((location) =>
      location.name.toLowerCase().includes(this.query.toLowerCase()),
    );
  }

  totalStock() {
    return this.locations().reduce(
      (total, location) => total + location.stock,
      0,
    );
  }

  totalProducts() {
    return this.locations().reduce(
      (total, location) => total + location.products.length,
      0,
    );
  }

  lowStock(location: WarehouseLocation) {
    return location.products.filter(
      (row) =>
        Number(row["available_qty"]) <= Number(row["low_stock_threshold"] ?? 5),
    );
  }
}
