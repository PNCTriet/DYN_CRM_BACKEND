import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';

/** Capability check: resource.action — unknown/missing ⇒ deny */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
