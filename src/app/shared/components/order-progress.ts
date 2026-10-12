import { Component, input } from "@angular/core";
import { Icon } from "./icon";
@Component({
  selector: "app-order-progress",
  imports: [Icon],
  template: `<div class="order-progress">
    @for (step of steps; track step.label; let i = $index) {
      <div
        class="progress-step"
        [class.done]="i < current()"
        [class.current]="i === current()"
      >
        <span><app-icon [name]="i < current() ? 'check' : step.icon" /></span
        ><small>{{ step.label }}</small>
      </div>
    }
  </div>`,
})
export class OrderProgress {
  status = input("PENDING");
  steps = [
    { label: "Order Placed", icon: "box" },
    { label: "Processing", icon: "settings" },
    { label: "Shipped", icon: "truck" },
    { label: "Delivered", icon: "check" },
  ];
  current() {
    return ["DELIVERED", "COMPLETED"].includes(this.status())
      ? 3
      : this.status() === "SHIPPED"
        ? 2
        : ["CONFIRMED", "PROCESSING"].includes(this.status())
          ? 1
          : 0;
  }
}
