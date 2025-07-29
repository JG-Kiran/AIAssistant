# MyStorage AI Sales Support Portal

A modern, AI-powered customer support and sales portal for MyStorage agents, featuring an Intercom-style interface, deep Zoho Desk integration, and Google Gemini AI for response suggestions. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

---

## 🚀 Features

- **Unified Inbox & Ticketing**: View, search, and filter tickets synced in real-time from Zoho Desk via webhooks.
- **Multi-Channel Support**: Handle tickets from Email, Facebook, Instagram, Web, WhatsApp, Zalo, and more.
- **Chat-Style Ticket View**: Modern chat UI for each ticket, with clear agent/customer separation and date grouping.
- **AI Response Suggestions**: Google Gemini suggests professional replies to potential customers tailored to MyStorage's brand and context.
- **Custom AI Prompts**: Agents can write custom instructions to the AI for highly tailored responses.
- **Send Replies to Zoho Desk**: Agents can review, edit, and send responses directly to Zoho Desk from the portal.
- **Profile & Session Management**: Secure login via Supabase (email/magic link/password) or Zoho Desk OAuth, with agent profile sync.
- **Real-Time Updates**: Tickets and messages update live via Supabase Realtime.
- **Product Knowledge & Objection Handling**: AI is trained on MyStorage's unique value, pricing, and objection handling scripts.

---

## 🏗️ Architecture & Main Files

```
/app
  /dashboard           # Main dashboard (inbox, chat, AI panel)
    DashboardClient.tsx
    ai-instructions/   # (WIP) Custom AI prompt builder
  /components
    TicketList.tsx     # Sidebar: ticket list, search, filter
    CustomerChat.tsx   # Main chat window for ticket
    AIResponsePanel.tsx# AI suggestions, custom prompt input
    ProfileBar.tsx     # Agent profile, logout, etc.
    TopNavBar.tsx      # App navigation
  /lib
    supabase.ts        # Supabase client, helpers
    gemini.ts          # Google Gemini API integration
    trainprompt.ts     # AI training prompt (MyStorage brand, product, tone)
    insights.ts        # Customer service best practices
    markdowns/         # Product, pricing, objection handling, etc.
  /api
    /zoho/send-reply/  # Send replies to Zoho Desk
    /webhooks/zoho/    # Receive ticket/message webhooks from Zoho Desk
    /auth/zoho/        # Zoho Desk OAuth login & callback
  /login/              # Login page (email, password, magic link, Zoho)
  /stores/             # Zustand stores for session, realtime data
  /globals.css         # Tailwind CSS
```

---

## 🔑 Authentication

- **Supabase Auth**: Email/password, magic link, and session management.
- **Zoho Desk OAuth**: Agents can log in with their Zoho Desk account. On first login, their profile is synced to Supabase.
- **Session Sync**: Agent profile, roles, and Zoho tokens are kept in sync for seamless API access.

---

## 🤖 AI Integration (Google Gemini)

- **Contextual Suggestions**: AI receives the full ticket history, MyStorage's brand prompt, and customer service guidelines.
- **Custom Prompts**: Agents can add instructions for the AI to generate highly specific replies.
- **Knowledge Base**: AI is trained on:
  - MyStorage product/brand advantages
  - Pricing, size visualization, and product comparisons
  - Objection handling scripts
  - Customer service best practices
- **No Hallucinations**: AI is instructed not to invent services, offers, or use unsupported formatting.

---

## 🔗 Zoho Desk Integration

- **Ticket & Message Sync**: Webhooks from Zoho Desk keep tickets and threads up-to-date in Supabase.
- **Send Replies**: Agents can send responses directly to Zoho Desk from the portal (with channel and recipient auto-selected).
- **Token Refresh**: Zoho OAuth tokens are refreshed automatically for seamless API access.

---

## 🛠 Setup & Deployment

1. **Create a Supabase project**
   - Add tables: `tickets`, `threads`, `agents`, `AI_chat_history`, etc.
   - Enable Supabase Auth (email/magic link/password)
2. **Configure Environment Variables**

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
   ZOHO_CLIENT_ID=your-zoho-client-id
   ZOHO_CLIENT_SECRET=your-zoho-client-secret
   ZOHO_REDIRECT_URI=https://your-app-url/api/auth/zoho/callback
   ZOHO_DEPARTMENT_ID=your-zoho-department-id
   SUPABASE_JWT_SECRET=your-supabase-jwt-secret
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Run the development server**
   ```bash
   npm run dev
   ```
5. **Set up Zoho Desk Webhooks**
   - Point Zoho Desk ticket and thread webhooks to `/api/webhooks/zoho/` on your deployment.

---

## 🚀 Deployment with Vercel

This project is optimized for deployment on Vercel, the platform built by the creators of Next.js.

**Push to a Git Repository:** Push your project to a GitHub, GitLab, or Bitbucket repository.

**Import Project on Vercel:**

- Log in to your Vercel account and click "Add New... > Project".
- Select your Git repository. Vercel will automatically detect that it's a Next.js project.

**Configure Environment Variables:**

- In your Vercel project settings, navigate to the "Environment Variables" section.
- Add all the variables from your .env.local file. This is a critical step for the application to connect to Supabase, Zoho, and Gemini in production.

**Deploy:**

- Click the "Deploy" button. Vercel will build and deploy your application.
- Future pushes to your main branch will automatically trigger new deployments.

**Set up Zoho Desk Webhooks:**

- Once deployed, take your production URL (e.g., https://your-app.vercel.app) and point your Zoho Desk ticket and thread webhooks to `/api/webhooks/zoho/`.

---

## 📚 AI Configuration & Product Knowledge

- **AI knowledge base** is in `/app/lib/markdowns/` (product, pricing, comparisons, objection handling, etc.).
- **Update these files** to change what the AI knows and how it responds.
- **AI System Prompt** is configured in `app/api/system-prompt/route.ts` defines the personality of the AI used and can be edited directly via the frontend UI (code for frontend at `app/dashboard/ai-instructions/page.tsx`)
- **Custom Request** can be prompted by users to the AI to handle their specific queries besides generating customer responses. Provided to the model during POST request in `/app/components/AIResponsePanel.tsx` as an input (customPrompt).
- **Existing Conversation with Customer** is also given to the model as an input (h2hConversation) during POST request similar to the custom request.
- **Final AI Configuration** is in `/app/api/copilot/route.ts`. This organises all the above information needed by the AI for it to efficiently search through them. This file also sets the model of the LLM used (currently gemini-2.5-flash)

---

## 📝 Customization & Extending

- Add new channels or ticket fields by updating the Supabase schema and Zustand stores.
- Extend AI capabilities by editing the training prompt and knowledge files.
- Add new integrations (e.g., WhatsApp, Zalo) by adding API endpoints and updating the UI.

---

## 📞 Contact & Support

- **MyStorage**: [www.mystorage.vn](https://www.mystorage.vn)
- **Email**: hello@mystorage.vn
- **Phone**: 028 7770 0117

---

