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
  it('searches a user name or username and selects their stable ID',()=>{
    const f=TestBed.createComponent(ProductSelect);f.componentRef.setInput('label','reviewer name or username');f.componentRef.setInput('options',[{value:41,label:'Sok Dara (@dara)'},{value:42,label:'Sok Dara (@reviewer)'}]);f.detectChanges();const selected=vi.fn();f.componentInstance.changed.subscribe(selected);
    f.nativeElement.querySelector('.select-trigger').click();f.detectChanges();const search=f.nativeElement.querySelector('input');search.value='@reviewer';search.dispatchEvent(new Event('input'));f.detectChanges();const rows=f.nativeElement.querySelectorAll('[role="option"]');expect(rows).toHaveLength(1);rows[0].click();expect(selected).toHaveBeenCalledWith(42);
  });
});
