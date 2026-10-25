import { workflowUnsavedGuard } from './features/admin/ai-automation/workflows.guard';
import { storefrontGuard } from "./core/storefront/storefront-access.service";
import { permissionGuard } from "./core/auth/permission.service";
import { customerAssistantGuard } from "./core/auth/customer-assistant.guard";
import { adminGuard } from "./core/auth/admin.guard";
import { Routes } from "@angular/router";
import { authGuard } from "./core/auth/auth.guard";
import { staffGuard } from "./core/auth/staff.guard";
export const routes: Routes = [
  {path:"checkout/payment/:id",canActivate:[authGuard],title:"Payment · E-Shop",loadComponent:()=>import("./features/payments/checkout-payment.page").then(m=>m.CheckoutPaymentPage)},
  {path: "guest/orders", title: "Guest orders · E-Shop", canActivate: [storefrontGuard("guestOrderTracking")], loadComponent: () => import("./features/guest/guest-orders.page").then(m => m.GuestOrdersPage)},
  {path: "guest/orders/:id", title: "Guest order · E-Shop", loadComponent: () => import("./features/guest/guest-orders.page").then(m => m.GuestOrdersPage)},
  {
    path: "auth/keycloak/callback",
    title: "Keycloak Sign In · E-Shop",
    loadComponent: () => import("./features/account/keycloak-callback.page").then(m => m.KeycloakCallbackPage),
  },
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
    canActivate: [storefrontGuard("guestBrowsing")],
    title: "Products · E-Shop",
    loadComponent: () =>
      import("./features/catalog/catalog.page").then((m) => m.CatalogPage),
  },
  {
    path: "shop/:id",
    canActivate: [storefrontGuard("guestBrowsing")],
    title: "Product Details · E-Shop",
    loadComponent: () =>
      import("./features/catalog/product.page").then((m) => m.ProductPage),
  },
  {
    path: "cart",
    canActivate: [storefrontGuard("guestCart")],
    title: "My Cart · E-Shop",
    loadComponent: () =>
      import("./features/cart/cart.page").then((m) => m.CartPage),
  },
  {
    path: "checkout",
    canActivate: [storefrontGuard("guestCheckout")],
    title: "Checkout · E-Shop",
    loadComponent: () =>
      import("./features/guest/checkout-entry").then((m) => m.CheckoutEntry),
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
        path: "returns", canActivate: [authGuard], title: "My Returns · E-Shop",
        loadComponent: () => import("./features/orders/returns/returns.page").then(m => m.CustomerReturnsPage),
      },
      {
        path: "returns/:id", canActivate: [authGuard], title: "Return Detail · E-Shop",
        loadComponent: () => import("./features/orders/returns/return-detail.page").then(m => m.CustomerReturnDetailPage),
      },
      {
        path: "orders/:id/track",
        canActivate: [authGuard],
        title: "Track Order · E-Shop",
        loadComponent: () => import("./features/orders/tracking/tracking.page").then(m => m.TrackingPage),
      },
      {
        path: "orders/:id",
        canActivate: [authGuard],
        title: "Order Details · E-Shop",
        loadComponent: () =>
          import("./features/orders/order.page").then((m) => m.OrderPage),
      },
      {
        path: "addresses/add",
        canActivate: [authGuard],
        title: "Add Address · E-Shop",
        loadComponent: () => import("./features/addresses/address-form.page").then(m => m.AddressFormPage),
      },
      {
        path: "addresses/:id/edit",
        canActivate: [authGuard],
        title: "Edit Address · E-Shop",
        loadComponent: () => import("./features/addresses/address-form.page").then(m => m.AddressFormPage),
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
      import("./features/assistant/customer-chat/shopping-assistant.page").then(
        (m) => m.ShoppingAssistantPage,
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
    canActivateChild: [permissionGuard],
    loadComponent: () =>
      import("./features/admin/layout/admin-layout").then((m) => m.AdminLayout),
    children: [
      {path: "access-denied", loadComponent: () => import("./features/admin/settings/access-denied.page").then(m => m.AccessDeniedPage)},
      {path:'branches',title:'Branches · ShopAdmin',loadComponent:()=>import('./features/admin/imports/branches.page').then(m=>m.BranchesPage)},
      {path:'review-authorization',data:{mine:false},title:'Review Authorization · ShopAdmin',loadComponent:()=>import('./features/admin/imports/approval-requests.page').then(m=>m.ApprovalRequestsPage)},
      {path:'my-requests',data:{mine:true},title:'My Requests · ShopAdmin',loadComponent:()=>import('./features/admin/imports/approval-requests.page').then(m=>m.ApprovalRequestsPage)},
      ...([
        ['import-executions', 'executions'],
      ] as const).map(([path, importMode]) => ({path, data:{importMode}, title:'Request Executions · ShopAdmin', loadComponent:()=>import('./features/admin/imports/ai-imports.page').then(m=>m.AiImportsPage)})),
      { path: "ai-automation", canActivate: [adminGuard], canDeactivate: [workflowUnsavedGuard], title: "AI Automation · E-Shop", loadComponent: () => import("./features/admin/ai-automation/workflows.page").then(m => m.WorkflowsPage) },
      {
        path: "automation", canActivate: [adminGuard], title: "Payment Automation · E-Shop", loadComponent: () => import("./features/admin/automation/automation.page").then(m => m.AutomationPage),
      },
      {
        path: "assistant",
        canActivate: [adminGuard],
        title: "AI Assistant · ShopAdmin",
        loadComponent: () => import("./features/admin/assistant/admin-assistant.page").then(m => m.AdminAssistantPage),
      },
      {
        path: "",
        title: "Dashboard · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/dashboard/dashboard.page").then(
            (m) => m.AdminDashboardPage,
          ),
      },
      {
        path: "orders",
        title: "Orders · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/orders/orders.page").then((m) => m.OrdersPage),
      },
      {
        path: "orders/:id",
        title: "Order · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/orders/orders.page").then((m) => m.OrderDetailPage),
      },
      {
        path: "cancellations",
        title: "Cancellations · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/orders/cancellations.page").then(
            (m) => m.CancellationsPage,
          ),
      },
      {
        path: "returns",
        title: "Returns · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/orders/returns.page").then((m) => m.ReturnsPage),
      },
      {
        path: "returns/:id",
        title: "Return · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/orders/returns.page").then(
            (m) => m.ReturnDetailPage,
          ),
      },
      {
        path: "payments",
        title: "Payments · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments/payments.page").then((m) => m.PaymentsPage),
      },
      {
        path: "payments/bakong-callback/:id",
        title: "Bakong · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments/bakong.page").then((m) => m.BakongPage),
      },
      {
        path: "payments/:id",
        title: "Payment · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments/payments.page").then(
            (m) => m.PaymentDetailPage,
          ),
      },
      {
        path: "refunds",
        title: "Refunds · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments/refunds.page").then((m) => m.RefundsPage),
      },
      {
        path: "refunds/:id",
        title: "Refund · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments/refunds.page").then(
            (m) => m.RefundDetailPage,
          ),
      },
      {
        path: "transactions",
        title: "Transactions · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments/transactions.page").then(
            (m) => m.TransactionsPage,
          ),
      },
      {
        path: "transactions/:id",
        title: "Transaction · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments/transactions.page").then(
            (m) => m.TransactionDetailPage,
          ),
      },
      {
        path: "bakong",
        title: "Bakong · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/payments/bakong.page").then((m) => m.BakongPage),
      },
      {
        path: "customers",
        title: "Customers · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/customers/customers.page").then(
            (m) => m.CustomersPage,
          ),
      },
      {
        path: "customers/add",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/customers/customer-form.page").then(
            (m) => m.CustomerFormPage,
          ),
      },
      {
        path: "customers/:id",
        title: "Customer Details · ShopAdmin",
        data: { customerDetail: true },
        loadComponent: () =>
          import("./features/admin/settings/user-detail.page").then(
            (m) => m.UserDetailPage,
          ),
      },
      {
        path: "customer-groups",
        title: "Customer Groups · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/customers/groups.page").then((m) => m.GroupsPage),
      },
      {
        path: "customer-groups/add",
        canActivate: [adminGuard],
        title: "Add Customer Group · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/customers/customer-group.page").then((m) => m.CustomerGroupPage),
      },
      {
        path: "customer-groups/edit/:id",
        canActivate: [adminGuard],
        title: "Edit Customer Group · ShopAdmin",
        loadComponent: () => import("./features/admin/customers/customer-group.page").then(m => m.CustomerGroupPage),
      },
      {
        path: "customer-groups/:id",
        title: "Group Details · ShopAdmin",
        loadComponent: () => import("./features/admin/customers/customer-group.page").then(m => m.CustomerGroupPage),
      },
      {
        path: "products",
        title: "Products · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/products.page").then((m) => m.ProductsPage),
      },
      {
        path: "products/add",
        title: "Add Product · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/products.page").then(
            (m) => m.ProductFormPage,
          ),
      },
      {
        path: "products/view/:id",
        title: "Product · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/products.page").then(
            (m) => m.ProductDetailPage,
          ),
      },
      {
        path: "products/edit/:id",
        title: "Edit Product · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/products.page").then(
            (m) => m.ProductFormPage,
          ),
      },
      {
        path: "categories",
        title: "Categories · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/categories.page").then(
            (m) => m.CategoriesPage,
          ),
      },
      {
        path: "categories/add",
        title: "Add Category · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/categories.page").then(
            (m) => m.CategoriesPage,
          ),
      },
      {
        path: "categories/edit/:id",
        title: "Edit Category · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/categories.page").then(
            (m) => m.CategoriesPage,
          ),
      },
      {
        path: "categories/view/:id",
        title: "Category · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/categories.page").then(
            (m) => m.CategoriesPage,
          ),
      },
      {
        path: "brands",
        title: "Brands · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/brands.page").then((m) => m.BrandsPage),
      },
      {
        path: "brands/add",
        title: "Add Brand · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/brands.page").then((m) => m.BrandsPage),
      },
      {
        path: "brands/edit/:id",
        title: "Edit Brand · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/brands.page").then((m) => m.BrandsPage),
      },
      {
        path: "brands/view/:id",
        title: "Brand · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/products/brands.page").then((m) => m.BrandsPage),
      },
      {
        path: "inventory",
        title: "Inventory · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/inventory/inventory-reference.page").then(
            (m) => m.InventoryReferencePage,
          ),
      },
      ...["stock-in", "stock-out", "adjustments"].map((path) => ({
        path: `inventory/${path}`,
        loadComponent: () =>
          import("./features/admin/inventory/inventory-reference.page").then(
            (m) => m.InventoryReferencePage,
          ),
      })),
      {
        path: "inventory/warehouses",
        loadComponent: () =>
          import("./features/admin/inventory/warehouses.page").then(
            (m) => m.WarehousesPage,
          ),
      },
      {
        path: "inventory/add",
        title: "Add Inventory · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/inventory/inventory.page").then(
            (m) => m.InventoryPage,
          ),
      },
      {
        path: "inventory/edit",
        title: "Edit Inventory · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/inventory/inventory.page").then(
            (m) => m.InventoryPage,
          ),
      },
      {
        path: "inventory/details",
        title: "Inventory Details · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/inventory/inventory.page").then(
            (m) => m.InventoryPage,
          ),
      },
      {
        path: "sales-report",
        title: "Sales Report · ShopAdmin",
        data: { report: "sales" },
        loadComponent: () =>
          import("./features/admin/reports/sales-report.page").then((m) => m.SalesReportPage),
      },
      {
        path: "payment-report",
        title: "Payment Report · ShopAdmin",
        data: { report: "payment" },
        loadComponent: () =>
          import("./features/admin/reports/payment-report.page").then((m) => m.PaymentReportPage),
      },
      {
        path: "tax-report",
        title: "Tax Report · ShopAdmin",
        data: { report: "tax" },
        loadComponent: () =>
          import("./features/admin/reports/reports.page").then((m) => m.ReportsPage),
      },
      {path: "live-tests", title: "Live Tests · ShopAdmin", loadComponent: () => import("./features/admin/live-tests/live-tests.page").then(m => m.LiveTestsPage)},
      {path: "storefront-access", title: "Storefront Access · ShopAdmin", loadComponent: () => import("./features/admin/settings/storefront-access-settings").then(m => m.StorefrontAccessSettings)},
      {path: "guest-activity", title: "Guest Activity · ShopAdmin", data: {guestActivity:true}, loadComponent: () => import("./features/admin/settings/operations.page").then(m => m.OperationsPage)},
      {path: "guest-reviews", title: "Review Moderation · ShopAdmin", loadComponent: () => import("./features/admin/settings/guest-review-moderation.page").then(m => m.GuestReviewModerationPage)},
      {
        path: "settings",
        title: "Settings · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/settings/settings.page").then(
            (m) => m.AdminSettingsPage,
          ),
      },
      {
        path: "promotions/add",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/promotions/promotions.page").then(
            (m) => m.PromotionsPage,
          ),
      },
      {
        path: "promotions/:id",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/promotions/promotions.page").then(
            (m) => m.PromotionsPage,
          ),
      },
      {
        path: "promotions",
        canActivate: [adminGuard],
        title: "Promotions · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/promotions/promotions.page").then(
            (m) => m.PromotionsPage,
          ),
      },
      {
        path: "activity",
        canActivate: [adminGuard],
        title: "Service Activity · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/settings/operations.page").then(
            (m) => m.OperationsPage,
          ),
      },
      {
        path: "notifications/:id",
        canActivate: [adminGuard],
        title: "Notification Details · ShopAdmin",
        loadComponent: () => import("./features/notifications/notification-detail.page").then(m => m.NotificationDetailPage),
      },
      {
        path: "notifications",
        canActivate: [adminGuard],
        title: "Notifications · ShopAdmin",
        loadComponent: () => import("./features/notifications/notifications.page").then(m => m.NotificationsPage),
      },
      {
        path: "groups",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/settings/access-groups.page").then(
            (m) => m.AccessGroupsPage,
          ),
      },
      {
        path: "groups/add",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/admin/customers/customer-group.page").then(
            (m) => m.CustomerGroupPage,
          ),
      },
      {
        path: "groups/edit/:id",
        canActivate: [adminGuard],
        title: "Edit Group · ShopAdmin",
        loadComponent: () => import("./features/admin/customers/customer-group.page").then(m => m.CustomerGroupPage),
      },
      {
        path: "groups/:id",
        canActivate: [adminGuard],
        title: "Group Details · ShopAdmin",
        loadComponent: () => import("./features/admin/customers/customer-group.page").then(m => m.CustomerGroupPage),
      },
      {
        path: "users/edit/:id",
        canActivate: [adminGuard],
        title: "Edit User · ShopAdmin",
        loadComponent: () => import("./features/admin/settings/user-edit.page").then(m => m.UserEditPage),
      },
      {
        path: "users/:id",
        canActivate: [adminGuard],
        title: "User Details · ShopAdmin",
        loadComponent: () => import("./features/admin/settings/user-detail.page").then(m => m.UserDetailPage),
      },
      {
        path: "users",
        canActivate: [adminGuard],
        title: "Users · ShopAdmin",
        loadComponent: () =>
          import("./features/admin/settings/users.page").then((m) => m.UsersPage),
      },
    ],
  },
  {
    path: "**",
    loadComponent: () => import("./shared/components/not-found").then((m) => m.NotFound),
  },
];
