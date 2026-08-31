import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required for the seeded E2E flow.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test("owner completes the core commerce dashboard flow", async ({ page }) => {
  await signIn(page);
  const suffix = Date.now().toString();
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  await page.getByLabel("Name").fill(`E2E Customer ${suffix}`);
  await page.getByLabel("Email").fill(`e2e-${suffix}@example.test`);
  await page.getByRole("button", { name: "Add customer" }).click();
  await expect(page.getByText(`E2E Customer ${suffix}`)).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await page.getByLabel("Name").fill(`E2E Coffee ${suffix}`);
  await page.getByLabel("Slug").fill(`e2e-coffee-${suffix}`);
  await page.getByLabel("SKU").fill(`E2E-${suffix}`);
  await page.getByLabel("Price in minor units").fill("499900");
  await page.getByRole("button", { name: "Add draft product" }).click();
  const productRow = page.getByRole("row").filter({ hasText: `E2E Coffee ${suffix}` });
  await expect(productRow).toContainText("draft");
  await productRow.getByRole("link").click();
  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText("active", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Inventory", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  await page
    .getByLabel("Variant")
    .selectOption({ label: `E2E Coffee ${suffix} · Standard (E2E-${suffix})` });
  await page.getByLabel("Delta").fill("12");
  await page.getByLabel("Reason").fill("E2E opening stock");
  await page.getByRole("button", { name: "Record adjustment" }).click();
  await expect(page.getByRole("row").filter({ hasText: `E2E-${suffix}` })).toContainText("12");
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await page.getByLabel("Customer").selectOption({ label: `E2E Customer ${suffix}` });
  await page
    .getByLabel("Item")
    .selectOption({ label: `E2E Coffee ${suffix} · Standard · NGN 4,999.00` });
  await page.getByRole("button", { name: "Create unpaid order" }).click();
  const newest = page.getByRole("table", { name: "Orders" }).getByRole("row").nth(1);
  await expect(newest).toContainText("unpaid");
  await expect(newest).toContainText("unfulfilled");
  const orderNumber = await newest.getByRole("cell").first().innerText();
  const createdRow = page.getByRole("row").filter({ hasText: orderNumber });
  await createdRow.getByRole("button", { name: "Cancel" }).click();
  await expect(createdRow).toContainText("cancelled");
  await expect(page.getByRole("button", { name: /^(mark paid|fulfil)$/i })).toHaveCount(0);
});

test("HTTP API enforces request IDs and order idempotency", async ({ page }) => {
  await signIn(page);
  const key = `e2e-api-order-${Date.now()}`;
  const input = {
    merchant_id: "0198f000-0000-7000-8000-000000000002",
    location_id: "0198f000-0000-7000-8000-000000000010",
    customer_id: "0198f000-0000-7000-8000-000000001000",
    currency: "NGN",
    items: [{ variant_id: "0198f000-0000-7000-8000-000000001200", quantity: 1 }],
  };
  const result = await page.evaluate(
    async ({ key, input }) => {
      const send = (body: unknown) =>
        fetch("/v1/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": key },
          body: JSON.stringify(body),
        });
      const first = await send(input);
      const firstBody = (await first.json()) as { order: { id: string } };
      const replay = await send(input);
      const replayBody = (await replay.json()) as { order: { id: string } };
      const conflict = await send({ ...input, items: [{ ...input.items[0], quantity: 2 }] });
      const conflictBody = (await conflict.json()) as { error: { code: string } };
      return {
        firstStatus: first.status,
        firstRequestId: first.headers.get("x-request-id"),
        firstBody,
        replayStatus: replay.status,
        replayBody,
        conflictStatus: conflict.status,
        conflictBody,
      };
    },
    { key, input },
  );
  expect(result.firstStatus, JSON.stringify(result.firstBody)).toBe(201);
  expect(result.firstRequestId).toMatch(/^req_/);
  expect(result.replayStatus).toBe(201);
  expect(result.replayBody.order.id).toBe(result.firstBody.order.id);
  expect(result.conflictStatus).toBe(409);
  expect(result.conflictBody.error.code).toBe("idempotency_key_reused");
});

