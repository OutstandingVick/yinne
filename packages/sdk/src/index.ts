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
}
