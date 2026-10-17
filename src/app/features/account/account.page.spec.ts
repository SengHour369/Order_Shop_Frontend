import { TestBed } from "@angular/core/testing";
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from "@angular/router";
import { of, throwError } from "rxjs";
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
        { provide: AuthService, useValue: { session: () => null, secondFactorChallenge:()=>'', login: vi.fn(() => of({})) } },
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
  it("remembers only the username when selected and removes it when unchecked", () => {
    const page = TestBed.createComponent(AccountPage).componentInstance;
    vi.spyOn(page, "done").mockImplementation(() => {});
    page.username = "test-customer";
    page.password = "test-password";
    page.rememberMe = true;
    page.submit();
    expect(localStorage.getItem("eshop.rememberedUsername")).toBe("test-customer");
    expect(localStorage.getItem("eshop.rememberedUsername")).not.toContain(page.password);
    page.rememberMe = false;
    page.submit();
    expect(localStorage.getItem("eshop.rememberedUsername")).toBeNull();
  });
  it("requests the existing email reset API and shows a non-enumerating confirmation", () => {
    const page = TestBed.createComponent(AccountPage).componentInstance;
    page.changeMode("Forgot password");
    page.email = "  customer@example.com  ";
    page.submit();
    expect(post).toHaveBeenCalledWith("/api/v1/public/forgot-password", { email: "customer@example.com" });
    expect(page.message()).toBe("If an account exists for this email, you will receive a password reset link.");
    expect(page.busy()).toBe(false);
  });
  it("shows reset delivery failures without displaying a success confirmation", () => {
    post.mockReturnValueOnce(throwError(() => ({ error: { message: "Reset email could not be sent" } })));
    const page = TestBed.createComponent(AccountPage).componentInstance;
    page.changeMode("Forgot password");
    page.email = "customer@example.com";
    page.submit();
    expect(page.error()).toBe("Reset email could not be sent");
    expect(page.message()).toBe("");
    expect(page.busy()).toBe(false);
  });
  it("normalizes registration email and prevents rapid verification resends", () => {
    const page = TestBed.createComponent(AccountPage).componentInstance;
    page.mode = "Register"; page.username = " test "; page.email = " User@Example.test ";
    page.phone = " 12345678 "; page.fullName = " Test User "; page.password = page.confirmation = "password";
    page.submit();
    expect(post).toHaveBeenCalledWith("/api/v1/public/register", { username: "test", email: "user@example.test", phone: "12345678", full_name: "Test User", password: "password" });
    expect(page.mode).toBe("Verify"); expect(page.resendSeconds()).toBe(60);
    const calls = post.mock.calls.length; page.resend(); expect(post.mock.calls.length).toBe(calls);
  });
  it("does not switch to verification after an email delivery failure", () => {
    post.mockReturnValueOnce(throwError(() => ({ error: { message: "Unable to send email" } })));
    const page = TestBed.createComponent(AccountPage).componentInstance;
    page.mode = "Register"; page.password = page.confirmation = "password"; page.email = "user@example.test";
    page.submit(); expect(page.mode).toBe("Register"); expect(page.error()).toContain("Unable to send email");
  });
});
