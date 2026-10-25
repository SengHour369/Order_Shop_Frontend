import { TestBed } from "@angular/core/testing";
import { provideRouter, Router, UrlTree } from "@angular/router";
import { of, firstValueFrom, isObservable } from "rxjs";
import { adminGuard } from "./admin.guard";
import { staffGuard } from "./staff.guard";
import {
 PermissionService,
 permissionGuard,
 requiredPermissions,
 isImportRoute,
} from "./permission.service";
import { AuthService } from "./auth.service";

describe("Import-specific staff access", () => {
 let role: string, allowed: boolean;
 let administrator = false;
 let load: ReturnType<typeof vi.fn>;

 beforeEach(() => {
  role = "USER";
  allowed = true;
  administrator = false;
  load = vi.fn(() => of(true));
  TestBed.configureTestingModule({
   providers: [
    provideRouter([]),
    { provide: AuthService, useValue: { session: () => ({ role }) } },
    {
     provide: PermissionService,
     useValue: {
      load,
      allows: () => allowed,
      landingPath: () => "/admin/imports",
      isAdministrator: () => administrator,
     },
    },
   ],
  });
 });

 async function enter(url: string, child = false) {
  const result = TestBed.runInInjectionContext(() =>
      (child ? permissionGuard : staffGuard)({} as any, { url } as any),
  );
  return isObservable(result) ? firstValueFrom(result) : await result;
 }

 it("admits an explicitly authorized staff uploader to import pages", async () => {
  expect(await enter("/admin/imports?batch=123")).toBe(true);
  expect(load).toHaveBeenCalled();
  expect(await enter("/admin/imports", true)).toBe(true);
 });

 it("rejects staff without the required import permission", async () => {
  allowed = false;
  expect(await enter("/admin/import-approvals")).toBeInstanceOf(UrlTree);
 });

 it("prevents import staff from entering or navigating to unrelated admin modules", async () => {
  expect(await enter("/admin/settings")).toBeInstanceOf(UrlTree);
  expect(await enter("/admin/settings", true)).toBeInstanceOf(UrlTree);
  expect(await enter("/admin", true)).toBeInstanceOf(UrlTree);
 });

 it("admits a USER login role when current group access grants staff entry", async () => {
  administrator = true;
  expect(await enter("/admin/orders")).toBe(true);
  expect(await enter("/admin/orders", true)).toBe(true);
  allowed = false;
  expect(await enter("/admin/products", true)).toBeInstanceOf(UrlTree);
 });

 it("uses current group entry rather than the login role for admin-only parent routes", async () => {
  const run = () =>
      TestBed.runInInjectionContext(() =>
          adminGuard({} as any, { url: "/admin/users" } as any),
      );
  administrator = true;
  expect(await firstValueFrom(run() as any)).toBe(true);
  administrator = false;
  expect(await firstValueFrom(run() as any)).toBeInstanceOf(UrlTree);
 });

 it("does not match arbitrary paths that share the import prefix", () => {
  expect(isImportRoute("/admin/imports-unsafe")).toBe(false);
  expect(isImportRoute("/admin/imports/anything")).toBe(false);
  expect(isImportRoute("/admin/import-executions?batch=x")).toBe(true);
 });

 it("requires review grants for approvals and upload grants for preparation", () => {
  expect(requiredPermissions("/admin/review-authorization")).toEqual([
   "IMPORT_REVIEW",
  ]);
  expect(requiredPermissions("/admin/my-requests")).toEqual([
   "IMPORT_UPLOAD",
  ]);
 });

 it("opens a permitted module when a group user has no dashboard grants", async () => {
  administrator = true;
  allowed = false;
  const result = await enter("/admin");
  expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      "/admin/imports",
  );
 });

 it("preserves role-based parent admission for existing managers", async () => {
  role = "MANAGER";
  expect(await enter("/admin/orders")).toBe(true);
 });
});