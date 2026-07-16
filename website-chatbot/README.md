# 🤖 Kalai AI Chatbot — Production-Ready RAG Chatbot

A full-stack, production-ready AI-powered chatbot using **Retrieval-Augmented Generation (RAG)**. Built for Kalai Restaurant but easily configurable for any business.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20OpenAI%20%7C%20ChromaDB%20%7C%20MongoDB-7C3AED?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🧠 **RAG Architecture** | Retrieves relevant context before generating answers |
| 🗄️ **Vector Database** | ChromaDB (local) or Pinecone (cloud) |
| 🤖 **Multi-LLM Support** | OpenAI GPT-4, Google Gemini, switchable via env var |
| 💬 **Multi-Turn Memory** | Conversation history stored in MongoDB sessions |
| 📁 **Document Upload** | PDF, DOCX, TXT, CSV — auto-chunked & indexed |
| 🎨 **Premium UI** | Dark mode, glassmorphism, Framer Motion animations |
| 📊 **Admin Dashboard** | Analytics, chat logs, document manager |
| 🔒 **Secure API** | JWT auth, rate limiting, input validation, CORS |
| 📦 **Embeddable Widget** | One `<script>` tag for any website |
| 🐳 **Docker Support** | Full docker-compose for all services |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- ChromaDB (Docker recommended)
- OpenAI API key

### 1. Clone & Install

```bash
git clone <your-repo>
cd website-chatbot
npm run install:all
```

### 2. Configure Environment

```bash
# Copy and edit environment file
cp .env.example server/.env
```

Fill in at minimum:
```env
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb://localhost:27017/chatbot_db
JWT_SECRET=your-long-random-secret-here
```

### 3. Start ChromaDB (Docker)

```bash
docker run -d -p 8000:8000 chromadb/chroma
```

Or run everything with Docker Compose:
```bash
npm run docker:up
```

### 4. Create Admin & Seed Knowledge Base

```bash
cd server
npm run create-admin    # Creates admin user from .env credentials
npm run seed            # Indexes knowledge base into ChromaDB
```

### 5. Run Development Servers

```bash
# From root — starts both servers concurrently
npm run dev
```

- **Backend API**: http://localhost:5000
- **Frontend**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/admin

---

## 🏗️ Project Structure

```
website-chatbot/
├── client/                    # React 18 + TypeScript + Tailwind frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWidget/    # Floating chat button
│   │   │   ├── ChatWindow/    # Chat popup UI
│   │   │   ├── MessageBubble/ # Message rendering
│   │   │   ├── TypingIndicator/
│   │   │   └── AdminDashboard/
│   │   ├── pages/
│   │   │   ├── Home.tsx       # Landing page with embedded widget
│   │   │   └── Admin.tsx      # Admin panel
│   │   ├── hooks/
│   │   │   ├── useChat.ts     # Chat state & messaging
│   │   │   ├── useTheme.ts    # Dark/light toggle
│   │   │   └── useAdmin.ts    # Admin operations & auth
│   │   ├── services/api.ts    # Axios API client
│   │   └── types/index.ts     # TypeScript types
│   └── vite.config.ts
│
├── server/                    # Express.js backend
│   ├── controllers/           # Request handlers
│   ├── services/
│   │   ├── ragService.js      # Core RAG pipeline
│   │   ├── llmService.js      # OpenAI/Gemini abstraction
│   │   ├── embeddingService.js
│   │   └── vectorDBService.js
│   ├── embeddings/
│   │   └── documentProcessor.js  # PDF/DOCX/TXT/CSV parsing
│   ├── vectorDB/
│   │   └── chromaClient.js    # ChromaDB client
│   ├── models/                # Mongoose schemas
│   ├── middleware/            # Auth, rate limit, error handler
│   ├── routes/                # Express routes
│   └── scripts/               # Seed & admin setup scripts
│
├── knowledge-base/            # JSON data files (restaurant data)
│   ├── restaurant-faqs.json
│   ├── menu.json
│   └── policies.json
│
├── embed/                     # Standalone embed widget
│   ├── chatbot-widget.js      # Vanilla JS widget (no deps)
│   └── embed-example.html     # Demo embed page
│
├── tests/                     # Jest tests
├── docs/                      # API documentation
├── uploads/                   # Uploaded documents (gitignored)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔌 Website Embedding

### Option A: Vanilla JavaScript (recommended)

```html
<!-- Add before </body> on any page -->
<script>
  window.KalaiChat = {
    apiUrl: 'https://your-api.render.com',
    botName: 'Kalai Assistant',
    primaryColor: '#7C3AED',
    welcomeMessage: 'Hi! How can I help you today? 🍽️',
    position: 'bottom-right',
  };
