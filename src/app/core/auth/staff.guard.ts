import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";
export const staffGuard: CanActivateFn = () =>
  ["ADMIN", "MANAGER"].includes(inject(AuthService).session()?.role || "") ||
  inject(Router).createUrlTree(["/shop"]);
