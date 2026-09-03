# Using Yinne Analytics

Open **Analytics** to view the last 30 days, then select Sales, Payments, Customers, Subscriptions, Invoices, Locations, or Products for a 90-day domain report.

Every report states its reporting window, Africa/Lagos timezone, formula version, and live freshness time. Currency values are shown separately. “Net collected” means successful charge volume less successful refunds; it is not GAAP/IFRS revenue. Pending payments are not failures. Undefined ratios display as not comparable rather than infinity.

Location-assigned staff see only authorized locations. API clients provide `from`, `to`, and optionally `timezone`, `currency`, `location_id`, `granularity`, and `limit`. Custom ranges cannot exceed 366 days.
