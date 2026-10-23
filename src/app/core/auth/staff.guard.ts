import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";
import { PermissionService, isStaffWorkflowRoute } from './permission.service';
import { map } from 'rxjs';
export const staffGuard: CanActivateFn = (_route, state) => {
  const auth=inject(AuthService), router=inject(Router),access=inject(PermissionService);
  if (["ADMIN", "MANAGER"].includes(auth.session()?.role || "")) return true;
  // A granted import role does not open any other admin module.
  return access.load(true).pipe(map(ok => {
    const entry = ok && (access.isAdministrator() || isStaffWorkflowRoute(state.url));
    if (entry && state.url.split(/[?#]/)[0].replace(/\/$/, '') === '/admin' && !access.allows(state.url)) {
      return router.createUrlTree([access.landingPath()]);
    }
    return entry && access.allows(state.url) || router.createUrlTree(['/shop']);
  }));
};