test("owner executes the deterministic payment golden path", async ({ page }) => {
  await signIn(page);
  const suffix = Date.now().toString();
  const result = await page.evaluate(async (suffix) => {
    const json = { "Content-Type": "application/json" };
    const orderResponse = await fetch("/v1/orders", {
      method: "POST",
      headers: { ...json, "Idempotency-Key": `e2e-payment-order-${suffix}` },
      body: JSON.stringify({
        merchant_id: "0198f000-0000-7000-8000-000000000002",
        location_id: "0198f000-0000-7000-8000-000000000010",
        customer_id: "0198f000-0000-7000-8000-000000001000",
        currency: "NGN",
        items: [{ variant_id: "0198f000-0000-7000-8000-000000001200", quantity: 1 }],
      }),
    });
    const orderBody = (await orderResponse.json()) as {
      order: { id: string; total_amount: string };
    };
    const key = `e2e-payment-${suffix}`;
    const paymentInput = {
      order_id: orderBody.order.id,
      confirmation: { mock_scenario: "success" },
    };
    const paymentResponse = await fetch("/v1/payments", {
      method: "POST",
      headers: { ...json, "Idempotency-Key": key },
      body: JSON.stringify(paymentInput),
    });
    const paymentBody = (await paymentResponse.json()) as {
      payment: {
        id: string;
        status: string;
        amount: string;
        transactions: unknown[];
        attempts: unknown[];
      };
    };
    const replayResponse = await fetch("/v1/payments", {
      method: "POST",
      headers: { ...json, "Idempotency-Key": key },
      body: JSON.stringify(paymentInput),
    });
    const replayBody = (await replayResponse.json()) as { payment: { id: string } };
    const refundResponse = await fetch("/v1/refunds", {
      method: "POST",
      headers: { ...json, "Idempotency-Key": `e2e-refund-${suffix}` },
      body: JSON.stringify({
        payment_id: paymentBody.payment.id,
        amount: "1",
        reason: "e2e_partial",
        confirmation: { mock_scenario: "refund_success" },
      }),
    });
    const refundBody = (await refundResponse.json()) as {
      refund: { id: string; status: string; amount: string };
    };
    return {
      orderStatus: orderResponse.status,
      paymentStatus: paymentResponse.status,
      payment: paymentBody.payment,
      replayStatus: replayResponse.status,
      replayId: replayBody.payment.id,
      refundStatus: refundResponse.status,
      refund: refundBody.refund,
    };
  }, suffix);
  expect(result.orderStatus).toBe(201);
  expect(result.paymentStatus).toBe(201);
  expect(result.payment.status).toBe("succeeded");
  expect(result.payment.transactions).toHaveLength(1);
  expect(result.payment.attempts).toHaveLength(1);
  expect(result.replayStatus).toBe(201);
  expect(result.replayId).toBe(result.payment.id);
  expect(result.refundStatus).toBe(201);
  expect(result.refund).toMatchObject({ status: "succeeded", amount: "1" });
  await page.goto(`/payments/${result.payment.id}`);
  await expect(page.getByRole("heading", { name: /Payment/ })).toBeVisible();
  await expect(page.getByRole("table", { name: "Payment attempts" })).toContainText("succeeded");
  await expect(page.getByRole("table", { name: "Transactions" })).toContainText("charge");
});

test("customer completes the public Payment Link and Hosted Checkout flow", async ({ page }) => {
  const seededToken = Buffer.alloc(32, 21).toString("base64url");
  await page.goto(`/pay/${seededToken}`);
  await expect(page.getByRole("heading", { name: "Acme tasting event" })).toBeVisible();
  await expect(page.getByText("NGN 2,500.00")).toBeVisible();
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout\/[A-Za-z0-9_-]{43}$/);
  await expect(page.getByRole("heading", { name: "Complete your payment" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Full name").fill("Hosted Checkout Buyer");
  await page.getByLabel("Email").fill(`hosted-${Date.now()}@example.test`);
  const [confirmation] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/v1/public/checkout/") && response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Pay securely" }).click(),
  ]);
  expect(confirmation.status(), await confirmation.text()).toBe(200);
  await expect(page.getByRole("heading", { name: "Payment completed" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Your payment was successful.")).toBeVisible();
});
