# Tasks: Persistent Conversations & Generation History

## Phase 1: Fix Generation Streaming (CRITICAL)

### Task 1.1: Fix Generator Return Value
**File**: `packages/pipeline/src/stages/generate.ts`
**Priority**: P0 (Blocker)

- [ ] Change `return { code, intent }` to `yield { type: 'complete', code, intent }`
- [ ] Update all callers to handle 'complete' event type
- [ ] Add TypeScript discriminated union for yield types

### Task 1.2: Add Timeout Handling
**File**: `packages/pipeline/src/stages/generate.ts`
**Priority**: P0

- [ ] Add 30-second timeout wrapper around LLM stream
- [ ] Yield `{ type: 'error', message: 'Generation timed out' }` on timeout
- [ ] Surface timeout error in ChatPanel UI

### Task 1.3: Update SSE Handler
**File**: `apps/studio/src/routes/api/generate/+server.ts`
**Priority**: P0

- [ ] Handle 'complete' event type from generator
- [ ] Send final SSE event with complete code
- [ ] Properly close connection after complete event

### Task 1.4: Update Client Consumer
**File**: `apps/studio/src/lib/ChatPanel.svelte`
**Priority**: P0

- [ ] Handle 'complete' SSE event
- [ ] Update preview with final code
- [ ] Clear loading state on complete/error

---

## Phase 2: Conversation Session Model

### Task 2.1: Define Session Types
**File**: `packages/shared/src/types.ts`
**Priority**: P1

- [ ] Add `ConversationSession` interface
- [ ] Add `Message` interface with role, content, timestamp
- [ ] Add `SessionMetadata` interface

### Task 2.2: Extend Chronicle Schema
**File**: `packages/shared/src/chronicle.ts`
**Priority**: P1

- [ ] Add `sessions` table to Dexie schema
- [ ] Define indexes: `projectId`, `updatedAt`
- [ ] Increment schema version, add migration

### Task 2.3: Implement Session Operations
**File**: `packages/shared/src/chronicle.ts`
**Priority**: P1

- [ ] `createSession(projectId, name): Promise<string>`
- [ ] `updateSession(id, data): Promise<void>`
- [ ] `getSession(id): Promise<ConversationSession | null>`
- [ ] `listSessions(projectId): Promise<ConversationSession[]>`
- [ ] `deleteSession(id): Promise<void>`

### Task 2.4: Add Session-Snapshot Linking
**File**: `packages/shared/src/chronicle.ts`
**Priority**: P1

- [ ] Add `sessionId` field to Snapshot interface
- [ ] Update `saveSnapshot` to accept optional sessionId
- [ ] Add `getSessionSnapshots(sessionId): Promise<Snapshot[]>`

---

## Phase 3: ChatPanel Persistence

### Task 3.1: Add Session State
**File**: `apps/studio/src/lib/ChatPanel.svelte`
**Priority**: P1

- [ ] Add `currentSessionId` state
- [ ] Add `isRestoringSession` state
- [ ] Load/create session on mount

### Task 3.2: Persist Messages
**File**: `apps/studio/src/lib/ChatPanel.svelte`
**Priority**: P1

- [ ] Save message to session on send
- [ ] Save assistant response to session on receive
- [ ] Debounce session updates (500ms)

### Task 3.3: Link Generations to Session
**File**: `apps/studio/src/lib/ChatPanel.svelte`
**Priority**: P1

- [ ] Pass sessionId to generation API
- [ ] Update session with new snapshotId on complete
- [ ] Store current preview snapshot in session metadata

### Task 3.4: Restore Session
**File**: `apps/studio/src/lib/ChatPanel.svelte`
**Priority**: P1

- [ ] Add `restoreSession(sessionId)` function
- [ ] Load messages into chat state
- [ ] Load last generation into preview
- [ ] Scroll chat to bottom after restore

---

## Phase 4: Session Selector UI

### Task 4.1: Create SessionList Component
**File**: `apps/studio/src/lib/SessionList.svelte`
**Priority**: P2

- [ ] List sessions with name, date, preview thumbnail
- [ ] "Continue" button on hover
- [ ] "Delete" button with confirmation
- [ ] Empty state with "Start new conversation"

### Task 4.2: Add Session Picker to Header
**File**: `apps/studio/src/routes/+page.svelte`
**Priority**: P2

- [ ] Add dropdown/modal trigger in header
- [ ] Show session name or "New Conversation"
- [ ] Quick switch between sessions

### Task 4.3: Session Rename
**File**: `apps/studio/src/lib/SessionList.svelte`
**Priority**: P3

- [ ] Inline edit on session name
- [ ] Auto-name from first prompt if unnamed
- [ ] Save on blur/enter

---

## Phase 5: UI Layout Improvements

### Task 5.1: Rebalance Split Pane
**File**: `apps/studio/src/routes/+page.svelte`
**Priority**: P2

- [ ] Change default split to 65/35 (preview/chat)
- [ ] Add min-width constraints to prevent crushing
- [ ] Persist user's resize preference to localStorage

### Task 5.2: Collapsible Chat Panel
**File**: `apps/studio/src/routes/+page.svelte`
**Priority**: P3

- [ ] Add collapse toggle button
- [ ] Animate panel collapse/expand
- [ ] Show floating chat button when collapsed

### Task 5.3: Preview-First Mobile Layout
**File**: `apps/studio/src/routes/+page.svelte`
**Priority**: P3

- [ ] Stack panels vertically on mobile
- [ ] Preview takes full height minus header
- [ ] Chat slides up from bottom as sheet

---

## Phase 6: Data Migration

### Task 6.1: Migrate Orphan Snapshots
**File**: `packages/shared/src/chronicle.ts`
**Priority**: P2

- [ ] On schema upgrade, find snapshots without sessionId
- [ ] Create default session per project
- [ ] Link orphan snapshots to default session

### Task 6.2: Handle Existing Projects
**File**: `packages/shared/src/chronicle.ts`
**Priority**: P2

- [ ] Existing projects get "Default Session"
- [ ] Preserve all snapshot data
- [ ] No data deletion during migration

---

## Testing Checklist

### Generation Flow
- [ ] Generation completes and shows in preview
- [ ] Timeout shows error after 30 seconds
- [ ] Chunk streaming works during generation
- [ ] "Stop" button cancels generation

### Session Persistence
- [ ] New session created on first prompt
- [ ] Messages persist after page refresh
- [ ] Session can be continued after browser close
- [ ] Multiple sessions per project work

### Session Restore
- [ ] "Continue" loads all messages
- [ ] Preview shows last generation
- [ ] Can send new messages after restore
- [ ] Chat scroll position is correct

### UI/UX
- [ ] Preview-centric layout renders correctly
- [ ] Session picker opens/closes
- [ ] Session list shows all sessions
- [ ] Delete session removes from list

---

## Completion Criteria

1. Run `bun run dev:studio`
2. Enter prompt "Create a SaaS landing page"
3. Generation completes (not stuck)
4. Close browser tab
5. Reopen `http://localhost:5200`
6. See previous session in list
7. Click "Continue"
8. See chat history and preview restored
9. Send follow-up message "Add a pricing section"
10. New generation appends to conversation
