"""Seed the QA account with a small knowledge tree + due flashcards (idempotent, fixed ids)."""
import json
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / "firebase-applet-config.json").read_text())
EMAIL, PASSWORD = "test.arshnaz@example.com", "Test123456"

auth = requests.post(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={CFG['apiKey']}",
    json={"email": EMAIL, "password": PASSWORD, "returnSecureToken": True}, timeout=30,
).json()
UID, TOKEN = auth["localId"], auth["idToken"]
DB = CFG.get("firestoreDatabaseId") or "(default)"
BASE = f"https://firestore.googleapis.com/v1/projects/{CFG['projectId']}/databases/{DB}/documents/users/{UID}"
NOW = datetime.now(timezone.utc).isoformat()


def val(v):
    if v is None:
        return {"nullValue": None}
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    return {"stringValue": str(v)}


def put(collection: str, doc_id: str, data: dict):
    r = requests.patch(f"{BASE}/{collection}/{doc_id}", headers={"Authorization": f"Bearer {TOKEN}"},
                       json={"fields": {k: val(v) for k, v in data.items()}}, timeout=30)
    print(collection, doc_id, r.status_code, r.text[:160] if r.status_code >= 300 else "")


put("knowledge_folders", "qa-folder-pharm", {"id": "qa-folder-pharm", "user_id": UID, "parent_id": None, "name": "QA Pharmacology", "position": 0, "created_at": NOW, "updated_at": NOW})
put("knowledge_folders", "qa-folder-cardio", {"id": "qa-folder-cardio", "user_id": UID, "parent_id": "qa-folder-pharm", "name": "QA Cardio", "position": 0, "created_at": NOW, "updated_at": NOW})
for i, title in enumerate(["Beta blockers", "ACE inhibitors", "Statins"]):
    put("knowledge_documents", f"qa-doc-{i}", {"id": f"qa-doc-{i}", "user_id": UID, "folder_id": "qa-folder-cardio", "title": title,
                                              "content_html": f"<p>{title} notes</p>", "created_at": NOW, "updated_at": NOW})
cards = [("Metoprolol class?", "Beta-1 selective blocker"), ("Ramipril MOA?", "ACE inhibition"),
         ("Atorvastatin MOA?", "HMG-CoA reductase inhibition"), ("Propranolol caution?", "Asthma"),
         ("Lisinopril side effect?", "Dry cough"), ("Statin monitoring?", "LFTs and CK if myalgia")]
for i, (front, back) in enumerate(cards):
    put("leitner_cards", f"qa-card-{i}", {"id": f"qa-card-{i}", "user_id": UID, "document_id": f"qa-doc-{i % 3}", "front": front, "back": back,
                                         "box": 1, "next_review_at": "2026-01-01T00:00:00.000Z", "review_count": 0, "lapse_count": 0,
                                         "created_at": NOW, "updated_at": NOW})
