# Roadmap extension points

Phases 2-6 are intentionally **not implemented**. Services live behind `src/server/services/*` and `src/server/ports.ts`:

- Phase 2 (matching): add a `matching` service consuming `members.discover`; table `matching_scores`.
- Phase 3 (communities): new `communities` service + tables; reuse entitlements in `src/lib/plans.ts`.
- Phase 4 (creators / paid content): `creator_accounts`, `paid_content`; payments via `PaymentPort`.
- Phase 5 (video): `media_assets` + `StoragePort` with video content types.
- Phase 6 (monetisation/payouts): Stripe Connect adapter behind a new `PayoutPort`.
