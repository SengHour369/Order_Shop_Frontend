import { TestBed } from "@angular/core/testing";
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "./auth.service";
import { customerAssistantGuard } from "./customer-assistant.guard";
import { routes } from "../../app.routes";

describe("Customer assistant access", () => {
  function access(role: string) {
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { session: () => ({ role }) } },
    ] });
    return TestBed.runInInjectionContext(() => customerAssistantGuard(
      {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot,
    ));
  }

  for (const role of ["ADMIN", "MANAGER"]) {
    it(`routes ${role} to its admin destination`, () => {
      const result = access(role);
      expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router["createUrlTree"]>)).toBe(role === 'ADMIN' ? '/admin/assistant' : '/admin');
    });
  }

  it("keeps customer chat accessible", () => {
    expect(access("CUSTOMER")).toBe(true);
  });

  it("keeps the new admin workspace separate from customer chat", () => {
    const adminChat = routes.find(route => route.path === "admin")?.children?.find(route => route.path === "assistant");
    expect(adminChat?.loadComponent).toBeDefined();
    expect(adminChat?.canActivate?.length).toBe(1);
    expect(routes.find(route => route.path === "assistant")?.canActivate).toContain(customerAssistantGuard);
  });
});
