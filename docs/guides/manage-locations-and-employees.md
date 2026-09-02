# Manage locations and employees

Yinne uses one canonical Location record everywhere: inventory, orders, Storefront fulfillment,
Invoices, and employee access. A location can represent a store, warehouse, office, or virtual
operation.

## Create and maintain locations

Open **Locations** in the dashboard or call `POST /v1/locations`. Provide a Merchant, unique code,
IANA timezone, location type, and structured address. New locations begin active.

Use `PATCH /v1/locations/{id}` for descriptive changes. Use the dedicated activate, deactivate, and
archive actions for lifecycle changes. Inactive locations remain available for history but cannot be
used for new operational work. Archive is terminal and is refused while an unpaid order or active
Store configuration depends on the location.

## Scope employees

An employee is an active Organization Member with a staff profile and one or more Role Assignments;
Yinne deliberately does not maintain a second employee identity. Open **Employees** to review each
person and their organization- or location-scoped roles.

Assign a location role with `POST /v1/employees/{memberId}/locations`. The role must exist and both
the member and location must be active. Remove it with
`DELETE /v1/employees/{memberId}/locations/{locationId}`. Assignment is idempotent and every actual
assignment or removal creates an audit record and domain event.

## Access model

- Owners and admins can manage locations and assignments across the organization.
- Managers can read operational data and act only inside their assigned location scope.
- Staff access is location-scoped and intentionally narrower.
- Analysts have read-only organization visibility.

All service queries include the organization boundary; authorization is enforced again by database
row-level security. API credentials require the corresponding `locations:*` or `employees:*` scope.
