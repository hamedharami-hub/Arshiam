import { registerPlugin } from "@capacitor/core";

/** Single registration of the native "ArshnazWidget" plugin (registering twice logs a Capacitor warning). */
export const arshnazNativePlugin = registerPlugin<Record<string, (...args: any[]) => Promise<any>>>("ArshnazWidget");
