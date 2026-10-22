# Spotify Ability implementation decisions

Decisions made during the approved inline implementation, in ledger order. Each
records its rationale and cost if wrong. This is an implementation record, not a
claim of live provider verification or release readiness.

## Rulings I made

1. pin the tested host commit now and defer the single final review across both completed repositories — cross-repository integration should be reviewable together, and no source/development artifact is being presented as a release — cost if wrong: review can require a new contract pin and repeated integration checks.

2. expose one query or up to forty supplied track URIs per playlist/library mutation — this keeps ambiguity resolvable through host-private choices before mutation, without inventing a persistent query journal or sending provider IDs to AI — cost if wrong: multi-song natural-language requests require separate resolutions rather than one bulk fuzzy search.

3. describe the library HTTP grant as saving library items while tools validate track-only URIs — Spotify’s scope/endpoint covers several item types and the host’s generic bounded string schema does not enforce provider-specific URI types — cost if wrong: an approved arbitrary-code author can use that declared library endpoint more broadly than this worker’s tools; the actual endpoint and OAuth scope are shown in consent.

4. permit one bounded Retry-After retry only after an explicit 429 rejection — respects the provider delay within a 55-second worker budget and avoids unbounded retries — cost if wrong: persistent throttling needs a fresh owner request.

5. return bounded plain display strings and let the existing host escape text nodes — pre-escaping worker strings would double-escape names and does not establish a rendering boundary — cost if wrong: any future host renderer accepting HTML would need its own escaping audit.

6. build Spotify links from strictly parsed returned Spotify URIs instead of trusting provider external_urls — preserves canonical attribution links without accepting arbitrary origins — cost if wrong: a future Spotify URL convention change needs a worker update.

7. keep ambiguous mutation continuations bound to the original tool and exact arguments — owner selections must not silently change an action while carrying earlier resolved targets — cost if wrong: a model changing optional arguments must restart resolution instead of reusing the choice.

8. only auto-resolve a unique playlist name when the first page is complete; otherwise use owner choices and bounded continuation — an unseen page can contain the same name — cost if wrong: large collections need an extra selection even for a unique name.

9. use typed-only Spotify as the first-version default after the optional scope question remained unanswered for several minutes — current provider policy III.3 directly conflicts with the earlier voice design; independent text functionality remains authorized — cost if wrong: voice support needs revisiting with provider permission and an explicit scope change. User was informed; Task 6 must enforce this in the host, not merely describe it.

10. require --asset-id for release metadata, with --development explicitly using a development tag and offline placeholder — real GitHub asset identity exists only after an authorized archive upload; never fabricate a production release identifier — cost if wrong: publication requires a second descriptor-generation/verification step.

11. reuse the host-reviewed setup-node v4.4.0 exact SHA and Node 24.20.0 in collection CI — source/revision/dependencies/advisories/build code were reviewed in this same session, so no new third-party runtime dependency is introduced — cost if wrong: upstream bundled action reproducibility remains unverified, as recorded in VERIFICATION.md.

12. reuse host-generic real crash/freeze, restored-disabled and durable interrupted-receipt acceptance alongside the sealed Spotify integration — these boundaries do not vary with provider logic, and duplicate fixture-only tests would not add stronger evidence — cost if wrong: a provider-specific interaction outside the covered account/transport paths would require an additional regression.

13. retain the documented unsandboxed-host threat boundary — host compromise is outside Ability confinement; malicious workers remain in scope — cost if wrong: a reader may overestimate isolation, so limits remain explicit.

14. visual/keyboard, live Spotify compatibility and provider branding remain explicit draft/publication gates — unavailable access cannot be replaced with synthetic evidence — cost if wrong: UI/provider corrections may still be necessary before release.

## Deferred minors

None identified by the independent whole-change review.
