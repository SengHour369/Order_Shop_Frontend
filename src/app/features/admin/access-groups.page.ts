import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { concatMap, forkJoin, from, of, switchMap, tap, toArray } from "rxjs";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
import { AdminApi, Row, when } from "./admin.api";

@Component({
  imports: [FormsModule, RouterLink, Status],
  templateUrl: "./access-groups.html",
  styleUrls: ["./reference.css", "./operations.css"],
})
export class AccessGroupsPage extends PageState {
  private api = inject(AdminApi);
  private router = inject(Router);
  creating = this.router.url.endsWith("/add");
  rows = signal<Row[]>([]);
  functions = signal<Row[]>([]);
  selected = signal<Row | null>(null);
  permissions = signal<Row[]>([]);
  query = "";
  permissionQuery = "";
  name = "";
  code = "";
  display = "";
  chosen = new Set<number>();
  savedPermissions = new Set<number>();
  createdId: number | null = null;
  when = when;

  constructor() {
    super();
    this.run(
      forkJoin({
        groups: this.api.allPermissionRows("user-groups"),
        functions: this.api.allPermissionRows("functions"),
      }),
      (result) => {
        this.rows.set(result.groups);
        this.functions.set(result.functions);
      },
    );
  }

  visible() {
    return this.rows().filter((row) =>
      `${row["group_name"]} ${row["group_code"]} ${row["display"]}`
        .toLowerCase()
        .includes(this.query.toLowerCase()),
    );
  }

  activeCount() {
    return this.rows().filter((row) => row["is_active"] === true).length;
  }

  inspect(row: Row) {
    this.selected.set(row);
    this.permissions.set([]);
    this.run(
      this.api.allPermissionRows(
        "group-permissions",
        1,
        String(row["group_id"]),
      ),
      (rows) =>
        this.permissions.set(
          rows.filter((permission) => permission["is_active"] === true),
        ),
    );
  }

  functionName(id: unknown) {
    const row = this.functions().find(
      (item) => Number(item["func_id"]) === Number(id),
    );
    return String(row?.["func_name"] || `Permission ${id}`);
  }

  modules() {
    return [
      ...new Set(
        this.functions().map((row) => String(row["module"] || "Other")),
      ),
    ];
  }

  moduleFunctions(module: string) {
    return this.functions().filter(
      (row) =>
        String(row["module"] || "Other") === module &&
        row["is_active"] === true &&
        `${row["func_name"]} ${row["func_code"]}`
          .toLowerCase()
          .includes(this.permissionQuery.toLowerCase()),
    );
  }

  toggle(id: unknown) {
    const value = Number(id);
    if (this.savedPermissions.has(value)) return;
    if (this.chosen.has(value)) this.chosen.delete(value);
    else this.chosen.add(value);
  }

  clear() {
    this.chosen = new Set(this.savedPermissions);
  }

  save() {
    if (this.busy()) return;
    if (!this.name.trim() || !this.code.trim()) {
      this.error.set("Group name and code are required.");
      return;
    }
    const group = this.createdId
      ? of({ group_id: this.createdId } as Row)
      : this.api.createPermissionRow("user-groups", {
          groupCode: this.code.trim(),
          groupName: this.name.trim(),
          display: this.display.trim(),
        });
    this.run(
      group.pipe(
        tap((row) => {
          this.createdId = Number(row["group_id"]);
          if (!this.createdId)
            throw new Error("The service did not return a group ID.");
        }),
        switchMap(() =>
          from(
            [...this.chosen].filter((id) => !this.savedPermissions.has(id)),
          ).pipe(
            concatMap((id) =>
              this.api
                .createPermissionRow("group-permissions", {
                  groupId: this.createdId!,
                  funcId: id,
                })
                .pipe(tap(() => this.savedPermissions.add(id))),
            ),
            toArray(),
          ),
        ),
      ),
      () => void this.router.navigateByUrl("/admin/groups"),
    );
  }
}
