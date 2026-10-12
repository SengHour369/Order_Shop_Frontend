import { TestBed } from "@angular/core/testing";
import { ProductSelect } from "./product-select";

describe("Reference product category selector", () => {
  it("searches all categories without limiting results to the first page and emits the actual ID", () => {
    const fixture = TestBed.createComponent(ProductSelect);
    fixture.componentRef.setInput("options", Array.from({length: 100}, (_, index) => ({value: index + 1, label: `Category ${index + 1}`})));
    fixture.detectChanges();
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    fixture.nativeElement.querySelector(".select-trigger").click();
    fixture.detectChanges();
    const search = fixture.nativeElement.querySelector("input");
    search.value = "CATEGORY 100";
    search.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    options[0].click();
    fixture.detectChanges();
    expect(changed).toHaveBeenCalledWith(100);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it("does not open a disabled sub-category selector and closes on Escape", () => {
    const fixture = TestBed.createComponent(ProductSelect);
    fixture.componentRef.setInput("disabled", true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("button").click();
    expect(fixture.componentInstance.open()).toBe(false);
    fixture.componentRef.setInput("disabled", false);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("button").click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector("input").dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles:true}));
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
