"""Owner-bound account deletion checks without production credentials or databases."""
import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch


class AccountDataDeletionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.delete_objects = AsyncMock(return_value=2)
        self.disconnect = AsyncMock()
        self.db = SimpleNamespace(**{
            name: SimpleNamespace(delete_many=AsyncMock(return_value=SimpleNamespace(deleted_count=2)))
            for name in ("attachments", "user_modules", "module_attempts")
        })
        attachments = ModuleType("attachments")
        attachments.delete_all_attachments_for_user = self.delete_objects
        auth = ModuleType("auth")
        auth.current_user_id = AsyncMock()
        database = ModuleType("db")
        database.db = self.db
        integration = ModuleType("google_integration")
        integration.disconnect = self.disconnect
        with patch.dict(sys.modules, {
            "attachments": attachments, "auth": auth, "db": database,
            "google_integration": integration,
        }):
            spec = importlib.util.spec_from_file_location("account_data_under_test", Path(__file__).with_name("account_data.py"))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        self.delete_account = module.delete_account_data

    async def test_deletes_only_authenticated_owner_metadata_after_object_cleanup(self):
        calls = []
        self.delete_objects.side_effect = lambda uid: calls.append(("objects", uid)) or 2
        self.db.attachments.delete_many.side_effect = lambda query: calls.append(("metadata", query)) or SimpleNamespace(deleted_count=2)
        result = await self.delete_account("alice")
        self.assertEqual(calls, [("objects", "alice"), ("metadata", {"owner_id": "alice", "status": "deleted"})])
        self.disconnect.assert_awaited_once_with("alice")
        self.db.user_modules.delete_many.assert_awaited_once_with({"user_id": "alice"})
        self.db.module_attempts.delete_many.assert_awaited_once_with({"user_id": "alice"})
        self.assertTrue(result["ok"])
        self.assertEqual(result["attachment_metadata_deleted"], 2)

    async def test_object_failure_preserves_metadata_for_retry(self):
        self.delete_objects.side_effect = RuntimeError("object unavailable")
        with self.assertRaisesRegex(RuntimeError, "object unavailable"):
            await self.delete_account("alice")
        self.db.attachments.delete_many.assert_not_awaited()
        self.disconnect.assert_not_awaited()

    async def test_metadata_failure_does_not_report_success(self):
        self.db.attachments.delete_many.side_effect = RuntimeError("metadata unavailable")
        with self.assertRaisesRegex(RuntimeError, "metadata unavailable"):
            await self.delete_account("alice")
        self.disconnect.assert_not_awaited()

    async def test_repeated_cleanup_of_absent_owned_metadata_is_safe(self):
        self.delete_objects.return_value = 0
        for collection in vars(self.db).values():
            collection.delete_many.return_value = SimpleNamespace(deleted_count=0)
        first = await self.delete_account("alice")
        second = await self.delete_account("alice")
        self.assertEqual(first, second)
        self.assertEqual(second["attachment_metadata_deleted"], 0)
        self.assertTrue(second["ok"])


if __name__ == "__main__":
    unittest.main()
