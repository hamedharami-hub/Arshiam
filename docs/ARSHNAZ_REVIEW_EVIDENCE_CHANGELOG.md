# ARSHNAZ content review evidence

## 2026-09-25 — Pharmacy-derived educational content

- A legacy `content_review_status: "reviewed"` value is not sufficient on its own to present a clinical/educational document as reviewed.
- Review records now require a reviewer role, jurisdiction, review scope, a valid non-future review date, and at least one titled HTTPS reference with a valid access date.
- The Knowledge editor can record this metadata in a collapsed bilingual section. The Reader displays recorded details and an explicit limitation: ARSHNAZ stores the self-entered record but does not authenticate reviewer credentials or independently certify source authority/currentness.
- Imported Pharmacy material stays cautioned unless complete evidence is recorded. A bare/partial `reviewed` marker is presented as unverified.
- Legacy Pharmacy imports without `source_url` or review fields are also recognized through the immutable seed ID namespaces; all 432 current seed document IDs were checked against the classifier.
- Changes to a document title or either-language body automatically return its review status to `unreviewed`. Review metadata is retained as history but is not displayed as a current review while that status is unreviewed.
- Creation and update services reject attempts to set `reviewed` without complete evidence. Tests cover validation, persistence, import preservation, content-edit invalidation, Reader warnings, and Editor behavior.

## Limits and remaining work

- These fields are user-entered metadata, not a credential-verification workflow. A complete record does not prove the reviewer is qualified or that a linked source is authoritative or up to date.
- Pharmacy scenario clinical claims still need pharmacist review against current primary sources and relevant jurisdictional guidance. No clinical content was endorsed or changed in this stage.
- This stage does not implement Pharmacy OTC triage parity, Google Drive media storage, or end-to-end authenticated production-browser verification. It does not write live Firestore data or create an Android APK.

## 2026-09-25 — Bilingual field coverage scan

- All 432 Pharmacy seed documents have non-empty Persian and English titles and bodies; all are marked `unreviewed` and have a pinned GitHub source URL.
- A static scan found Persian-script passages in 104 `content_en` fields; 89 have explicit RTL markup, and 13 documents have at least a 30% Persian-script share by character count. This does not establish translation correctness because some scenarios intentionally contain bilingual dialogue.
- The Reader warns when an English field contains a substantial Persian passage. It does not hide, rewrite, or machine-translate clinical text; each item still needs review.
