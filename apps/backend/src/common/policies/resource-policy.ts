export type DataScope = 'OWN' | 'TEAM' | 'ALL' | 'ASSIGNED_CTV';

export abstract class ResourcePolicy<T> {
  abstract canView(userId: string, permissions: string[], record: T): boolean;
  abstract canUpdate(userId: string, permissions: string[], record: T): boolean;
  abstract listFilter(userId: string, permissions: string[]): { scope: DataScope; ownerId?: string };
}
