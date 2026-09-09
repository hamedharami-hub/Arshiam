# Firestore Security Specification

## 1. Data Invariants
- Each user can only read and write their own study state located at `/users/{userId}/user_data/study_state`.
- No user can access or overwrite another user's study state (`userId == request.auth.uid`).
- Strict key and type validation: `userId` is string, `starred` and `flagged` are lists with max size 1000 items, `updatedAt` is string.
- Document IDs must conform to `^[a-zA-Z0-9_\-]+$` and length <= 128 characters.
- Default-deny catch-all rule `match /{document=**} { allow read, write: if false; }` prevents access to unauthorized collections.
- Connection test doc `/test/{testId}` allows safe read for probe checking.

## 2. The Dirty Dozen Payloads
1. **Unauthenticated Read**: Reading `/users/user123/user_data/study_state` with `request.auth == null` -> REJECT.
2. **Unauthenticated Write**: Writing to `/users/user123/user_data/study_state` with `request.auth == null` -> REJECT.
3. **Identity Spoofing**: User `user1` attempting to write to `/users/user2/user_data/study_state` -> REJECT.
4. **ID Poisoning**: Attempting to write with document ID containing path traversal or junk characters `../hacks/../../` -> REJECT.
5. **Ghost Field Injection**: Adding unexpected fields like `isAdmin: true` to study state payload -> REJECT.
6. **Invalid Types**: Passing `starred: "not-an-array"` or number -> REJECT.
7. **Resource Exhaustion (Denial of Wallet)**: Passing an array with > 1000 elements -> REJECT.
8. **User ID Mismatch**: `incoming().userId != userId` path parameter -> REJECT.
9. **Blanket Query Scraping**: Attempting `list` on collection group or all users -> REJECT.
10. **Delete Other User's Data**: User `user1` deleting `user2`'s documents -> REJECT.
11. **Excessive String Length**: Passing a string > 10,000 characters -> REJECT.
12. **Modifying System Collections**: Writing to any arbitrary collection outside allowed schema -> REJECT.
