"""Remove only the retired grant from one account's companion-service module state.

Run from backend: python scripts/purge_retired_module_state.py --uid OWNER [--apply]
Inventory is the default. Existing study/mind grants and unrelated account rows are retained.
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


async def main(uid: str, apply: bool) -> None:
    from db import db

    selector = {"user_id": uid, "modules.pharmacy": {"$exists": True}}
    found = await db.user_modules.count_documents(selector)
    removed = 0
    if apply:
        result = await db.user_modules.update_many(selector, {"$unset": {"modules.pharmacy": ""}})
        removed = result.modified_count
    print({"mode": "apply" if apply else "inventory", "eligible": found, "removed": removed})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uid", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not args.uid or len(args.uid) > 128 or any(ord(char) < 32 or char == "/" for char in args.uid) or args.uid in {"guest", "anonymous-kb-user", "anonymous-review-user"}:
        parser.error("An explicit verified account UID is required")
    asyncio.run(main(args.uid, args.apply))
