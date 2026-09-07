export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  status: string;
  permissions: string[];
  roleCodes: string[];
}
