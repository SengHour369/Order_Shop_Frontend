import {
  Component,
  inject,
  signal,
  viewChild,
  ElementRef,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { switchMap } from "rxjs";
import { AddressesApi } from "./addresses.api";
import { Address } from "../../core/api/models";
import { AuthService } from "../../core/auth/auth.service";
import { Icon } from "../../shared/icon";
import { SignInCard } from "../../shared/sign-in-card";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
@Component({
  imports: [FormsModule, Icon, SignInCard, Status],
  template: `<div class="banner-with-action">
      <section class="account-banner">
        <div>
          <h1>My Addresses</h1>
          <p>
            Manage your shipping addresses for a faster and<br />
            easier checkout.
          </p>
        </div>
        <div class="banner-art address-art">
          <app-icon name="pin" /><app-icon name="truck" />
        </div>
      </section>
      <button class="primary" (click)="open()" [disabled]="!auth.session()">
        <app-icon name="plus" /> Add New Address
      </button>
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (!auth.session()) {
      <app-sign-in-card
        action="manage your shipping addresses"
        path="/account/addresses"
      />
    }
    <div class="address-grid">
      @for (a of addresses(); track a.id) {
        <article
          class="address-card panel"
          [class.default-address]="a.is_default"
        >
          <div class="address-main">
            <span class="icon-circle large" [class.blue]="!a.is_default"
              ><app-icon [name]="a.is_default ? 'home' : 'pin'"
            /></span>
            <div>
              @if (a.is_default) {
                <span class="badge purple">Default</span>
              }
              <h2>{{ a.is_default ? "Home" : "Address #" + a.id }}</h2>
              <p>{{ auth.session()?.username }}</p>
              <p class="address-text">
                <app-icon name="pin" />{{ a.address_line1 }}, {{ a.city }},
                {{ a.country }} {{ a.zip_code }}
              </p>
            </div>
          </div>
          <div class="address-actions">
            <button class="outline" (click)="open(a)" [disabled]="busy()">
              <app-icon name="edit" /> Edit</button
            ><button
              class="danger-outline"
              (click)="deleteId.set(a.id)"
              [disabled]="busy()"
            >
              <app-icon name="trash" /> Delete
            </button>
          </div>
          @if (deleteId() === a.id) {
            <div class="delete-confirm">
              <p>Remove this address from your account?</p>
              <button
                class="danger-outline"
                [disabled]="busy()"
                (click)="remove(a.id)"
              >
                Delete Address</button
              ><button (click)="deleteId.set(null)">Cancel</button>
            </div>
          }
        </article>
      } @empty {
        @if (auth.session() && !busy() && !error()) {
          <div class="empty">
            <app-icon name="pin" />
            <h2>A home for your deliveries</h2>
            <p>Add your first shipping address to get started.</p>
            <button class="primary" (click)="open()">Add New Address</button>
          </div>
        }
      }
    </div>
    <dialog
      #editor
      class="address-dialog customer-dialog"
      aria-label="Address information"
      (close)="editing.set(null)"
    >
      <div class="dialog-heading">
        <h2>{{ editing() ? "Edit Address" : "Add New Address" }}</h2>
        <button
          type="button"
          class="icon-button"
          (click)="close()"
          aria-label="Close address form"
        >
          <app-icon name="close" />
        </button>
      </div>
      <form #f="ngForm" (ngSubmit)="save()">
        <div class="form-section-title">
          <span class="icon-circle"><app-icon name="pin" /></span>
          <h3>Address Information</h3>
        </div>
        <label
          >Street Address <b>*</b
          ><textarea
            name="street"
            [(ngModel)]="form.address_line1"
            rows="3"
            required
            maxlength="500"
            placeholder="House number, street and neighborhood"
          ></textarea>
        </label>
        <div class="form-grid">
          <label
            >Province / City <b>*</b
            ><input
              name="city"
              [(ngModel)]="form.city"
              required
              placeholder="Phnom Penh" /></label
          ><label
            >Postal Code <b>*</b
            ><input name="zip" [(ngModel)]="form.zip_code" required
          /></label>
        </div>
        <label
          >Country <b>*</b
          ><input name="country" [(ngModel)]="form.country" required /></label
        ><label class="switch-label"
          ><input
            type="checkbox"
            name="default"
            [(ngModel)]="form.is_default"
          /><span class="switch"></span
          ><span
            >Set as default address<small
              >This address will be selected automatically at checkout.</small
            ></span
          ></label
        ><app-status [error]="error()" />
        <div class="dialog-actions">
          <button type="button" (click)="close()">Cancel</button
          ><button class="primary" [disabled]="f.invalid || busy()">
            <app-icon name="check" />{{ busy() ? "Saving…" : "Save Address" }}
          </button>
        </div>
      </form>
    </dialog>`,
})
export class AddressesPage extends PageState {
  api = inject(AddressesApi);
  auth = inject(AuthService);
  editor = viewChild.required<ElementRef<HTMLDialogElement>>("editor");
  addresses = signal<Address[]>([]);
  editing = signal<number | null>(null);
  deleteId = signal<number | null>(null);
  form = {
    address_line1: "",
    city: "",
    zip_code: "",
    country: "Cambodia",
    is_default: false,
  };
  constructor() {
    super();
    if (this.auth.session())
      this.run(this.api.list(), (a) => this.addresses.set(a));
  }
  open(a?: Address) {
    this.error.set("");
    this.editing.set(a?.id || null);
    this.form = a
      ? {
          address_line1: a.address_line1,
          city: a.city,
          zip_code: a.zip_code,
          country: a.country,
          is_default: a.is_default,
        }
      : {
          address_line1: "",
          city: "",
          zip_code: "",
          country: "Cambodia",
          is_default: false,
        };
    this.editor().nativeElement.showModal();
  }
  close() {
    this.editor().nativeElement.close();
  }
  save() {
    const id = this.editing();
    this.run(
      (id ? this.api.update(id, this.form) : this.api.create(this.form)).pipe(
        switchMap(() => this.api.list()),
      ),
      (a) => {
        this.addresses.set(a);
        this.close();
        this.message.set("Address saved successfully.");
      },
    );
  }
  remove(id: number) {
    this.run(
      this.api.remove(id).pipe(switchMap(() => this.api.list())),
      (a) => {
        this.addresses.set(a);
        this.deleteId.set(null);
      },
    );
  }
}
