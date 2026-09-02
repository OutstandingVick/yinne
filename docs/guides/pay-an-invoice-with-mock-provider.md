# Pay an invoice with the Mock Provider

Open the issued Invoice's public capability URL and choose **Pay invoice**. The flow composes as:

```text
Invoice → Checkout Session → collection Order → Payments Core → Mock Provider → Transaction
```

Choose the Mock success outcome in hosted Checkout. Payments Core creates canonical Payment and
Transaction evidence, completes the Order and Checkout Session, and atomically reconciles the Invoice
to paid. Declined payment leaves it open; pending remains unresolved until provider verification.

The public URL is a bearer secret. Do not log it, paste it into support systems, or share it outside
the intended recipient.
