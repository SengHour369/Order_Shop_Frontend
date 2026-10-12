import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Icon } from "../../shared/components/icon";
@Component({
  imports: [TranslatePipe, RouterLink, Icon, FormsModule],
  template: `<div class="page-heading">
      <div>
        <h1>{{ "Help & Support" | translate }}</h1>
        <p>We’re here to help you.</p>
      </div>
    </div>
    <section class="support-search">
      <h2>How can we help you?</h2>
      <div class="inline-search">
        <app-icon name="search" /><input
          aria-label="Search frequently asked questions"
          [(ngModel)]="search"
          placeholder="Search for help (e.g. order, payment, return...)"
        />
      </div>
    </section>
    <h2>Popular Topics</h2>
    <nav class="support-topics" aria-label="Help topics">
      @for (t of topics; track t.label) {
        <a [routerLink]="t.path"
          ><span class="icon-circle"><app-icon [name]="t.icon" /></span>
          <h3>{{ t.label }}</h3>
          <p>{{ t.description }}</p></a
        >
      }
    </nav>
    <section class="panel faq">
      <h2>{{ "Frequently Asked Questions" | translate }}</h2>
      @for (q of filtered(); track q.question) {
        <details>
          <summary>{{ q.question }}</summary>
          <p>{{ q.answer }}</p>
        </details>
      } @empty {
        <p>No answers found. Try “order”, “payment”, or “account”.</p>
      }
    </section>
    <div class="support-search">
      <h2>Still need a hand?</h2>
      <p>Ask the shopping assistant for help with products and your orders.</p>
      <a class="button primary" routerLink="/assistant"
        ><app-icon name="headphones" />Ask the Assistant</a
      >
    </div>`,
})
export class SupportPage {
  search = "";
  topics = [
    {
      label: "Track My Order",
      description: "Check your latest order status",
      path: "/account/orders",
      icon: "box",
    },
    {
      label: "Payment Information",
      description: "View confirmed payment records",
      path: "/account/payments",
      icon: "card",
    },
    {
      label: "Shipping Addresses",
      description: "Manage your delivery addresses",
      path: "/account/addresses",
      icon: "truck",
    },
    {
      label: "Product Information",
      description: "Explore products and options",
      path: "/shop",
      icon: "bag",
    },
    {
      label: "Account & Security",
      description: "Manage your account access",
      path: "/account/security",
      icon: "shield",
    },
    {
      label: "Shopping Assistant",
      description: "Get help finding your favorites",
      path: "/assistant",
      icon: "headphones",
    },
  ];
  questions = [
    {
      question: "How can I track my order?",
      answer:
        "Open My Orders, choose an order, then View Order Details. The latest status comes from the shop. Courier maps and delivery estimates are not available yet.",
    },
    {
      question: "Can I cancel my order?",
      answer:
        "Open a pending order and choose Cancel Order. The shop checks whether cancellation is still available.",
    },
    {
      question: "How do payments work?",
      answer:
        "Payment is a separate step after your order is placed. Your payment page shows confirmed records. Online payment initiation is not available yet.",
    },
    {
      question: "What if checkout is still pending?",
      answer:
        "Return to Checkout and retry. We recover the same checkout so a delayed response does not create a duplicate order.",
    },
    {
      question: "How do I change my shipping address?",
      answer:
        "Open My Addresses to add or edit a saved address. Choose your delivery address during checkout.",
    },
    {
      question: "Where are my saved products?",
      answer:
        "Your wishlist is saved in this browser. Use the same browser and account to find your saved products again.",
    },
    {
      question: "How do I request a return or refund?",
      answer:
        "Self-service returns are not available yet. Keep your order number when contacting the shop through its existing support channel.",
    },
  ];
  filtered() {
    const query = this.search.trim().toLowerCase();
    return this.questions.filter((q) =>
      (q.question + " " + q.answer).toLowerCase().includes(query),
    );
  }
}
