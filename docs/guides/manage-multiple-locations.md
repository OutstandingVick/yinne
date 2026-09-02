# Manage multiple locations

Use **Locations** to view the canonical nodes shared by Inventory, Orders, Storefront, Employees, and
Invoices. Create and update them through `/v1/locations`; use dedicated lifecycle actions to activate,
deactivate, or archive. Archive is terminal and is blocked while active operational work depends on
the Location.

Employees remain Organization Members. Grant a location-scoped role through
`POST /v1/employees/{memberId}/locations` and remove it through the matching `DELETE` route. Owners
and admins manage organization-wide operations; manager and staff authority is constrained by their
Location Role Assignments. See [the detailed operations guide](./manage-locations-and-employees.md).
