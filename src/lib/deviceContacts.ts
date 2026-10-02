import { Capacitor } from "@capacitor/core";
import type {
  ContactPhone,
  ContactEmail,
  ContactAddress,
  ContactWebsite,
} from "./contactTypes";

export interface DeviceContactCandidate {
  id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  phones: ContactPhone[];
  emails: ContactEmail[];
  addresses: ContactAddress[];
  websites: ContactWebsite[];
}

export function isDeviceContactImportSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/**
 * Explicitly requests contact permission from the user on Android.
 * Never called automatically or in background.
 */
export async function requestDeviceContactPermission(): Promise<{ granted: boolean; error?: string }> {
  if (!isDeviceContactImportSupported()) {
    return { granted: false, error: "Only available on Android" };
  }

  try {
    const { Contacts } = await import("@capacitor-community/contacts");
    const status = await Contacts.requestPermissions();
    const isGranted = status.contacts === "granted";
    return { granted: isGranted, error: isGranted ? undefined : "Permission not granted" };
  } catch (err) {
    return {
      granted: false,
      error: err instanceof Error ? err.message : "Failed to request contacts permission",
    };
  }
}

/**
 * Checks current contact permission on Android.
 */
export async function checkDeviceContactPermission(): Promise<boolean> {
  if (!isDeviceContactImportSupported()) return false;
  try {
    const { Contacts } = await import("@capacitor-community/contacts");
    const status = await Contacts.checkPermissions();
    return status.contacts === "granted";
  } catch {
    return false;
  }
}

/**
 * Fetches contacts from Android device using Capacitor Contacts plugin.
 * Strictly user-initiated. No data is stored, synced, or logged.
 */
export async function fetchDeviceContacts(): Promise<{ contacts: DeviceContactCandidate[]; error?: string }> {
  if (!isDeviceContactImportSupported()) {
    return { contacts: [], error: "Device contact import is only supported on Android devices" };
  }

  try {
    const { Contacts } = await import("@capacitor-community/contacts");
    const result = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
        organization: true,
        postalAddresses: true,
        urls: true,
      },
    });

    const list: DeviceContactCandidate[] = (result.contacts || [])
      .map((c, index): DeviceContactCandidate | null => {
        const displayName =
          c.name?.display ||
          [c.name?.given, c.name?.family].filter(Boolean).join(" ").trim() ||
          "";

        if (!displayName && (!c.phones || c.phones.length === 0)) {
          return null;
        }

        const phones: ContactPhone[] = (c.phones || [])
          .filter((p) => Boolean(p.number?.trim()))
          .map((p) => ({
            label: p.type || "mobile",
            value: p.number?.trim() || "",
          }));

        const emails: ContactEmail[] = (c.emails || [])
          .filter((e) => Boolean(e.address?.trim()))
          .map((e) => ({
            label: e.type || "work",
            value: e.address?.trim() || "",
          }));

        const addresses: ContactAddress[] = (c.postalAddresses || [])
          .filter((a: any) => Boolean(a.formatted || a.street || a.city))
          .map((a: any) => ({
            label: a.type || "home",
            street: a.street || a.formatted || undefined,
            city: a.city || undefined,
            state: a.region || undefined,
            postal_code: a.postcode || undefined,
            country: a.country || undefined,
          }));

        const websites: ContactWebsite[] = (c.urls || [])
          .filter((u: any) => typeof u === "string" ? Boolean(u.trim()) : Boolean(u?.url?.trim()))
          .map((u: any) => ({
            label: (typeof u === "object" && u?.type) ? u.type : "website",
            url: typeof u === "string" ? u.trim() : (u?.url?.trim() || ""),
          }));

        return {
          id: c.contactId || `device-contact-${index}-${Date.now()}`,
          display_name: displayName || (phones[0]?.value ?? "Unnamed Contact"),
          first_name: c.name?.given || undefined,
          last_name: c.name?.family || undefined,
          company: c.organization?.company || undefined,
          job_title: c.organization?.jobTitle || undefined,
          phones,
          emails,
          addresses,
          websites,
        };
      })
      .filter((item): item is DeviceContactCandidate => item !== null);

    return { contacts: list };
  } catch (err) {
    return {
      contacts: [],
      error: err instanceof Error ? err.message : "Failed to load device contacts",
    };
  }
}
