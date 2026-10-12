import { Directive } from "@angular/core";

/** Keep incomplete catalog image URLs from breaking the product layout. */
@Directive({
  selector: "img[appProductImage]",
  host: { "(error)": "fallback($event)" },
})
export class ProductImage {
  fallback(event: Event) {
    const image = event.target as HTMLImageElement;
    const fallback = "/images/product-placeholder.svg";
    if (!image.src.endsWith(fallback)) image.src = fallback;
  }
}
