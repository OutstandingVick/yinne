export interface Page<T> {
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
  request_id: string;
}
export interface ListParams {
  limit?: number;
  after?: string;
  search?: string;
}
export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  external_ref: string | null;
  metadata: Record<string, unknown>;
  version: number;
  pii_redacted: boolean;
  created_at: string;
  updated_at: string;
}
export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  unit_amount: string;
  currency: string;
  track_inventory: boolean;
  status: "active" | "archived";
  version: number;
}
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  metadata: Record<string, unknown>;
  version: number;
  variants: Variant[];
  created_at: string;
  updated_at: string;
}
export interface InventoryLevel {
  id: string;
  variant_id: string;
  location_id: string;
  on_hand: string;
  sku?: string;
  variant_title?: string;
  product_name?: string;
  location_name?: string;
  version: number;
}
export interface OrderItem {
  id: string;
  variant_id: string | null;
  product_name: string;
  variant_title: string;
  sku: string;
  unit_amount: string;
  currency: string;
  quantity: number;
  total_amount: string;
}
export interface Order {
  id: string;
  number: string;
  merchant_id: string;
  location_id: string;
  customer_id: string | null;
  financial_status: "unpaid" | "paid" | "partially_refunded" | "refunded";
  fulfilment_status: "unfulfilled" | "fulfilled" | "cancelled";
  currency: string;
  subtotal_amount: string;
  total_amount: string;
  metadata: Record<string, unknown>;
  version: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}
