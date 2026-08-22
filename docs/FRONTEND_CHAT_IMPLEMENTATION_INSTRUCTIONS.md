# Frontend Chat Implementation Instructions

## Overview

The backend now exposes a simple chat/messaging API. This document describes how the frontend should consume it to build a **Messages** page with three modes:

- One-to-one (DIRECT)
- Project group (PROJECT)
- Broadcast (BROADCAST)

## Backend Configuration (Param)

Two new `param` entries control project group chat scope:

| Param key | Default | Meaning |
|---|---|---|
| `chatProjectGroupDefaultScope` | `LEADERSHIP` | Default audience for project group messages. `LEADERSHIP` = project leaders only. `ALL` = leaders + task owners + manpower. |
| `chatAllowProjectGroupScopeChoice` | `1` | If `1`/`true`, the sender can override the default per message. If `0`/`false`, the default is always used. |

The frontend does **not** need to manage these values directly, but it should read them from `/api/params` if you want to show/hide the scope toggle in the project chat UI.

## API Endpoints

All endpoints require authentication. The backend resolves the current user's staff identity from the JWT principal (via linked mobile number).

Base path: `/api/messages`

### 1. List conversation summaries

```http
GET /api/messages/conversations
```

Returns the latest message per conversation for the current staff. Useful for a left-hand conversation list.

Response: `List<MessageDto>`

### 2. Fetch direct message thread

```http
GET /api/messages/direct?staffId=<otherStaffId>
```

Returns all DIRECT messages between the current staff and the selected staff, oldest first.

### 3. Fetch project group messages

```http
GET /api/messages/project?projectCode=<projectCode>
```

Returns all PROJECT messages for a project the current staff is a member of, oldest first.

### 4. Fetch broadcast messages

```http
GET /api/messages/broadcast
```

Returns all BROADCAST messages, oldest first.

### 5. Unread count

```http
GET /api/messages/unread-count
```

Response: `{ "count": <number> }`

Use this for the header badge.

### 6. Send a message

```http
POST /api/messages
Content-Type: application/json
```

Request body (`SendMessageRequest`):

```json
{
  "recipientType": "DIRECT",
  "recipientStaffId": "ST-001",
  "content": "Hello"
}
```

Project group:

```json
{
  "recipientType": "PROJECT",
  "projectCode": "PRJ-001",
  "content": "Please prepare the site tomorrow",
  "projectGroupScope": "ALL"
}
```

Broadcast:

```json
{
  "recipientType": "BROADCAST",
  "content": "System maintenance at 6pm"
}
```

### 7. Mark as read

```http
PUT /api/messages/{messageId}/read
```

## MessageDto Fields

| Field | Meaning |
|---|---|
| `messageId` | Unique id |
| `senderStaffId` | Sender staff id (or `SYSTEM`) |
| `senderName` | Resolved staff name |
| `recipientType` | `DIRECT` / `PROJECT` / `BROADCAST` |
| `recipientStaffId` | For DIRECT |
| `recipientName` | For DIRECT |
| `projectCode` | For PROJECT |
| `content` | Message text |
| `source` | `USER` or `SYSTEM` |
| `category` | Optional system label |
| `referenceId` | Optional linked entity id |
| `createdAt` | ISO timestamp |
| `readByMe` | Whether current staff has read it |
| `projectGroupScope` | `LEADERSHIP` or `ALL` for PROJECT |

## Suggested UI Components

### 1. Header badge

Add a `Badge` around the chat icon in the top header bar. Poll `/api/messages/unread-count` every 15 seconds and on focus.

### 2. Messages page (`/messages`)

Layout: tabs for **Direct**, **Project**, **Broadcast**.

#### Direct tab

- Left panel: staff selector + recent direct conversations from `/api/messages/conversations` filtered by `recipientType === "DIRECT"`.
- Right panel: message thread + input.
- On selecting a staff, call `GET /api/messages/direct?staffId=<id>`.
- Send with `recipientType: "DIRECT"`.

#### Project tab

- Left panel: project selector.
- If `chatAllowProjectGroupScopeChoice` is enabled, show a checkbox/toggle: **"Include all project members"** (default off = leadership only).
- Right panel: message thread + input.
- Send with `recipientType: "PROJECT"` and `projectGroupScope: includeAll ? "ALL" : "LEADERSHIP"`.

#### Broadcast tab

- Simple feed of broadcast messages.
- Send UI only for users with sufficient privileges (e.g., `userLevel >= 5` or a specific menu role).
- Send with `recipientType: "BROADCAST"`.

### 3. Polling

Poll the currently active thread endpoint every 15 seconds. Also refresh `/api/messages/unread-count`.

## System Message Hook

BMP components can insert messages by calling the backend service directly. Example categories you may want to surface in the UI:

- `DO_CREATED` — when a delivery order is generated
- `PO_RECEIVED` — when a purchase order is received
- `TASK_ASSIGNED` — when staff is assigned to a task

The frontend only needs to render `source === "SYSTEM"` messages with a distinct style.

## i18n Keys (suggested)

```json
{
  "messages.title": "Messages",
  "messages.subtitle": "Communicate with staff",
  "messages.direct": "Direct",
  "messages.project": "Project",
  "messages.broadcast": "Broadcast",
  "messages.selectStaff": "Select staff",
  "messages.selectProject": "Select project",
  "messages.includeAllMembers": "Include all project members",
  "messages.typeMessage": "Type a message...",
  "messages.send": "Send",
  "messages.noMessages": "No messages",
  "messages.startConversation": "Start a conversation",
  "messages.system": "System",
  "messages.conversations": "Conversations"
}
```

## Notes

- Keep message rendering simple: bubble list, auto-scroll to bottom.
- Do not implement real-time WebSocket in this first version; polling is sufficient.
- Respect BMP UI standards: use `PageHeader`, `Box` without outer flex gap, MUI `List`, `Avatar`, etc.
