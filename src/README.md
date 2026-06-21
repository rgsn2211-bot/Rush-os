# Source layout — how Rush OS is organized

Rush OS uses a layered structure. If you know MVC, this maps cleanly onto it.
The golden rule: **business logic lives in `services/`, never in screens or API routes.**

```
A request flows DOWNWARD through these layers:

  app/ (route + UI)  ->  validators/ (check input)  ->  services/ (business rules)  ->  repositories/ (database)
        VIEW                  VALIDATION                     CONTROLLER/MODEL                  DATA ACCESS
```

| Folder          | MVC role                   | What goes here                                                                                                                          | What must NOT go here                           |
| --------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `app/`          | View + Controller (routes) | Screens (server/client components) and API route handlers. Routes are _thin_: validate input, call a service, return the result.        | Business calculations, direct database queries. |
| `components/`   | View                       | Reusable, presentational UI (buttons, tables, cards). Driven entirely by props.                                                         | Data fetching, business rules.                  |
| `features/`     | View                       | UI composed for a specific business area (e.g. `pos-import/`, `inventory/`).                                                            | Database access.                                |
| `services/`     | Controller + Model logic   | **All business rules**: costing, inventory usage, POS cleaning, settlements, alerts. Pure-ish, testable, no UI.                         | Rendering, reading `cookies`/`request`.         |
| `repositories/` | Data access                | The only place that talks to the database. One module per table/aggregate.                                                              | Business rules.                                 |
| `lib/`          | Shared utilities           | `supabase/` clients, `parsers/` (XLSX), `validators/` (Zod schemas), `calculations/` (pure math: currency, costing, restock), `env.ts`. | Feature-specific logic.                         |
| `types/`        | Model                      | TypeScript types. `database.ts` is generated from the DB schema — do not edit by hand.                                                  | —                                               |
| `hooks/`        | View                       | React hooks for the client.                                                                                                             | Server-only code.                               |

## Why this matters

- **Testable:** services and `lib/calculations` are plain functions — you can test costing
  or POS cleaning without a browser or a database.
- **Swappable:** if we ever leave Supabase, only `repositories/` and `lib/supabase/` change.
- **Inspectable by AI:** every rule is a named file in Git, not hidden in a dashboard.
- **Secure:** permission boundaries are enforced in the database (RLS) and re-checked in
  services — not just hidden in the UI.
