# 👻 Ghost GPT

A production-ready Telegram AI bot platform designed specifically for **Render Web Service**.

Ghost GPT behaves as **one intelligent AI assistant**. It automatically decides whether to use long-term memory, web search, news search, or just AI, without exposing any internal tools to normal users.

## Architecture
Telegram User
↓
Ghost GPT User Bot
↓
Render Web Service
↓
AI Router
↓
Memory / Web / News / AI
↓
Final Answer
↓
Telegram User

Admin users connect through a completely separate admin bot.

## Features

- Two Telegram bots: **User Bot** and **Admin Bot**
- Automatic tool routing (memory, web search, news search, AI)
- Long-term memory via Mem0
- Web search via Tavily
- News search via NewsData
- Configurable AI provider via environment variables
- MongoDB for users, conversations, settings, usage, logs
- Admin bot with statistics, user management, system prompt management, broadcast, maintenance mode
- Webhook mode for Render
- Graceful shutdown, rate limiting, webhook security
- No user-facing tool buttons

## Prerequisites

### 1. GitHub Repository

Upload this project to GitHub.

### 2. Telegram Bots

Create two bots using [@BotFather](https://t.me/BotFather):

- **User Bot**: send `/newbot` and name it `Ghost GPT`
- **Admin Bot**: send `/newbot` and name it `Ghost GPT Admin`

Copy both bot tokens.

### 3. MongoDB

Create a free MongoDB Atlas cluster:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database
3. Create a database user
4. Whitelist `0.0.0.0/0` for Render
5. Copy the connection string

### 4. API Keys

- **Mem0 API Key**: https://app.mem0.ai/
- **Tavily API Key**: https://tavily.com/
- **NewsData API Key**: https://newsdata.io/
- **AI API Key**: OpenAI, Groq, or any OpenAI-compatible provider

### 5. Render Deployment

1. Create a [Render account](https://render.com/)
2. Click **New Web Service**
3. Connect your GitHub repository
4. Select **Node** environment
5. Build command: `npm install`
6. Start command: `npm start`
7. Add all environment variables from `.env.example`
8. Set health check path to `/health`
9. Deploy

After deployment, copy your Render service URL (e.g. `https://your-service.onrender.com`) and set it as `BASE_URL`. Then redeploy or restart.

### 6. Configure Telegram Webhooks

The application automatically sets webhooks on startup using `BASE_URL`.

Example webhook URLs:
https://your-service.onrender.com/telegram/webhook/user
https://your-service.onrender.com/telegram/webhook/admin

No manual action is required if `BASE_URL` is set correctly.

## Environment Variables

See `.env.example` for all required and optional variables.

```env
NODE_ENV=production
PORT=10000
BASE_URL=https://your-service.onrender.com
USER_BOT_TOKEN=
ADMIN_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
ADMIN_IDS=12345678,87654321
MONGO_URI=
MEM0_API_KEY=
AI_API_KEY=
AI_MODEL=gpt-4o-mini
TAVILY_API_KEY=
NEWSDATA_API_KEY=
JWT_SECRET=
ENCRYPTION_KEY=
MAX_HISTORY_MESSAGES=12
RATE_LIMIT=20

---

## Final Notes

The code is ready to be pushed to GitHub and connected to Render. After adding all environment variables and deploying, the application will automatically:

1. Connect to MongoDB with retry logic
2. Set Telegram webhooks for both bots
3. Start the Express server on Render's assigned port
4. Process user messages through the automatic AI tool router
5. Provide a fully isolated admin experience

No localhost, Docker, VPS, or Android server assumptions exist. The public identity is only **Ghost GPT**.
