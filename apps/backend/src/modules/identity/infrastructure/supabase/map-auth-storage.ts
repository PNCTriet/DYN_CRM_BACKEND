/** In-memory Supabase auth storage (PKCE verifier) for Nest BFF OAuth. */
export class MapAuthStorage {
  constructor(private readonly map: Map<string, string> = new Map()) {}

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  toRecord(): Record<string, string> {
    return Object.fromEntries(this.map.entries());
  }

  static fromRecord(record: Record<string, string>): MapAuthStorage {
    return new MapAuthStorage(new Map(Object.entries(record ?? {})));
  }
}
