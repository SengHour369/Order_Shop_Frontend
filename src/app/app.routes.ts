import { customerAssistantGuard } from "./core/auth/customer-assistant.guard";
import { adminGuard } from "./core/auth/admin.guard";
import { Routes } from "@angular/router";
import { authGuard } from "./core/auth/auth.guard";
import { staffGuard } from "./core/auth/staff.guard";
export const routes: Routes = [
  {
    path: "",
    title: "E-Shop · Shop More, Live Better",
    loadComponent: () =>
      import("./features/home/home.page").then((m) => m.HomePage),
  },
  {
    path: "auth",
    title: "Sign In · E-Shop",
    loadComponent: () =>
      import("./features/account/account.page").then((m) => m.AccountPage),
  },
  {
    path: "categories",
    title: "Categories · E-Shop",
    loadComponent: () =>
      import("./features/catalog/categories.page").then(
        (m) => m.CategoriesPage,
      ),
  },
  {
    path: "shop",
    title: "Products · E-Shop",
    loadComponent: () =>
      import("./features/catalog/catalog.page").then((m) => m.CatalogPage),
  },
  {
    path: "shop/:id",
    canActivate: [authGuard],
    title: "Product Details · E-Shop",
    loadComponent: () =>
      import("./features/catalog/product.page").then((m) => m.ProductPage),
  },
  {
    path: "cart",
    canActivate: [authGuard],
    title: "My Cart · E-Shop",
    loadComponent: () =>
      import("./features/cart/cart.page").then((m) => m.CartPage),
  },
  {
    path: "checkout",
    canActivate: [authGuard],
    title: "Checkout · E-Shop",
    loadComponent: () =>
      import("./features/checkout/checkout.page").then((m) => m.CheckoutPage),
  },
  {
    path: "account",
    loadComponent: () =>
      import("./layouts/account-layout").then((m) => m.AccountLayout),
    children: [
      {
        path: "",
        title: "Dashboard · E-Shop",
        loadComponent: () =>
          import("./features/account/dashboard.page").then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: "orders",
        title: "My Orders · E-Shop",
        loadComponent: () =>
          import("./features/orders/orders.page").then((m) => m.OrdersPage),
      },
      {
        path: "orders/:id",
        canActivate: [authGuard],
        title: "Order Details · E-Shop",
        loadComponent: () =>
          import("./features/orders/order.page").then((m) => m.OrderPage),
      },
      {
        path: "addresses",
        title: "My Address · E-Shop",
        loadComponent: () =>
          import("./features/addresses/addresses.page").then(
            (m) => m.AddressesPage,
          ),
      },
      {
        path: "payments",
        title: "Payment Methods · E-Shop",
        loadComponent: () =>
          import("./features/payments/payments.page").then(
            (m) => m.PaymentsPage,
          ),
      },
      {
        path: "wishlist",
        title: "My Wishlist · E-Shop",
        loadComponent: () =>
          import("./features/wishlist/wishlist.page").then(
            (m) => m.WishlistPage,
          ),
      },
      {
        path: "notifications",
        title: "Notifications · E-Shop",
        loadComponent: () =>
          import("./features/notifications/notifications.page").then(
            (m) => m.NotificationsPage,
          ),
      },
      {
        path: "notification-settings",
        title: "Notification Settings · E-Shop",
        loadComponent: () =>
          import("./features/notifications/notification-settings.page").then(
            (m) => m.NotificationSettingsPage,
          ),
      },
      {
        path: "settings",
        title: "Account Settings · E-Shop",
        loadComponent: () =>
          import("./features/account/settings.page").then(
            (m) => m.SettingsPage,
          ),
      },
      {
        path: "security",
        title: "Security · E-Shop",
        loadComponent: () =>
          import("./features/account/security.page").then(
            (m) => m.SecurityPage,
          ),
      },
      {
        path: "support",
        title: "Help & Support · E-Shop",
        loadComponent: () =>
          import("./features/account/support.page").then((m) => m.SupportPage),
      },
    ],
  },
  { path: "orders", pathMatch: "full", redirectTo: "account/orders" },
  { path: "orders/:id", redirectTo: "account/orders/:id" },
  { path: "addresses", redirectTo: "account/addresses" },
  { path: "payments", redirectTo: "account/payments" },
  { path: "notifications", redirectTo: "account/notifications" },
  {
    path: "assistant",
    canActivate: [authGuard, customerAssistantGuard],
    title: "Assistant · E-Shop",
    loadComponent: () =>
      import("./features/assistant/assistant.page").then(
        (m) => m.AssistantPage,
      ),
  },
  {
    path: "scanner",
    canActivate: [authGuard],
    title: "Product Scanner · E-Shop",
    loadComponent: () =>
      import("./features/scanner/scanner.page").then((m) => m.ScannerPage),
  },
  { path: "admin/login", redirectTo: "/auth" },
  {
    path: "admin",
    canActivate: [authGuard, staffGuard],
    loadComponent: () =>
      import("./features/admin/admin-layout").then((m) => m.AdminLayout),
    children: [
      {
        path: "assistant",
        canActivate: [adminGuard],
        title: "AI Assistant · ShopAdmin",
        loadComponent: () => import("./features/admin/admin-assistant.page").then(m => m.AdminAssistantPage),
      },
      {
        path: "",
        title: "Dashboard · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/dashboard.page").then(
            (m) => m.AdminDashboardPage,
          ),
      },
      {
        path: "orders",
        title: "Orders · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/orders.page").then((m) => m.OrdersPage),
      },
      {
        path: "orders/:id",
        title: "Order · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/orders.page").then((m) => m.OrderDetailPage),
      },
      {
        path: "cancellations",
        title: "Cancellations · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/cancellations.page").then(
            (m) => m.CancellationsPage,
          ),
      },
      {
        path: "returns",
        title: "Returns · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/returns.page").then((m) => m.ReturnsPage),
      },
      {
        path: "returns/:id",
        title: "Return · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/returns.page").then(
            (m) => m.ReturnDetailPage,
          ),
      },
      {
        path: "payments",
        title: "Payments · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments.page").then((m) => m.PaymentsPage),
      },
      {
        path: "payments/bakong-callback/:id",
        title: "Bakong · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/bakong.page").then((m) => m.BakongPage),
      },
      {
        path: "payments/:id",
        title: "Payment · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments.page").then(
            (m) => m.PaymentDetailPage,
          ),
      },
      {
        path: "refunds",
        title: "Refunds · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/refunds.page").then((m) => m.RefundsPage),
      },
      {
        path: "refunds/:id",
        title: "Refund · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/refunds.page").then(
            (m) => m.RefundDetailPage,
          ),
      },
      {
        path: "transactions",
        title: "Transactions · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/transactions.page").then(
            (m) => m.TransactionsPage,
          ),
      },
      {
        path: "transactions/:id",
        title: "Transaction · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/transactions.page").then(
            (m) => m.TransactionDetailPage,
          ),
      },
      {
        path: "bakong",
        title: "Bakong · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/bakong.page").then((m) => m.BakongPage),
      },
      {
        path: "customers",
        title: "Customers · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/customers.page").then(
            (m) => m.CustomersPage,
          ),
      },
      {
        path: "customers/add",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/customer-form.page").then(
            (m) => m.CustomerFormPage,
          ),
      },
      {
        path: "customers/:id",
        title: "Customer · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/customers.page").then(
            (m) => m.CustomerDetailPage,
          ),
      },
      {
        path: "customer-groups",
        title: "Customer Groups · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/groups.page").then((m) => m.GroupsPage),
      },
      {
        path: "customer-groups/add",
        title: "Add Customer Group · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/groups.page").then((m) => m.GroupsPage),
      },
      {
        path: "customer-groups/edit/:id",
        title: "Edit Customer Group · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/groups.page").then((m) => m.GroupsPage),
      },
      {
        path: "products",
        title: "Products · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products.page").then((m) => m.ProductsPage),
      },
      {
        path: "products/add",
        title: "Add Product · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products.page").then(
            (m) => m.ProductFormPage,
          ),
      },
      {
        path: "products/view/:id",
        title: "Product · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products.page").then(
            (m) => m.ProductDetailPage,
          ),
      },
      {
        path: "products/edit/:id",
        title: "Edit Product · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products.page").then(
            (m) => m.ProductFormPage,
          ),
      },
      {
        path: "categories",
        title: "Categories · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/categories.page").then(
            (m) => m.CategoriesPage,
          ),
      },
      {
        path: "categories/add",
        title: "Add Category · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/categories.page").then(
            (m) => m.CategoriesPage,
          ),
      },
      {
        path: "categories/edit/:id",
        title: "Edit Category · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/categories.page").then(
            (m) => m.CategoriesPage,
          ),
      },
      {
        path: "categories/view/:id",
        title: "Category · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/categories.page").then(
            (m) => m.CategoriesPage,
          ),
      },
      {
        path: "brands",
        title: "Brands · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/brands.page").then((m) => m.BrandsPage),
      },
      {
        path: "brands/add",
        title: "Add Brand · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/brands.page").then((m) => m.BrandsPage),
      },
      {
        path: "brands/edit/:id",
        title: "Edit Brand · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/brands.page").then((m) => m.BrandsPage),
      },
      {
        path: "brands/view/:id",
        title: "Brand · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/brands.page").then((m) => m.BrandsPage),
      },
      {
        path: "inventory",
        title: "Inventory · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/inventory-reference.page").then(
            (m) => m.InventoryReferencePage,
          ),
      },
      ...["stock-in", "stock-out", "adjustments"].map((path) => ({
        path: `inventory/${path}`,
        loadComponent: () =>
          import("./features/admin/inventory-reference.page").then(
            (m) => m.InventoryReferencePage,
          ),
      })),
      {
        path: "inventory/warehouses",
        loadComponent: () =>
          import("./features/admin/warehouses.page").then(
            (m) => m.WarehousesPage,
          ),
      },
      {
        path: "inventory/add",
        title: "Add Inventory · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/inventory.page").then(
            (m) => m.InventoryPage,
          ),
      },
      {
        path: "inventory/edit",
        title: "Edit Inventory · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/inventory.page").then(
            (m) => m.InventoryPage,
          ),
      },
      {
        path: "inventory/details",
        title: "Inventory Details · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/inventory.page").then(
            (m) => m.InventoryPage,
          ),
      },
      {
        path: "sales-report",
        title: "Sales Report · ShopAdmin",
        data: { report: "sales" },
        loadComponent: () =>
          import("./features/admin/reports.page").then((m) => m.ReportsPage),
      },
      {
        path: "payment-report",
        title: "Payment Report · ShopAdmin",
        data: { report: "payment" },
        loadComponent: () =>
          import("./features/admin/reports.page").then((m) => m.ReportsPage),
      },
      {
        path: "tax-report",
        title: "Tax Report · ShopAdmin",
        data: { report: "tax" },
        loadComponent: () =>
          import("./features/admin/reports.page").then((m) => m.ReportsPage),
      },
      {
        path: "settings",
        title: "Settings · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/settings.page").then(
            (m) => m.AdminSettingsPage,
          ),
      },
      {
        path: "promotions/add",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/promotions.page").then(
            (m) => m.PromotionsPage,
          ),
      },
      {
        path: "promotions/:id",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/promotions.page").then(
            (m) => m.PromotionsPage,
          ),
      },
      {
        path: "promotions",
        canActivate: [adminGuard],
        title: "Promotions · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/promotions.page").then(
            (m) => m.PromotionsPage,
          ),
      },
      {
        path: "activity",
        canActivate: [adminGuard],
        title: "Service Activity · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/operations.page").then(
            (m) => m.OperationsPage,
          ),
      },
      {
        path: "groups",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/access-groups.page").then(
            (m) => m.AccessGroupsPage,
          ),
      },
      {
        path: "groups/add",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/access-groups.page").then(
            (m) => m.AccessGroupsPage,
          ),
      },
      {
        path: "users",
        canActivate: [adminGuard],
        title: "Users · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/users.page").then((m) => m.UsersPage),
      },
    ],
  },
  {
    path: "**",
    loadComponent: () => import("./shared/not-found").then((m) => m.NotFound),
  },
];