</script>
<script src="https://your-cdn.com/chatbot-widget.js" async></script>
```

### Option B: React Component

```tsx
import ChatWidget from './components/ChatWidget/ChatWidget';

export default function YourPage() {
  return (
    <div>
      <YourContent />
      <ChatWidget />
    </div>
  );
}
```

---

## 🛠️ API Reference

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/session` | Create new session |
| `POST` | `/api/chat/message` | Send message, get AI response |
| `GET` | `/api/chat/history/:sessionId` | Get conversation history |
| `DELETE` | `/api/chat/session/:sessionId` | Clear session |

**Example — Send Message:**
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What are your opening hours?", "sessionId": "optional-session-id"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "We're open Monday–Thursday 11AM–10PM...",
    "sessionId": "uuid-here",
    "tokensUsed": 142,
    "latencyMs": 1234
  }
}
```

### Admin (requires JWT)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/upload` | Upload documents |
| `POST` | `/api/admin/reindex` | Re-index all documents |
| `GET` | `/api/admin/documents` | List all documents |
| `DELETE` | `/api/admin/documents/:id` | Delete document |
| `GET` | `/api/admin/logs` | Paginated chat logs |
| `GET` | `/api/admin/analytics` | Dashboard analytics |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Admin login |
| `GET` | `/api/health` | Health check |

---

## 🌿 Environment Variables

See [`.env.example`](.env.example) for full list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Min 32 chars random string |
| `LLM_PROVIDER` | ⚪ | `openai` (default) or `gemini` |
| `CHROMA_URL` | ⚪ | ChromaDB URL (default: `http://localhost:8000`) |
| `RESTAURANT_NAME` | ⚪ | Business name for bot persona |

---

## 🐳 Docker Deployment

```bash
# Start all services (MongoDB + ChromaDB + Server + Client)
docker-compose up -d

# View logs
docker-compose logs -f server

# Stop
docker-compose down
```

Services:
- **MongoDB**: `localhost:27017`
- **ChromaDB**: `localhost:8000`
- **API Server**: `localhost:5000`
- **Frontend**: `localhost:3000`

---

## ☁️ Cloud Deployment

### Backend — Render.com

1. Connect your GitHub repo
2. Set Build Command: `npm install`
3. Set Start Command: `node index.js`
4. Add all environment variables
5. Add a persistent disk for `/uploads`

### Frontend — Vercel

1. Connect GitHub repo
2. Set Root Directory: `client`
3. Set `VITE_API_URL` to your Render backend URL
4. Deploy

---

## 🧪 Testing

```bash
cd server
npm test                   # Run all tests with coverage
npm test -- --watch       # Watch mode
npm test -- ragService    # Run specific test file
```

---

## 🔄 Updating the Knowledge Base

1. **Via Admin Dashboard**: Upload PDF/DOCX/TXT/CSV → click "Re-index"
2. **Via JSON files**: Edit `knowledge-base/*.json` → run `npm run seed`
3. **Via API**: `POST /api/admin/upload` with `multipart/form-data`

---

## 🔒 Security

- JWT authentication on all admin routes
- Rate limiting: 100 req/15min global, 20 req/min for chat
- Helmet.js security headers
- Input validation with express-validator
- CORS whitelist via env var
- File upload type/size validation (PDF, DOCX, TXT, CSV; max 10MB)
- Environment variables for all secrets

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express.js |
| AI | OpenAI GPT-4o-mini, LangChain.js concept |
| Vector DB | ChromaDB (local) / Pinecone (cloud) |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| File Parsing | pdf-parse, mammoth, csv-parser |
| Containers | Docker, Docker Compose |
| Deployment | Vercel (frontend), Render (backend) |

---

## 📄 License

MIT © 2024 Kalai Restaurant
