import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";

export const customerAssistantGuard: CanActivateFn = () => {
  const role = inject(AuthService).session()?.role;
  if (role === 'ADMIN') return inject(Router).createUrlTree(['/admin/assistant']);
  if (role === 'MANAGER') return inject(Router).createUrlTree(['/admin']);
  return true;
};
