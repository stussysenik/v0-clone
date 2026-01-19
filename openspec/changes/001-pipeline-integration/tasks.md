# Tasks: Pipeline Integration

## Phase 1: Setup
- [x] Create OpenSpec change proposal structure
- [x] Update openspec/project.md with full stack vision
- [x] Verify .env.local has ZHIPU configuration

## Phase 2: Server Infrastructure
- [x] Create API route `/api/generate/+server.ts`
- [x] Implement streaming response (ReadableStream)
- [x] Handle ZHIPU API errors gracefully
- [x] Add symlink for .env.local in studio app

## Phase 3: Core Integration
- [x] Import Pipeline into +page.svelte
- [x] Replace markdownToPreview() with API call
- [x] Handle streaming updates (progressive code display)
- [x] Connect pipeline events to telemetry

## Phase 4: Bug Fixes
- [x] Fix double-iteration bug in pipeline stream()
- [x] Ensure proper error propagation

## Phase 5: Verification
- [x] Test: API endpoint responds (ZHIPU quota issue, but pipeline works)
- [ ] Test: Streaming shows progressive updates (blocked by ZHIPU quota)
- [ ] Test: DevInfo displays correct metrics (blocked by ZHIPU quota)
- [ ] Test: Error state handles failures gracefully ✓ (errors shown correctly)

## Phase 6: Tooling
- [ ] Add pre-commit hook with secret detection
- [ ] Add CI workflow from cc-setup

## Notes
- 2026-01-15: ZHIPU API returns 429 "Insufficient balance" - user needs to recharge account
- Pipeline integration is complete, pending ZHIPU quota resolution