export interface PaymentAttempt {
  id: string;
  payment_id: string;
  provider_account_id: string;
  provider: string;
  status: "created" | "submitted" | "pending" | "succeeded" | "failed" | "unknown";
  provider_reference: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
}
export interface Transaction {
  id: string;
  payment_id: string;
  refund_id: string | null;
  kind: "charge" | "refund";
  amount: string;
  currency: string;
  provider_reference: string;
  environment: "test" | "live";
  occurred_at: string;
  created_at: string;
}
export interface Refund {
  id: string;
  payment_id: string;
  amount: string;
  currency: string;
  status: "created" | "pending" | "succeeded" | "failed";
  reason: string;
  provider_reference: string | null;
  failure_code: string | null;
  environment: "test" | "live";
  created_at: string;
}
export interface Payment {
  id: string;
  order_id: string;
  customer_id: string | null;
  amount: string;
  currency: string;
  status:
    | "created"
    | "pending"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "partially_refunded"
    | "refunded";
  provider_account_id: string;
  latest_attempt_id: string | null;
  refunded_amount: string;
  metadata: Record<string, unknown>;
  environment: "test" | "live";
  version: number;
  created_at: string;
  updated_at: string;
  attempts?: PaymentAttempt[];
  transactions?: Transaction[];
  refunds?: Refund[];
}
export interface ProviderAccount {
  id: string;
  provider: string;
  label: string;
  environment: "test" | "live";
  capabilities: string[];
  supported_currencies: string[];
  status: "enabled" | "disabled";
  is_default: boolean;
}
export interface CheckoutLineItem {
  id: string;
  variant_id: string | null;
  description: string;
  variant_title: string | null;
  sku: string | null;
  unit_amount: string;
  currency: string;
  quantity: number;
  total_amount: string;
}
export interface CheckoutSession {
  id: string;
  merchant_id: string;
  location_id: string;
  payment_link_id: string | null;
  customer_id: string | null;
  order_id: string | null;
  payment_id: string | null;
  status: "open" | "processing" | "completed" | "expired" | "cancelled";
  amount: string;
  currency: string;
  customer_capture: { name: boolean; email: boolean; phone: boolean };
  success_url: string | null;
  cancel_url: string | null;
  expires_at: string;
  completed_at: string | null;
  late_completion: boolean;
  environment: "test" | "live";
  version: number;
  items: CheckoutLineItem[];
  checkout_url?: string;
}
export interface PaymentLink {
  id: string;
  merchant_id: string;
  location_id: string;
  name: string;
  description: string | null;
  kind: "product" | "fixed" | "flexible";
  status: "active" | "inactive";
  variant_id: string | null;
  quantity: number | null;
  amount: string | null;
  minimum_amount: string | null;
  maximum_amount: string | null;
  currency: string;
  usage_limit: number | null;
  completed_usage_count: number;
  customer_capture: { name: boolean; email: boolean; phone: boolean };
  environment: "test" | "live";
  version: number;
  payment_url?: string;
}
export interface Store {
  id: string;
  public_name: string;
  slug: string;
  status: "draft" | "active" | "paused" | "archived";
  currency: string;
  public_url: string;
  appearance: Record<string, string>;
  catalogue_version: number;
  version: number;
}
export interface StorefrontProduct {
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  image_alt: string | null;
  variants: Array<{
    id: string;
    title: string;
    unit_amount: string;
    currency: string;
    availability: "in_stock" | "low_stock" | "out_of_stock";
  }>;
}
export interface Location {
  id: string;
  merchant_id: string;
  name: string;
  code: string | null;
  type: string;
  status: "active" | "inactive" | "archived";
  timezone: string;
  address: Record<string, string>;
  version: number;
}
export interface Employee {
  id: string;
  name: string;
  email: string;
  status: string;
  staff_profile: Record<string, unknown>;
  assignments: Array<{
    role: string;
    scope_type: string;
    scope_id: string;
    location_name: string | null;
  }>;
}
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_amount: string;
  total_amount: string;
  currency: string;
}
export interface Invoice {
  id: string;
  invoice_number: string | null;
  status: "draft" | "open" | "paid" | "void";
  display_status: string;
  customer_id: string;
  location_id: string | null;
  currency: string;
  subtotal_amount: string;
  total_amount: string;
  due_at: string | null;
  payment_id: string | null;
  items: InvoiceItem[];
  invoice_url?: string;
}
export interface RecurringPrice {
  id: string;
  plan_id: string;
  currency: string;
  unit_amount: string;
  interval: "month" | "year";
  interval_count: 1;
  status: "active" | "archived";
}
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  version: number;
  prices?: RecurringPrice[];
}
export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  price_id: string;
  status: "trialing" | "active" | "past_due" | "paused" | "cancelled" | "ended";
  currency: string;
  unit_amount: string;
  interval: "month" | "year";
  current_period_start: string;
  current_period_end: string;
  next_billing_at: string | null;
  cancel_at_period_end: boolean;
  retry_count: number;
}
export interface VariantInput {
  sku: string;
  title: string;
  unit_amount: string;
  currency: string;
  track_inventory?: boolean;
}
export interface CreateOrderInput {
  merchant_id: string;
  location_id: string;
  customer_id?: string | null;
  currency: string;
  items: Array<{ variant_id: string; quantity: number }>;
  metadata?: Record<string, unknown>;
}

interface ErrorEnvelope {
  error: {
    type: string;
    code: string;
    message: string;
    param: string | null;
    request_id: string;
    details: Array<Record<string, unknown>>;
  };
}
export class YinneApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string,
    public readonly code: string,
    message: string,
    public readonly requestId: string,
    public readonly param: string | null,
    public readonly details: Array<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "YinneApiError";
  }
}

