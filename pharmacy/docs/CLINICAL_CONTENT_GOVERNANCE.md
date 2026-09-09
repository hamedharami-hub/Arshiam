# Clinical content governance

This application is an education product. It must not be used as a substitute for patient-specific professional judgment, local policy, or current legislation.

## Release gate

Before releasing a change that affects dosing, triage, interactions, dispensing, PBS claims, scheduling, cautionary labels, or state requirements:

1. Assign a clinical owner and a reviewer.
2. Record the source title, edition or URL, jurisdiction, accessed date, and the affected content IDs.
3. Confirm the advice is still current and add a review-by date.
4. Test Persian and English renderings together; neither language may be a weaker translation of a safety instruction.
5. Do not publish AI-generated clinical material until it has passed the same review.

## Source register

| Content domain | Authoritative source | Minimum review cadence |
| --- | --- | --- |
| Medicines information and dosing | Australian Medicines Handbook and Therapeutic Guidelines | At each release; urgent review on safety alerts |
| PBS and claims | PBS and Services Australia | Monthly |
| Scheduling and cautionary labels | SUSMP, relevant state or territory poisons legislation, PSA/APF references | Monthly and on jurisdictional change |
| Professional conduct and registration | Pharmacy Board of Australia and Ahpra | Quarterly |
| Clinical practice standards | PSA and SHPA guidance | Quarterly |

## AI safety controls

AI output is educational draft content only. The product must retain the clinical disclaimer, identify AI-generated cards to reviewers, and never represent generated output as a current legal or therapeutic authority.

## Operational controls

The Firestore collection `_aiRateLimits` stores per-user request counts. Configure Firestore TTL on `expiresAt` so expired rate-limit documents are removed automatically.
