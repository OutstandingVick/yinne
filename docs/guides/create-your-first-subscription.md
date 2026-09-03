# Create your first subscription

Create a Subscription Plan, then attach an immutable monthly or annual Price using integer minor
units. Choose an active Customer, Merchant Location, Price, billing timezone, and optional test trial
in **Subscriptions**. Existing subscriptions snapshot the selected amount, currency, interval, and
anchor day; later Prices never rewrite those terms.

For a paid non-trial subscription, Yinne immediately starts canonical billing:

```text
Subscription → Invoice → Checkout → Payment → Transaction
```

Only successful canonical Payment evidence activates/renews financial service. Test mode can simulate
unattended Mock execution. No raw card or production saved-payment credential exists.
