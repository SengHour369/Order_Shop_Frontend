import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { forkJoin } from "rxjs";
import { ActivatedRoute } from "@angular/router";
import { PaymentsApi } from "./payments.api";
import { Order, Transaction } from "../../core/api/models";
import { OrdersApi } from "../orders/orders.api";
import { AuthService } from "../../core/auth/auth.service";
import { Icon } from "../../shared/icon";
import { SignInCard } from "../../shared/sign-in-card";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
@Component({
  imports: [CurrencyPipe, FormsModule, Icon, SignInCard, Status],
  template: `<div class="page-heading">
      <div>
        <h1>Payment Methods</h1>
        <p>View payment options and your transaction history.</p>
      </div>
      <div class="security-tip">
        <span class="icon-circle green"><app-icon name="shield" /></span>
        <div>
          <h3>Your payment details stay private</h3>
          <p>We don't collect or store card numbers here.</p>
        </div>
      </div>
    </div>
    @if (!auth.session()) {
      <app-sign-in-card
        action="view your payment records"
        path="/account/payments"
      />
    }
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (order(); as o) {
      <section class="panel">
        <h2>Payment for order #{{ o.order_number }}</h2>
        <p>Order total: {{ o.total_amount | currency: "USD" }}</p>
        @if (canCreatePayment()) {
          <form (ngSubmit)="createPayment()">
            <label
              >Payment method
              <select
                name="paymentMethod"
                [(ngModel)]="paymentMethod"
                [disabled]="busy()"
              >
                <option>BAKONG</option>
                <option>ABA</option>
                <option>ACLEDA</option>
                <option>RAZORPAY</option>
                <option>SINGE</option>
              </select>
            </label>
            <p>
              This creates a pending payment record. No money is transferred.
            </p>
            <button class="primary" [disabled]="busy() || creationUncertain()">
              Create payment record
            </button>
          </form>
        } @else {
          <p>
            Check the records below. New payment records require a pending order
            without an existing active or successful payment.
          </p>
        }
        @if (creationUncertain()) {
          <p class="alert">
            Refresh payment history before trying again. The previous request
            may have created a record.
          </p>
        }
      </section>
    }
    <div class="payment-grid">
      <section>
        <div class="section-heading">
          <h2><app-icon name="card" /> Saved Cards</h2>
          <button class="outline small" disabled>
            <app-icon name="plus" /> Add Card
          </button>
        </div>
        <div class="panel empty-payment">
          <app-icon name="card" />
          <h3>Card saving is not available yet</h3>
          <p>Card details are never saved in your browser.</p>
        </div>
        <h2 class="section-label">
          <app-icon name="wallet" /> E-Wallet / Mobile Payment
        </h2>
        @for (method of methods; track method.name) {
          <article class="payment-method">
            <span class="payment-logo" [class]="method.color">{{
              method.short
            }}</span>
            <div>
              <h3>{{ method.name }}</h3>
              <p>{{ method.description }}</p>
            </div>
            <span class="badge neutral">Payment option</span>
          </article>
        }
      </section>
      <section class="panel">
        <div class="section-title">
          <span class="icon-circle"><app-icon name="card" /></span>
          <div>
            <h2>Payment Information</h2>
            <p>Know what happens next.</p>
          </div>
        </div>
        <div class="payment-tabs">
          <span class="tab active"><app-icon name="wallet" /> E-Wallet</span
          ><span class="tab"><app-icon name="bank" /> Bank Payment</span>
        </div>
        <div class="unavailable-box">
          <span class="icon-circle"><app-icon name="lock" /></span>
          <h3>Online payment is not available yet</h3>
          <p>
            You can place an order and check its payment records. Starting a new
            online payment will be available when payment setup is complete.
          </p>
        </div>
        <p class="availability-note">
          <app-icon name="shield" /> An order is marked paid only after
          confirmation from the payment service.
        </p>
      </section>
    </div>
    <div class="section-heading">
      <h2>Payment History</h2>
      <button
        class="outline small"
        [disabled]="!auth.session() || busy()"
        (click)="load()"
      >
        <app-icon name="refresh" />Refresh
      </button>
    </div>
    <div class="panel table-scroll">
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Order</th>
            <th>Method</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          @for (t of transactions(); track t.id) {
            <tr>
              <td>{{ t.transaction_no }}</td>
              <td>#{{ t.order_id }}</td>
              <td>{{ t.payment_method }}</td>
              <td>{{ t.amount | currency: t.currency }}</td>
              <td>
                <span class="badge">{{ t.status }}</span>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="empty-cell">
                {{
                  auth.session()
                    ? "No payment records to display."
                    : "Sign in to view your payment history."
                }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>`,
})
export class PaymentsPage extends PageState {
  api = inject(PaymentsApi);
  orders = inject(OrdersApi);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);
  transactions = signal<Transaction[]>([]);
  order = signal<Order | null>(null);
  creationUncertain = signal(false);
  paymentMethod = "BAKONG";
  methods = [
    {
      name: "Bakong KHQR",
      short: "KHQR",
      color: "red",
      description: "Cambodia national payment network",
    },
    {
      name: "ABA",
      short: "ABA",
      color: "navy",
      description: "Scan a supported Bakong QR",
    },
    {
      name: "ACLEDA",
      short: "AC",
      color: "blue",
      description: "Bank payment via KHQR",
    },
  ];
  constructor() {
    super();
    this.load();
  }
  load() {
    if (!this.auth.session()) return;
    const id = Number(this.route.snapshot.queryParamMap.get("order"));
    if (id) {
      this.run(
        forkJoin({
          order: this.orders.detail(id),
          transactions: this.api.byOrder(id),
        }),
        (result) => {
          this.order.set(result.order);
          this.transactions.set(result.transactions);
          this.creationUncertain.set(false);
        },
      );
    } else {
      this.run(this.api.list(), (t) => this.transactions.set(t));
    }
  }
  canCreatePayment() {
    const order = this.order();
    return (
      order?.status === "PENDING" &&
      order.total_amount > 0 &&
      !this.transactions().some((t) =>
        ["PENDING", "PROCESSING", "SUCCESS", "COMPLETED", "PAID"].includes(
          t.status,
        ),
      )
    );
  }
  createPayment() {
    const order = this.order();
    if (
      !order ||
      this.busy() ||
      this.creationUncertain() ||
      !this.canCreatePayment()
    )
      return;
    // This endpoint has no idempotency key. Reconcile history after any failure.
    this.creationUncertain.set(true);
    this.run(
      this.api.create(order.id, order.total_amount, this.paymentMethod, "USD"),
      (transaction) => {
        this.transactions.update((rows) => [transaction, ...rows]);
        this.creationUncertain.set(false);
        this.message.set(
          "Payment record created. Payment confirmation is still required.",
        );
      },
    );
  }
}
