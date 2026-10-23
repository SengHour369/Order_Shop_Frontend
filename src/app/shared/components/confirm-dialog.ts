import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';
@Component({
  selector: 'app-confirm-dialog',
  template: `<dialog #dialog aria-labelledby="confirmation-title" aria-describedby="confirmation-message" (cancel)="$event.preventDefault(); closed.emit(false)" (click)="backdrop($event)">
    <div class="confirmation-content">
      <span class="confirmation-icon" [class.danger]="danger()" aria-hidden="true">{{ danger() ? '!' : '✓' }}</span>
      <h2 id="confirmation-title">{{ title() }}</h2>
      <p id="confirmation-message">{{ message() }}</p>
      <div class="confirmation-actions">
        <button type="button" class="cancel" autofocus (click)="closed.emit(false)">Cancel</button>
        <button type="button" class="confirm" [class.danger]="danger()" (click)="closed.emit(true)">{{ action() }}</button>
      </div>
    </div>
  </dialog>`,
  styles: [`
    dialog{width:min(440px,calc(100vw - 32px));padding:0;border:1px solid #e1e8f3;border-radius:16px;color:#16214e;box-shadow:0 24px 80px #13234530;box-sizing:border-box}
    dialog::backdrop{background:#111e3f66;backdrop-filter:blur(3px)}
    .confirmation-content{padding:28px}.confirmation-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#e4f8ef;color:#05945f;font-size:23px;font-weight:700}.confirmation-icon.danger{background:#fff0ed;color:#d74343}
    h2{font-size:20px;line-height:1.4;margin:18px 0 8px;font-weight:650}p{font-size:14px;line-height:1.7;color:#62749a;margin:0;overflow-wrap:anywhere}
    .confirmation-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:26px}button{font:inherit;font-size:13px;font-weight:600;min-height:40px;padding:9px 18px;border-radius:7px;border:1px solid #dce5f3;cursor:pointer}.cancel{background:#fff;color:#405780}.confirm{background:#0866ff;border-color:#0866ff;color:white}.confirm.danger{background:#d74343;border-color:#d74343}button:focus-visible{outline:3px solid #9cc0ff;outline-offset:3px}
  `],
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly action = input.required<string>();
  readonly danger = input(false);
  readonly closed = output<boolean>();
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() { afterNextRender(() => this.dialog().nativeElement.showModal()); }
  backdrop(event: MouseEvent) {
    if (event.target !== this.dialog().nativeElement) return;
    const bounds = this.dialog().nativeElement.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.closed.emit(false);
  }
}
