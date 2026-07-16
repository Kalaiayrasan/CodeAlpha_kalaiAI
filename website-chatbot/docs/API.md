# API Documentation — Kalai AI Chatbot

**Base URL**: `http://localhost:5000/api`

---

## Authentication

All admin endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### Health Check

#### `GET /api/health`

**Response** `200 OK`
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "development",
  "services": {
    "mongodb": "connected",
    "vectorDB": "connected",
    "llmProvider": "openai"
  }
}
```

---

### Auth

#### `POST /api/auth/login`

**Body**
```json
{
  "email": "admin@kalairestaurant.com",
  "password": "Admin@123456"
}
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "username": "admin",
      "email": "admin@kalairestaurant.com",
      "role": "superadmin"
    }
  }
}
```

#### `POST /api/auth/register`

Creates first admin (or new admin if called by superadmin).

**Body**
```json
{
  "username": "admin",
  "email": "admin@kalairestaurant.com",
  "password": "Admin@123456"
}
```

#### `GET /api/auth/profile` 🔒

Returns current user profile.

#### `PUT /api/auth/change-password` 🔒

**Body**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456"
}
```

---

### Chat

#### `POST /api/chat/session`

Creates a new chat session.

**Response** `201 Created`
```json
{
  "success": true,
  "data": {
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### `POST /api/chat/message`

Send a message and get an AI response.

**Rate Limit**: 20 requests per minute per IP

**Body**
```json
{
  "message": "What are your opening hours?",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

`sessionId` is optional — a new session is created automatically if omitted.

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "response": "We're open Monday–Thursday 11AM–10PM, Friday–Saturday 11AM–11PM, and Sunday 12PM–9PM. We're closed on major holidays. 🍽️",
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tokensUsed": 142,
    "latencyMs": 1234
  }
}
```

#### `GET /api/chat/history/:sessionId`

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "sessionId": "a1b2c3d4-...",
    "messages": [
      { "role": "user", "content": "Hello", "timestamp": "2024-01-15T10:30:00.000Z" },
      { "role": "assistant", "content": "Hi! How can I help?", "timestamp": "2024-01-15T10:30:01.000Z" }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### `DELETE /api/chat/session/:sessionId`

Clears all messages in a session.

---

### Admin (🔒 All endpoints require JWT)

#### `POST /api/admin/upload`

Upload documents to the knowledge base.

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `files` — File(s) to upload (PDF, DOCX, TXT, CSV; max 10MB each, max 10 files)

**Response** `200 OK`
```json
{
  "success": true,
  "message": "2 file(s) uploaded and being processed",
  "data": [
    { "id": "...", "originalName": "menu.pdf", "type": "pdf", "status": "processing" },
    { "id": "...", "originalName": "faqs.csv", "type": "csv", "status": "processing" }
  ]
}
```

#### `POST /api/admin/reindex`

Re-processes all indexed documents and rebuilds the vector store.

#### `GET /api/admin/documents`

List all uploaded documents.

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "filename": "uuid-menu.pdf",
      "originalName": "menu.pdf",
      "type": "pdf",
      "chunksCount": 45,
      "status": "indexed",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### `DELETE /api/admin/documents/:id`

Delete a document from the knowledge base.

#### `GET /api/admin/logs?page=1&limit=20`

Paginated chat logs.

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "...",
        "sessionId": "a1b2c3d4-...",
        "userMessage": "What time do you open?",
        "botResponse": "We're open Mon-Thu 11AM-10PM...",
        "tokensUsed": 142,
        "latencyMs": 890,
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "pages": 8
    }
  }
}
```

#### `GET /api/admin/analytics`

Dashboard analytics.

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalChats": 1523,
    "avgLatency": 1245,
    "totalTokens": 234567,
    "docsCount": 12,
    "dailyChats": [
      { "date": "2024-01-09", "count": 45 },
      { "date": "2024-01-10", "count": 67 }
    ],
    "topIntents": [
      { "intent": "menu", "count": 345 },
      { "intent": "hours", "count": 234 }
    ]
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Descriptive error message",
  "errors": [] // Optional - validation errors
}
```

**Common Status Codes**:
| Code | Meaning |
|------|---------|
| 400  | Bad Request (validation failed) |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (insufficient role) |
| 404  | Not Found |
| 422  | Validation Error |
| 429  | Rate Limit Exceeded |
| 500  | Internal Server Error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Global   | 100 requests / 15 minutes |
| Chat     | 20 requests / minute per IP |
