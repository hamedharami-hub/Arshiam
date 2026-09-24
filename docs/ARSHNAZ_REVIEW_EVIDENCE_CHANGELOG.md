# ARSHNAZ content review evidence

## 2026-09-25 — Pharmacy-derived educational content

- A legacy `content_review_status: "reviewed"` value is not sufficient on its own to present a clinical/educational document as reviewed.
- Review records now require a reviewer role, jurisdiction, review scope, a valid non-future review date, and at least one titled HTTPS reference with a valid access date.
- The Knowledge editor can record this metadata in a collapsed bilingual section. The Reader displays recorded details and an explicit limitation: ARSHNAZ stores the self-entered record but does not authenticate reviewer credentials or independently certify source authority/currentness.
- Imported Pharmacy material stays cautioned unless complete evidence is recorded. A bare/partial `reviewed` marker is presented as unverified.
- Changes to a document title or either-language body automatically return its review status to `unreviewed`. Review metadata is retained as history but is not displayed as a current review while that status is unreviewed.
- Creation and update services reject attempts to set `reviewed` without complete evidence. Tests cover validation, persistence, import preservation, content-edit invalidation, Reader warnings, and Editor behavior.

## Limits and remaining work

- These fields are user-entered metadata, not a credential-verification workflow. A complete record does not prove the reviewer is qualified or that a linked source is authoritative or up to date.
- Pharmacy scenario clinical claims still need pharmacist review against current primary sources and relevant jurisdictional guidance. No clinical content was endorsed or changed in this stage.
- This stage does not implement Pharmacy OTC triage parity, Google Drive media storage, or end-to-end authenticated production-browser verification. It does not write live Firestore data or create an Android APK.
