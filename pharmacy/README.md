<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.
https://ai.studio/apps/2efe8ef8-d3fc-4014-8fd8-6f8d8d9398c4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local`, set the AI provider key, and configure the Firebase Admin service account variables for protected AI routes. In Firebase App Hosting, use the default service identity instead.
3. Run the app:
   `npm run dev`

## Clinical-content governance

The portal is for study only, not patient-specific clinical decision-making. Every release that changes clinical, PBS, scheduling, or legal content must be reviewed against the source register in [`docs/CLINICAL_CONTENT_GOVERNANCE.md`](docs/CLINICAL_CONTENT_GOVERNANCE.md), with the source version and review date recorded before deployment.
