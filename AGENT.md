# Agent Guidelines for Receipts Project

## Commands
- **Run**: `bun run index.ts` or `bun index.ts`
- **Test**: `bun test` (creates `*.test.ts` files)
- **Build**: `bun build <file.ts>`
- **Install**: `bun install`
- **Hot reload**: `bun --hot ./index.ts`

## Runtime & APIs
- Use Bun instead of Node.js - prefer `bun:*` APIs over npm packages
- `Bun.serve()` for servers (supports WebSockets, routes)
- `bun:sqlite` for SQLite, `Bun.redis` for Redis, `Bun.sql` for Postgres
- `Bun.file()` for file operations, `Bun.$` for shell commands
- Built-in WebSocket support, no need for `ws` package

## Code Style
- TypeScript with strict mode enabled
- ES modules (`import`/`export`)
- Use `noUncheckedIndexedAccess` - handle potential undefined array/object access
- Prefer explicit types, avoid `any`
- JSX with `react-jsx` transform

## Testing
```ts
import { test, expect } from "bun:test";
test("description", () => { expect(actual).toBe(expected); });
```
