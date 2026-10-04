import { useDeviceFormFactor } from "./useDeviceFormFactor";

export function useIsMobile() {
  const { isPhone } = useDeviceFormFactor();
  return isPhone;
}
