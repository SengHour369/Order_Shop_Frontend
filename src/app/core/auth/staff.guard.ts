import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";
import { PermissionService, isImportRoute } from './permission.service';
import { map } from 'rxjs';
export const staffGuard: CanActivateFn = (_route, state) => {
  const auth=inject(AuthService), router=inject(Router),access=inject(PermissionService);
  if (["ADMIN", "MANAGER"].includes(auth.session()?.role || "")) return true;
  // A granted import role does not open any other admin module.
  if (isImportRoute(state.url))
    return access.load(true).pipe(map(ok=>ok&&access.allows(state.url)||router.createUrlTree(['/shop'])));
  return router.createUrlTree(['/shop']);
};
