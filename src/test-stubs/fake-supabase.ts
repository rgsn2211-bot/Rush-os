/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A tiny in-memory stand-in for a Supabase PostgREST client — just enough of
 * the query builder (insert / select / update / delete with eq/neq/in/gt/gte/
 * lt/lte/not/order/single) to drive the services in unit tests. Tables (and
 * cost-free "views") are plain arrays seeded by the test.
 */

type Row = Record<string, any>;
type Filter = { kind: string; col: string; val: any };

class Builder implements PromiseLike<{ data: any; error: any }> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row[] = [];
  private patch: Row = {};
  private filters: Filter[] = [];
  private returning = false;
  private wantSingle = false;

  constructor(
    private store: Record<string, Row[]>,
    private table: string,
  ) {}

  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  select(_cols?: string) {
    this.returning = true;
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push({ kind: "eq", col, val });
    return this;
  }
  neq(col: string, val: any) {
    this.filters.push({ kind: "neq", col, val });
    return this;
  }
  in(col: string, val: any[]) {
    this.filters.push({ kind: "in", col, val });
    return this;
  }
  gt(col: string, val: any) {
    this.filters.push({ kind: "gt", col, val });
    return this;
  }
  gte(col: string, val: any) {
    this.filters.push({ kind: "gte", col, val });
    return this;
  }
  lt(col: string, val: any) {
    this.filters.push({ kind: "lt", col, val });
    return this;
  }
  lte(col: string, val: any) {
    this.filters.push({ kind: "lte", col, val });
    return this;
  }
  not(col: string, _op: string, val: any) {
    this.filters.push({ kind: "not_is", col, val });
    return this;
  }
  order(_col?: string, _opts?: any) {
    return this;
  }
  single() {
    this.wantSingle = true;
    return this;
  }

  private rows(): Row[] {
    return (this.store[this.table] ??= []);
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => {
      const v = row[f.col];
      switch (f.kind) {
        case "eq":
          return v === f.val;
        case "neq":
          return v !== f.val;
        case "in":
          return f.val.includes(v);
        case "gt":
          return v > f.val;
        case "gte":
          return v >= f.val;
        case "lt":
          return v < f.val;
        case "lte":
          return v <= f.val;
        case "not_is":
          return v !== f.val && v !== null && v !== undefined;
        default:
          return true;
      }
    });
  }

  private exec(): { data: any; error: any } {
    const rows = this.rows();
    if (this.op === "insert") {
      const inserted = this.payload.map((p) => ({
        id: p.id ?? crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...p,
      }));
      rows.push(...inserted);
      if (!this.returning) return { data: null, error: null };
      return this.wantSingle
        ? { data: clone(inserted[0]), error: null }
        : { data: clone(inserted), error: null };
    }
    if (this.op === "update") {
      for (const r of rows) if (this.matches(r)) Object.assign(r, this.patch);
      return { data: null, error: null };
    }
    if (this.op === "delete") {
      this.store[this.table] = rows.filter((r) => !this.matches(r));
      return { data: null, error: null };
    }
    // select
    const found = rows.filter((r) => this.matches(r));
    if (this.wantSingle) {
      if (found.length === 0) {
        return { data: null, error: { code: "PGRST116" } };
      }
      return { data: clone(found[0]), error: null };
    }
    return { data: clone(found), error: null };
  }

  then<T, R = never>(
    onF?: ((v: { data: any; error: any }) => T | PromiseLike<T>) | null,
    onR?: ((reason: any) => R | PromiseLike<R>) | null,
  ): Promise<T | R> {
    return Promise.resolve(this.exec()).then(onF, onR);
  }
}

function clone<T>(v: T): T {
  return v === null || v === undefined ? v : JSON.parse(JSON.stringify(v));
}

export interface FakeDb {
  from(table: string): Builder;
  tables: Record<string, Row[]>;
}

export function makeFakeDb(seed: Record<string, Row[]> = {}): FakeDb {
  const tables: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map((r) => ({ ...r }));
  return {
    tables,
    from(table: string) {
      return new Builder(tables, table);
    },
  };
}
