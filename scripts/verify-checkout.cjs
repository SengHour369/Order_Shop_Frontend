// Local development only: creates isolated test records through the Angular proxy.
const fs = require("node:fs");
const crypto = require("node:crypto");
const base = "http://localhost:4200";
const report = { checkedAt: new Date().toISOString(), base, checks: [] };
const sessions = [];

async function request(route, body, session, method = "POST") {
  const response = await fetch(base + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: "Bearer " + session.access_token } : {}),
    },
    ...(method !== "GET" ? { body: JSON.stringify(body || {}) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  const result = text ? JSON.parse(text) : null;
  report.checks.push({ method, route, status: response.status });
  if (!response.ok || Number(result?.code) >= 400) {
    throw new Error(
      `${route}: ${response.status} ${result?.message || "Request failed"}`,
    );
  }
  return result;
}

async function main() {
  if (!process.argv.includes("--insert-test")) {
    throw new Error(
      "Pass --insert-test to create a disposable customer, address, cart, order and pending payment.",
    );
  }
  const seed = fs.readFileSync(
    "D:/spring boot/E-Shop/auth-service/src/main/java/com/example/eshop/auth/util/DataInitializer.java",
    "utf8",
  );
  const password = seed.match(/passwordEncoder\.encode\("([^"]+)"\)/)?.[1];
  if (!password) throw new Error("Development seed login not found.");
  const admin = await request("/api/v1/public/email/username/login", {
    CriteriaValue: "admin",
    Password: password,
  });
  if (!admin.access_token) throw new Error("Development login failed.");
  sessions.push(admin);

  const groups = await request(
    "/api/v1/groups/get/all?page=0&size=100&sort=id,asc",
    null,
    admin,
    "GET",
  );
  const userGroup = groups.data.content.find(
    (group) =>
      (group.data || group).group_code === "USR" ||
      (group.data || group).groupCode === "USR",
  );
  if (!userGroup)
    throw new Error("Customer permission group USR was not found.");
  const userGroupId = (userGroup.data || userGroup).group_id;

  const username = "api_test_" + Date.now();
  const testPassword = crypto.randomBytes(24).toString("base64url") + "Aa1!";
  const created = await request(
    "/api/v1/user/create",
    {
      username,
      password: testPassword,
      email: username + "@example.test",
      phone: String(Date.now()),
      full_name: "API Test Customer",
      role_ids: [5],
      group_ids: [userGroupId],
      permission_ids: [],
    },
    admin,
  );
  report.customer = { id: created.data.id, username };
  const customer = await request("/api/v1/public/email/username/login", {
    CriteriaValue: username,
    Password: testPassword,
  });
  if (!customer.access_token)
    throw new Error("Disposable customer login failed.");
  sessions.push(customer);
  const userId = customer.id;
  const catalog = await request(
    "/api/v1/products/get/all",
    { criteria_type: 4, is_active: true, page: 1, size: 100 },
    customer,
  );
  const sku = catalog.data.payload
    .filter((p) => p.is_active)
    .flatMap((p) => p.skus || [])
    .find((s) => s.quantity > 0 && (s.finalPrice ?? s.price) > 0);
  if (!sku) throw new Error("No stocked active SKU available for the test.");
  const address = await request(
    `/api/v1/addresses/user/${userId}`,
    {
      address_line1: "TEST ONLY - do not ship",
      city: "Phnom Penh",
      zip_code: "12000",
      country: "Cambodia",
      is_default: true,
    },
    customer,
  );
  report.addressId = address.data.id;
  await request(
    `/api/v1/cart/user/id/get-or-create?userId=${userId}`,
    {},
    customer,
  );
  const cart = await request(
    `/api/v1/cart/user/id/items?userId=${userId}`,
    { product_id: sku.id, quantity: 1 },
    customer,
  );
  report.cart = {
    id: cart.data.id,
    skuId: sku.id,
    itemCount: cart.data.total_items,
  };
  const checkout = {
    address_id: address.data.id,
    payment_method: "BAKONG",
    currency: "USD",
    checkout_key: crypto.randomUUID(),
  };
  const order = await request(
    `/api/v1/orders/user/from-cart?userId=${userId}`,
    checkout,
    customer,
  );
  report.order = {
    id: order.data.id,
    status: order.data.status,
    total: order.data.total_amount,
  };
  if (order.data.status !== "PENDING")
    throw new Error("Checkout did not reach PENDING; payment not created.");
  const retry = await request(
    `/api/v1/orders/user/from-cart?userId=${userId}`,
    checkout,
    customer,
  );
  if (retry.data.id !== order.data.id)
    throw new Error("Checkout retry created a different order.");
  report.sameOrderOnRetry = true;
  const payment = await request(
    "/api/v1/payment-transactions",
    {
      order_id: order.data.id,
      customer_id: userId,
      amount: order.data.total_amount,
      payment_method: "BAKONG",
      currency: "USD",
      remarks: "API integration test - no money transferred",
    },
    customer,
  );
  report.payment = {
    id: payment.data.id,
    status: payment.data.status,
    orderId: payment.data.order_id,
  };
  const history = await request(
    `/api/v1/payment-transactions/order/${order.data.id}`,
    null,
    customer,
    "GET",
  );
  report.paymentVisibleInHistory = history.data.some(
    (t) => t.id === payment.data.id,
  );
  if (!report.paymentVisibleInHistory || payment.data.status !== "PENDING")
    throw new Error("Pending payment history verification failed.");
  report.success = true;
}

main()
  .catch((error) => {
    report.success = false;
    report.error = error.message;
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const session of sessions) {
      try {
        await request(
          "/api/v1/public/logout",
          { refreshToken: session.refresh_token },
          session,
        );
      } catch {
        /* Evidence already retained; never print tokens. */
      }
    }
    fs.writeFileSync(
      "docs/checkout-live-test.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  });
