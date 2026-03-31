import { SetMetadata } from "@nestjs/common";
import { AdminPermission } from "../permissions/admin-permissions";

export const ADMIN_PERMISSIONS_KEY = "admin_permissions";

export function RequireAdminPermissions(...permissions: AdminPermission[]) {
  return SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
}
