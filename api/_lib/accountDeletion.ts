/** Delete every owned resource before removing the credential needed to retry. */
export async function deleteAccountResources(
  uid: string,
  services: {
    deleteStoragePrefix: (prefix: string) => Promise<void>;
    deleteLegacyAttachments: (uid: string) => Promise<void>;
    deleteUserTree: (uid: string) => Promise<void>;
    deleteAssistantTokenIndexes: (uid: string) => Promise<void>;
    deleteAuthUser: (uid: string) => Promise<void>;
  },
): Promise<void> {
  // The older note-media uploader stored files outside users/{uid}/.
  await services.deleteLegacyAttachments(uid);
  for (const prefix of [`users/${uid}/`, `note-media/${uid}/`]) {
    await services.deleteStoragePrefix(prefix);
  }
  await services.deleteUserTree(uid);
  // These lookup records live outside users/{uid} and are not covered by
  // recursiveDelete. Keep Auth available if their cleanup needs a retry.
  await services.deleteAssistantTokenIndexes(uid);
  await services.deleteAuthUser(uid);
}
