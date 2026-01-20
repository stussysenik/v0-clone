# Proposal: Persistent Conversations & Generation History

## Summary

Enable persistent chat conversations and generation history that can be continued, restored, and extended. Fix the generation streaming bug that causes generations to appear "stuck." Make the UI more preview-centric like v0.dev and MagicPatterns.

## Problem Statement

### Current Issues

1. **Generation appears stuck**: The pipeline generator `return`s the final result instead of `yield`ing it, so the complete generation is never sent to the client. LM Studio logs show "Client disconnected. Stopping generation..." because the SSE connection closes before receiving the final result.

2. **Conversations are not continuable**: While individual messages and generations are saved to Chronicle (IndexedDB), there's no way to "continue" a previous conversation session. Each session starts fresh.

3. **Chat and generation history are disconnected**: Snapshots save generation artifacts but don't preserve the full conversation context (system messages, user messages, assistant responses).

4. **UI is chat-centric, not preview-centric**: Competitors like v0.dev and MagicPatterns put the preview front-and-center. Our current layout gives equal weight to chat and preview panels.

### User Request

> "make sure that you could always go back and extend the chats/conversations! right now i'm not sure if the chats are persistent + the generation are still showing... just like enable history that will save both chats + history and enable to use it/prototype it again!"

## Proposed Solution

### 1. Fix Generation Streaming (Critical)

**Location**: `packages/pipeline/src/stages/generate.ts:67-69`

The generator function currently does:
```typescript
return { code: finalCode, intent }  // Never received by client!
```

Change to:
```typescript
yield { type: 'complete', code: finalCode, intent }
```

Also add timeout handling to prevent indefinite hangs.

### 2. Conversation Sessions

Introduce a `ConversationSession` model that groups related messages and generations:

```typescript
interface ConversationSession {
  id: string
  projectId: string
  name: string
  messages: Message[]           // Full chat history
  generations: string[]         // Snapshot IDs
  createdAt: number
  updatedAt: number
  metadata: {
    lastPrompt: string
    lastIntent: Intent
    previewSnapshot?: string    // Current preview state
  }
}
```

### 3. Chronicle Schema Extension

Add `sessions` table to Dexie schema:

```typescript
sessions: '++id, projectId, updatedAt'
```

Operations:
- `createSession(projectId, name)` - Start new conversation
- `updateSession(id, messages, generations)` - Save conversation state
- `getSession(id)` - Load full conversation
- `listSessions(projectId)` - List all conversations for a project
- `continueSession(id)` - Resume a previous conversation

### 4. ChatPanel Persistence

On every message send/receive:
1. Save to current session via Chronicle
2. Link any generations to the session
3. Store preview state snapshot

On session restore:
1. Load all messages into chat state
2. Restore last generation to preview
3. Resume from where user left off

### 5. UI Layout Shift (Preview-Centric)

Rebalance the split-pane layout:
- Preview: 65% width (was ~50%)
- Chat: 35% width (was ~50%)
- Add quick-switch tabs for history/chat in narrow panel

### 6. Session Selector Component

Add a session picker in the header/sidebar:
- Shows recent sessions with preview thumbnails
- "Continue" button to resume
- "Fork" button to start new session from current state
- Search/filter by prompt text

## Technical Design

### Data Flow

```
User types prompt
       ↓
ChatPanel saves message to session
       ↓
Pipeline generates (with proper yield)
       ↓
Chunks streamed via SSE
       ↓
Final 'complete' event received
       ↓
Generation saved to snapshot + linked to session
       ↓
Preview renders
       ↓
Session updated with preview state
```

### Migration

Existing Chronicle data will be migrated:
- Orphan snapshots get a default session
- No data loss, backwards compatible

### Error Handling

- Add 30-second timeout on generation
- Show "Generation timed out" UI instead of hanging
- Auto-retry with exponential backoff option

## Acceptance Criteria

1. **Generation completes**: User sees final result, not infinite loading
2. **Sessions persist**: Close browser, reopen, see past sessions
3. **Continue works**: Click "Continue" on session, resume exact conversation
4. **History linked**: Each session shows its generations timeline
5. **Preview-centric**: Preview takes majority of viewport
6. **No data loss**: Existing snapshots/projects remain accessible

## Dependencies

- Chronicle (IndexedDB via Dexie) - existing
- SSE streaming - existing, needs fix
- PocketBase - optional cloud sync (future)

## Risks

1. **IndexedDB size limits**: Sessions with many messages could grow large
   - Mitigation: Paginate message history, lazy load older messages

2. **Migration complexity**: Existing data needs careful handling
   - Mitigation: Non-destructive migration, keep old tables

## Out of Scope

- Real-time collaboration (future phase)
- Cloud sync across devices (future phase)
- Export/import sessions (could be quick-win later)