export interface YinneClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}
function query<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export class YinneClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;
  constructor(private readonly options: YinneClientOptions) {
    this.baseUrl = (options.baseUrl ?? "https://api.yinne.com").replace(/\/$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch;
  }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const body = (await response.json()) as T | ErrorEnvelope;
    if (!response.ok) {
      const error = (body as ErrorEnvelope).error;
      throw new YinneApiError(
        response.status,
        error.type,
        error.code,
        error.message,
        error.request_id,
        error.param,
        error.details,
      );
    }
    return body as T;
  }
  readonly customers = {
    list: (params: ListParams & { email?: string } = {}) =>
      this.request<Page<Customer>>(`/v1/customers${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ customer: Customer; request_id: string }>(`/v1/customers/${id}`).then(
        (value) => value.customer,
      ),
    create: (input: {
      name: string;
      email?: string | null;
      phone?: string | null;
      external_ref?: string | null;
      metadata?: Record<string, unknown>;
    }) =>
      this.request<{ customer: Customer }>("/v1/customers", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((value) => value.customer),
    update: (
      id: string,
      input: Partial<{
        name: string;
        email: string | null;
        phone: string | null;
        external_ref: string | null;
        metadata: Record<string, unknown>;
      }>,
    ) =>
      this.request<{ customer: Customer }>(`/v1/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((value) => value.customer),
  };
  readonly products = {
    list: (params: ListParams & { status?: Product["status"] } = {}) =>
      this.request<Page<Product>>(`/v1/products${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ product: Product }>(`/v1/products/${id}`).then((value) => value.product),
    create: (input: {
      name: string;
      slug: string;
      description?: string | null;
      metadata?: Record<string, unknown>;
      variants?: VariantInput[];
    }) =>
      this.request<{ product: Product }>("/v1/products", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((value) => value.product),
    update: (
      id: string,
      input: Partial<{
        name: string;
        slug: string;
        description: string | null;
        metadata: Record<string, unknown>;
        status: "active";
      }>,
    ) =>
      this.request<{ product: Product }>(`/v1/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((value) => value.product),
    archive: (id: string) =>
      this.request<{ product: Product }>(`/v1/products/${id}/archive`, { method: "POST" }).then(
        (value) => value.product,
      ),
    createVariant: (productId: string, input: VariantInput) =>
      this.request<{ variant: Variant }>(`/v1/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify(input),
      }).then((value) => value.variant),
  };
  readonly inventory = {
    list: (params: ListParams & { location_id?: string; variant_id?: string } = {}) =>
      this.request<Page<InventoryLevel>>(`/v1/inventory-levels${query(params)}`),
    adjust: (input: { variant_id: string; location_id: string; delta: string; reason: string }) =>
      this.request<{ inventory_level: InventoryLevel }>("/v1/inventory-adjustments", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((value) => value.inventory_level),
  };
  readonly orders = {
    list: (
      params: ListParams & {
        location_id?: string;
        customer_id?: string;
        financial_status?: Order["financial_status"];
        fulfilment_status?: Order["fulfilment_status"];
      } = {},
    ) => this.request<Page<Order>>(`/v1/orders${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ order: Order }>(`/v1/orders/${id}`).then((value) => value.order),
    create: (input: CreateOrderInput, options: { idempotencyKey?: string } = {}) =>
      this.request<{ order: Order }>("/v1/orders", {
        method: "POST",
        headers: { "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() },
        body: JSON.stringify(input),
      }).then((value) => value.order),
    cancel: (id: string) =>
      this.request<{ order: Order }>(`/v1/orders/${id}/cancel`, { method: "POST" }).then(
        (value) => value.order,
      ),
  };
  readonly payments = {
    list: (
      params: ListParams & {
        status?: Payment["status"];
        order_id?: string;
        customer_id?: string;
        provider_account_id?: string;
      } = {},
    ) => this.request<Page<Payment>>(`/v1/payments${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ payment: Payment }>(`/v1/payments/${id}`).then((value) => value.payment),
    create: (
      input: {
        order_id: string;
        provider_account_id?: string;
        confirmation?: {
          mock_scenario:
            | "success"
            | "failure:declined"
            | "pending:then_success"
            | "pending:then_failure"
            | "timeout:then_success";
        };
        metadata?: Record<string, unknown>;
      },
      options: { idempotencyKey?: string } = {},
    ) =>
      this.request<{ payment: Payment }>("/v1/payments", {
        method: "POST",
        headers: { "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() },
        body: JSON.stringify(input),
      }).then((value) => value.payment),
  };
  readonly refunds = {
    list: (params: ListParams & { payment_id?: string; status?: Refund["status"] } = {}) =>
      this.request<Page<Refund>>(`/v1/refunds${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ refund: Refund }>(`/v1/refunds/${id}`).then((value) => value.refund),
    create: (
      input: {
        payment_id: string;
        amount?: string;
        reason: string;
        confirmation?: { mock_scenario: "refund_success" | "refund_failure" };
        metadata?: Record<string, unknown>;
      },
      options: { idempotencyKey?: string } = {},
    ) =>
      this.request<{ refund: Refund }>("/v1/refunds", {
        method: "POST",
        headers: { "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() },
        body: JSON.stringify(input),
      }).then((value) => value.refund),
  };
  readonly transactions = {
    list: (params: ListParams & { payment_id?: string; kind?: Transaction["kind"] } = {}) =>
      this.request<Page<Transaction>>(`/v1/transactions${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ transaction: Transaction }>(`/v1/transactions/${id}`).then(
        (value) => value.transaction,
      ),
  };
  readonly providerAccounts = {
    list: (params: { limit?: number; status?: ProviderAccount["status"] } = {}) =>
      this.request<Page<ProviderAccount>>(`/v1/provider-accounts${query(params)}`),
  };
  readonly checkoutSessions = {
    list: (
      params: ListParams & { status?: CheckoutSession["status"]; payment_link_id?: string } = {},
    ) => this.request<Page<CheckoutSession>>(`/v1/checkout/sessions${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ checkout_session: CheckoutSession }>(`/v1/checkout/sessions/${id}`).then(
        (value) => value.checkout_session,
      ),
    create: (
      input: {
        merchant_id: string;
        location_id: string;
        customer_id?: string | null;
        currency: string;
        items: { variant_id: string; quantity: number }[];
        customer_capture?: { name: boolean; email: boolean; phone: boolean };
        success_url?: string;
        cancel_url?: string;
        expires_in_seconds?: number;
        metadata?: Record<string, unknown>;
      },
      options: { idempotencyKey?: string } = {},
    ) =>
      this.request<{ checkout_session: CheckoutSession }>("/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() + crypto.randomUUID(),
        },
        body: JSON.stringify(input),
      }).then((value) => value.checkout_session),
    confirm: (
      id: string,
      input: {
        customer?: { name?: string; email?: string; phone?: string };
        confirmation?: {
          mock_scenario:
            | "success"
            | "failure:declined"
            | "pending:then_success"
            | "pending:then_failure"
            | "timeout:then_success";
        };
      },
      options: { idempotencyKey?: string } = {},
    ) =>
      this.request<{ checkout_session: CheckoutSession }>(`/v1/checkout/sessions/${id}/confirm`, {
        method: "POST",
        headers: {
          "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() + crypto.randomUUID(),
        },
        body: JSON.stringify(input),
      }).then((value) => value.checkout_session),
    cancel: (id: string) =>
      this.request<{ checkout_session: CheckoutSession }>(`/v1/checkout/sessions/${id}/cancel`, {
        method: "POST",
      }).then((value) => value.checkout_session),
  };
  readonly paymentLinks = {
    list: (
      params: ListParams & { status?: PaymentLink["status"]; kind?: PaymentLink["kind"] } = {},
    ) => this.request<Page<PaymentLink>>(`/v1/payment-links${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ payment_link: PaymentLink }>(`/v1/payment-links/${id}`).then(
        (value) => value.payment_link,
      ),
    create: (input: Record<string, unknown>, options: { idempotencyKey?: string } = {}) =>
      this.request<{ payment_link: PaymentLink }>("/v1/payment-links", {
        method: "POST",
        headers: {
          "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() + crypto.randomUUID(),
        },
        body: JSON.stringify(input),
      }).then((value) => value.payment_link),
    update: (id: string, input: Record<string, unknown>) =>
      this.request<{ payment_link: PaymentLink }>(`/v1/payment-links/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((value) => value.payment_link),
    activate: (id: string) =>
      this.request<{ payment_link: PaymentLink }>(`/v1/payment-links/${id}/activate`, {
        method: "POST",
      }).then((value) => value.payment_link),
    deactivate: (id: string) =>
      this.request<{ payment_link: PaymentLink }>(`/v1/payment-links/${id}/deactivate`, {
        method: "POST",
      }).then((value) => value.payment_link),
  };
  readonly storefront = {
    retrieve: () => this.request<{ store: Store }>("/v1/store").then((value) => value.store),
    update: (input: Record<string, unknown>) =>
      this.request<{ store: Store }>("/v1/store", {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((value) => value.store),
    activate: () =>
      this.request<{ store: Store }>("/v1/store/activate", { method: "POST" }).then(
        (value) => value.store,
      ),
    pause: () =>
      this.request<{ store: Store }>("/v1/store/pause", { method: "POST" }).then(
        (value) => value.store,
      ),
    publish: (productId: string, input: Record<string, unknown> = {}) =>
      this.request<{ listing: Record<string, unknown> }>(
        `/v1/store/products/${productId}/publish`,
        { method: "POST", body: JSON.stringify(input) },
      ).then((value) => value.listing),
    unpublish: (productId: string) =>
      this.request<{ listing: Record<string, unknown> }>(
        `/v1/store/products/${productId}/unpublish`,
        { method: "POST" },
      ).then((value) => value.listing),
    publicProducts: (slug: string, params: { limit?: number; after?: string } = {}) =>
      this.request<{ data: StorefrontProduct[]; has_more: boolean }>(
        `/v1/public/stores/${slug}/products${query(params)}`,
      ),
    beginCheckout: (
      slug: string,
      items: { variant_id: string; quantity: number }[],
      idempotencyKey = crypto.randomUUID() + crypto.randomUUID(),
    ) =>
      this.request<{ checkout_session: CheckoutSession }>(`/v1/public/stores/${slug}/checkout`, {
        method: "POST",
        body: JSON.stringify({ items, idempotency_key: idempotencyKey }),
      }).then((value) => value.checkout_session),
  };
  readonly locations = {
    list: (params: { limit?: number; status?: Location["status"]; type?: string } = {}) =>
      this.request<Page<Location>>(`/v1/locations${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ location: Location }>(`/v1/locations/${id}`).then((value) => value.location),
    create: (input: Record<string, unknown>) =>
      this.request<{ location: Location }>("/v1/locations", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((value) => value.location),
    update: (id: string, input: Record<string, unknown>) =>
      this.request<{ location: Location }>(`/v1/locations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((value) => value.location),
    activate: (id: string) =>
      this.request<{ location: Location }>(`/v1/locations/${id}/activate`, { method: "POST" }).then(
        (value) => value.location,
      ),
    deactivate: (id: string) =>
      this.request<{ location: Location }>(`/v1/locations/${id}/deactivate`, {
        method: "POST",
      }).then((value) => value.location),
  };
  readonly employees = {
    list: (params: { location_id?: string } = {}) =>
      this.request<{ data: Employee[] }>(`/v1/employees${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ employee: Employee }>(`/v1/employees/${id}`).then((value) => value.employee),
    assignLocation: (id: string, input: { location_id: string; role: string }) =>
      this.request<{ assignment: Record<string, unknown> }>(`/v1/employees/${id}/locations`, {
        method: "POST",
        body: JSON.stringify(input),
      }).then((value) => value.assignment),
  };
  readonly invoices = {
    list: (
      params: {
        limit?: number;
        status?: Invoice["status"];
        customer_id?: string;
        location_id?: string;
      } = {},
    ) => this.request<Page<Invoice>>(`/v1/invoices${query(params)}`),
    retrieve: (id: string) =>
      this.request<{ invoice: Invoice }>(`/v1/invoices/${id}`).then((value) => value.invoice),
    create: (input: Record<string, unknown>, options: { idempotencyKey?: string } = {}) =>
      this.request<{ invoice: Invoice }>("/v1/invoices", {
        method: "POST",
        headers: {
          "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() + crypto.randomUUID(),
        },
        body: JSON.stringify(input),
      }).then((value) => value.invoice),
    update: (id: string, input: Record<string, unknown>) =>
      this.request<{ invoice: Invoice }>(`/v1/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((value) => value.invoice),
    issue: (id: string, options: { idempotencyKey?: string } = {}) =>
      this.request<{ invoice: Invoice }>(`/v1/invoices/${id}/issue`, {
        method: "POST",
        headers: {
          "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() + crypto.randomUUID(),
        },
      }).then((value) => value.invoice),
    void: (id: string) =>
      this.request<{ invoice: Invoice }>(`/v1/invoices/${id}/void`, { method: "POST" }).then(
        (value) => value.invoice,
      ),
  };
  readonly subscriptionPlans = {
    list: (params: { limit?: number; status?: SubscriptionPlan["status"] } = {}) =>
      this.request<Page<SubscriptionPlan>>(`/v1/subscription-plans${query(params)}`),
    retrieve: (id: string) => this.request<{ plan: SubscriptionPlan }>(`/v1/subscription-plans/${id}`).then((value) => value.plan),
    create: (input: Record<string, unknown>) => this.request<{ plan: SubscriptionPlan }>("/v1/subscription-plans", { method: "POST", body: JSON.stringify(input) }).then((value) => value.plan),
    archive: (id: string) => this.request<{ plan: SubscriptionPlan }>(`/v1/subscription-plans/${id}/archive`, { method: "POST" }).then((value) => value.plan),
    createPrice: (input: Record<string, unknown>) => this.request<{ price: RecurringPrice }>("/v1/recurring-prices", { method: "POST", body: JSON.stringify(input) }).then((value) => value.price),
    archivePrice: (id: string) => this.request<{ price: RecurringPrice }>(`/v1/recurring-prices/${id}/archive`, { method: "POST" }).then((value) => value.price),
  };
  readonly subscriptions = {
    list: (params: { limit?: number; status?: Subscription["status"]; customer_id?: string; plan_id?: string } = {}) => this.request<Page<Subscription>>(`/v1/subscriptions${query(params)}`),
    retrieve: (id: string) => this.request<{ subscription: Subscription }>(`/v1/subscriptions/${id}`).then((value) => value.subscription),
    create: (input: Record<string, unknown>, options: { idempotencyKey?: string } = {}) => this.request<{ subscription: Subscription }>("/v1/subscriptions", { method: "POST", headers: { "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID() + crypto.randomUUID() }, body: JSON.stringify(input) }).then((value) => value.subscription),
    pause: (id: string) => this.request<{ subscription: Subscription }>(`/v1/subscriptions/${id}/pause`, { method: "POST" }).then((value) => value.subscription),
    resume: (id: string) => this.request<{ subscription: Subscription }>(`/v1/subscriptions/${id}/resume`, { method: "POST" }).then((value) => value.subscription),
    cancel: (id: string, mode: "immediate" | "period_end") => this.request<{ subscription: Subscription }>(`/v1/subscriptions/${id}/cancel`, { method: "POST", body: JSON.stringify({ mode }) }).then((value) => value.subscription),
    retry: (id: string, mockOutcome?: "succeed" | "fail" | "pending") => this.request<{ renewal: Record<string, unknown> }>(`/v1/subscriptions/${id}/retry`, { method: "POST", body: JSON.stringify(mockOutcome ? { mock_outcome: mockOutcome } : {}) }).then((value) => value.renewal),
  };
}
