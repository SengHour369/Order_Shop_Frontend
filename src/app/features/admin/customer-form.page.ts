import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
import { AdminApi } from "./admin.api";

@Component({
  imports: [FormsModule, RouterLink, Status],
  templateUrl: "./customer-form.html",
  styleUrls: ["./reference.css", "./operations.css"],
})
export class CustomerFormPage extends PageState {
  private api = inject(AdminApi);
  private router = inject(Router);
  firstName = "";
  lastName = "";
  email = "";
  phone = "";
  username = "";
  password = "";
  roleId: number | null = null;

  save() {
    if (this.busy()) return;
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
        group_ids: [],
        permission_ids: [],
      }),
      () => {
        this.password = "";
        void this.router.navigateByUrl("/admin/customers");
      },
    );
  }
}
