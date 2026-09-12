# Marketplace API Guide

Authenticated merchants use `/v1/marketplace/profile` and `/v1/marketplace/listings`, then submit or archive a listing through its action endpoint. Moderators use approve, reject, and suspend actions with a required reason code and explanation. The SDK mirrors profile, updateProfile, listings, createListing, submit, and archive.

Public clients use `GET /v1/public/marketplace` with bounded `q`, `category`, `merchant`, `currency`, amount, availability, and limit filters; retrieve an approved listing by ID; and post a canonical variant ID, quantity, and idempotency key to its checkout endpoint. Never send or trust a price: the server resolves canonical price, currency, merchant, publication, and inventory immediately before checkout creation.
