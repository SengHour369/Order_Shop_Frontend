import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { forkJoin } from "rxjs";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PaymentsApi } from "./payments.api";
import { Order, Transaction } from "../../core/api/models";
import { OrdersApi } from "../orders/orders.api";
import { AuthService } from "../../core/auth/auth.service";
import { Icon } from "../../shared/components/icon";
import { SignInCard } from "../../shared/components/sign-in-card";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [TranslatePipe, CurrencyPipe, FormsModule, Icon, SignInCard, Status, RouterLink],
  styleUrl: "./customer-transactions.scss",
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
              >{{ "Payment method" | translate }}
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
    @if(auth.session()) {
    <section class="customer-transactions">
      <header class="transactions-heading"><div><p class="section-eyebrow">YOUR PAYMENTS</p><h2>Transaction History</h2><p>Review the payment records linked to your orders.</p></div><button type="button" class="history-refresh" (click)="load()" [disabled]="busy()"><app-icon name="refresh" />Refresh</button></header>
      <div class="history-scroll"><table class="customer-history"><thead><tr><th>Transaction</th><th>Order</th><th>Method</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
      @for(transaction of transactions();track transaction.id){<tr [class.selected]="selectedTransaction()?.id===transaction.id"><td><strong>{{transaction.transaction_no || '#'+transaction.id}}</strong></td><td>#{{transaction.order_id}}</td><td>{{transaction.payment_method || '—'}}</td><td>{{transaction.amount | currency:transaction.currency}}</td><td><span class="transaction-status" [class.paid]="transactionTone(transaction)==='paid'" [class.failed]="transactionTone(transaction)==='failed'" [class.pending]="transactionTone(transaction)==='pending'">{{transaction.status}}</span></td><td><button type="button" class="view-transaction" (click)="selectedTransaction.set(transaction)" [attr.aria-label]="'View transaction '+(transaction.transaction_no || transaction.id)">View Details <span aria-hidden="true">↗</span></button></td></tr>}
      @empty{<tr><td colspan="6" class="history-empty"><app-icon name="wallet" /><strong>No transactions yet</strong><p>Your payment records will appear here after you pay for an order.</p></td></tr>}
      </tbody></table></div>
    </section>
    @if(selectedTransaction();as transaction){
      <section class="customer-transaction-detail" aria-labelledby="transaction-heading">
        <header class="transactions-heading"><div><p class="section-eyebrow">PAYMENT RECORD</p><h2 id="transaction-heading">Transaction Details</h2><p>{{transaction.transaction_no || 'Transaction #'+transaction.id}}</p></div><button type="button" class="history-refresh" (click)="selectedTransaction.set(null)" aria-label="Close transaction details"><app-icon name="x" />Close</button></header>
        <div class="customer-payment-banner" [class.paid]="transactionTone(transaction)==='paid'" [class.failed]="transactionTone(transaction)==='failed'"><span class="payment-state-icon"><app-icon [name]="transactionTone(transaction)==='paid'?'check':transactionTone(transaction)==='failed'?'x':'clock'" /></span><div><h3>{{transactionTone(transaction)==='paid'?'Payment completed':transactionTone(transaction)==='pending'?'Payment pending':transactionTone(transaction)==='failed'?'Payment unsuccessful':transaction.status}}</h3><p>{{transactionTone(transaction)==='paid'?'Your payment has been recorded as successful.':transactionTone(transaction)==='pending'?'Your payment is awaiting confirmation.':'Status reported by the payment service.'}}</p></div><strong>{{transaction.amount | currency:transaction.currency}}</strong></div>
        <div class="customer-detail-grid"><article><h3><app-icon name="wallet" />Payment Information</h3><dl><div><dt>Transaction ID</dt><dd>{{transaction.id}}</dd></div><div><dt>Reference</dt><dd>{{transaction.transaction_no || '—'}}</dd></div><div><dt>Amount</dt><dd>{{transaction.amount | currency:transaction.currency}}</dd></div><div><dt>Currency</dt><dd>{{transaction.currency}}</dd></div><div><dt>Payment Method</dt><dd>{{transaction.payment_method || '—'}}</dd></div><div><dt>Status</dt><dd><span class="transaction-status" [class.paid]="transactionTone(transaction)==='paid'" [class.failed]="transactionTone(transaction)==='failed'">{{transaction.status}}</span></dd></div></dl></article><article><h3><app-icon name="shopping-bag" />Your Order</h3><dl><div><dt>Order ID</dt><dd>#{{transaction.order_id}}</dd></div></dl><p class="customer-order-note">View your order for purchased items, delivery information, and the latest order status.</p><a class="transaction-order-link" [routerLink]="['/orders',transaction.order_id]">View Order <span aria-hidden="true">↗</span></a><p class="privacy-note"><app-icon name="shield" />Only your payment records are shown here.</p></article></div>
      </section>
    }
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
          <div><h2>{{ "Payment Information" | translate }}</h2><p>Know what happens next.</p></div>
        </div>
        <div class="payment-tabs">
          <span class="tab active"><app-icon name="wallet" /> E-Wallet</span>
          <span class="tab"><app-icon name="bank" /> Bank Payment</span>
        </div>
        <div class="unavailable-box">
          <span class="icon-circle"><app-icon name="lock" /></span>
          <h3>Pay from your order</h3>
          <p>When the shop enables KHQR, open your order details or chat checkout to scan its order-specific QR. A new payment is confirmed only after verification with Bakong.</p>
        </div>
        <p class="availability-note"><app-icon name="shield" /> An order is marked paid only after confirmation from the payment service.</p>
      </section>
    </div>
`,
})
export class PaymentsPage extends PageState {
  api = inject(PaymentsApi);
  orders = inject(OrdersApi);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);
  transactions = signal<Transaction[]>([]);
  selectedTransaction = signal<Transaction | null>(null);
  transactionTone(transaction: Transaction) {
    const status = String(transaction.status).toUpperCase();
    if (['SUCCESS','COMPLETED','PAID','APPROVED'].includes(status)) return 'paid';
    if (['PENDING','PROCESSING'].includes(status)) return 'pending';
    if (['FAILED','CANCELLED','CANCELED','REJECTED','EXPIRED'].includes(status)) return 'failed';
    return '';
  }
  private updateTransactions(rows: Transaction[]) {
    this.transactions.set(rows);
    const selected = this.selectedTransaction();
    if (selected) this.selectedTransaction.set(rows.find(row => row.id === selected.id) || null);
  }
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
          this.updateTransactions(result.transactions);
          this.creationUncertain.set(false);
        },
      );
    } else {
      this.run(this.api.list(), (t) => this.updateTransactions(t));
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
