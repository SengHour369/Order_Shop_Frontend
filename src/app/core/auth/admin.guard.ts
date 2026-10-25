import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { map } from "rxjs";
import { PermissionService } from "./permission.service";

export const adminGuard: CanActivateFn = () => {
  const access = inject(PermissionService);
  const router = inject(Router);
  return access.load().pipe(
      map(
          (loaded) =>
              (loaded && access.isAdministrator()) ||
              router.createUrlTree(["/admin/access-denied"]),
      ),
  );
};