# AWS migration map

| Port (src/server/ports.ts) | Current adapter | AWS target |
|---|---|---|
| Auth / sessions | Signed-cookie sessions over the demo store | Cognito user pool (JWT verified in `src/server/session.ts`) |
| Database | In-memory demo store; Postgres schema in `supabase/migrations` | RDS PostgreSQL (same migrations apply; replace `auth.uid()` RLS helpers with app-level checks or Cognito-claim based policies) |
| StoragePort | Demo (data URLs) | S3 private bucket + presigned URLs |
| EmailPort | Demo outbox | SES |
| PaymentPort | Demo / Stripe test | Stripe (unchanged) |
| Realtime messaging | Polling | API Gateway WebSockets / AppSync |
