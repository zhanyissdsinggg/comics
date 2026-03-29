import {
  isAdminLegacyBearerEnabledConfig,
  isAdminTokenFallbackEnabledConfig,
} from "../../../common/config/app-config";

export function isAdminTokenFallbackEnabled(): boolean {
  return isAdminTokenFallbackEnabledConfig();
}

export function isAdminLegacyAdminKeyFallbackEnabled(): boolean {
  return isAdminLegacyBearerEnabledConfig();
}
