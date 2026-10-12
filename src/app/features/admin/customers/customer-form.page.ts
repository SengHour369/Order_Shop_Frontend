import { PermissionService } from "../../../core/auth/permission.service";
import { PermissionPicker } from "../settings/permission-picker";
import { forkJoin } from "rxjs";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { PageState } from "../../../shared/utils/page-state";
import { Status } from "../../../shared/components/status";
import { AdminApi, Row } from "../api/admin.api";

@Component({
  imports: [TranslatePipe, FormsModule, RouterLink, Status, PermissionPicker],
  templateUrl: "./customer-form.html",
  styleUrls: ["../styles/reference.css", "../styles/operations.css"],
})
export class CustomerFormPage extends PageState {
  access = inject(PermissionService);
  private api = inject(AdminApi);
  private router = inject(Router);
  firstName = "";
  lastName = "";
  email = "";
  phone = "";
  username = "";
  password = "";
  roleId: number | null = null;

  groups = signal<Row[]>([]);
  functions = signal<Row[]>([]);
  chosenGroups = new Set<number>();
  chosenPermissions = new Set<number>();
  constructor() {
    super();
    this.run(forkJoin({groups: this.api.allGroups(), functions: this.api.allPermissionRows("functions")}), data => {
      this.groups.set(data.groups.filter(row => row['is_active'] === true));
      this.functions.set(data.functions);
    });
  }
  toggleGroup(id: unknown) {
    const value = Number(id);
    this.chosenGroups.has(value) ? this.chosenGroups.delete(value) : this.chosenGroups.add(value);
  }
  save() {
    if (this.busy() || !this.access.has("USER_MANAGE")) return;
    if (
      !this.firstName.trim() ||
      !this.lastName.trim() ||
      !this.email.trim() ||
      !this.phone.trim() ||
      !this.username.trim() ||
      !this.password ||
      !Number.isSafeInteger(this.roleId) ||
      Number(this.roleId) <= 0
    ) {
      this.error.set(
        "Complete the required fields and enter a valid customer role ID.",
      );
      return;
    }
    this.run(
      this.api.createCustomer({
        full_name: `${this.firstName.trim()} ${this.lastName.trim()}`,
        username: this.username.trim(),
        password: this.password,
        email: this.email.trim(),
        phone: this.phone.trim(),
        role_ids: [this.roleId],
        group_ids: [...this.chosenGroups],
        permission_ids: [...this.chosenPermissions],
      }),
      () => {
        this.password = "";
        void this.router.navigateByUrl("/admin/customers");
      },
    );
  }
}
