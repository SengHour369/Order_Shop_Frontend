import { TestBed } from "@angular/core/testing";
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from "@angular/router";
import { of } from "rxjs";
import { AccountPage } from "./account.page";
import { AuthService } from "../../core/auth/auth.service";
import { ApiClient } from "../../core/api/api-client";

describe("Customer account forms", () => {
  const post = vi.fn(() => of({}));
  beforeEach(() => {
    post.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: AuthService, useValue: { session: () => null } },
        { provide: ApiClient, useValue: { post } },
      ],
    });
  });
  it("prevents registration and password reset with mismatched confirmation", () => {
    const page = TestBed.createComponent(AccountPage).componentInstance;
    for (const mode of ["Register", "Reset password"]) {
      page.mode = mode;
      page.password = "new-password";
      page.confirmation = "different";
      page.submit();
      expect(page.error()).toContain("do not match");
    }
    expect(post).not.toHaveBeenCalled();
  });
  it("clears password and stale feedback when switching account forms", () => {
    const page = TestBed.createComponent(AccountPage).componentInstance;
    page.password = "secret";
    page.confirmation = "secret";
    page.showPassword = true;
    page.error.set("Old error");
    page.message.set("Old success");
    page.changeMode("Forgot password");
    expect(page.mode).toBe("Forgot password");
    expect(page.password).toBe("");
    expect(page.confirmation).toBe("");
    expect(page.showPassword).toBe(false);
    expect(page.error()).toBe("");
    expect(page.message()).toBe("");
  });
});
