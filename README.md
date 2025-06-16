# AI-Powered Sales Support Portal (Intercom-style UI)

This project is a customer support portal for sales agents, built with an Intercom-like interface. It integrates with **Zoho Desk**, uses **Google Gemini** for AI responses, and stores data in **Supabase**.

## 💻 Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS  
- **Backend & DB:** Supabase (PostgreSQL, Auth, Realtime)  
- **AI:** Google Gemini API  
- **External API:** Zoho Desk API  

---

## 📁 Project Structure

<pre>
/app
    /dashboard                  # Inbox and ticket list view
    /ticket/[id]                # Individual ticket chat view
    /components
        TicketList.tsx          # Sidebar showing tickets
        ChatView.tsx            # Main chat window
        AIResponsePanel.tsx     # Suggests AI-generated responses
        InfoSidebar.tsx         # Pricing, inventory, customer info
    /lib
        api.ts                  # Handles API calls to Zoho Desk, Gemini
        supabase.ts             # Supabase client config
        auth.ts                 # User auth sync with Zoho Desk
</pre>

---

## ✅ Features to Scaffold

### Core Pages & UI

- [ ] `dashboard` page with left sidebar (list of tickets)
- [ ] `ticket/[id]` page with:
  - Chat-style view of ticket messages
  - AI response suggestions
  - Editable input box for agents to review/edit/send response
  - Optional info panel for pricing/inventory/customer history

### Data Sync

- [ ] Poll or webhook integration for syncing tickets from Zoho Desk to Supabase
- [ ] Supabase stores:
  - Tickets & messages
  - Product catalog
  - Pricing and inventory
  - Customer data

### AI Integration

- [ ] When a ticket is opened:
  - Gather context (message, history, metadata)
  - Send to Gemini API
  - Display 1–3 suggested responses in UI

### Auth

- [ ] Basic auth via Supabase or token-based login
- [ ] Sync user roles from Zoho Desk (all users = agent role)

---

## 🛠 Setup Instructions

1. **Create a Supabase project**
   - Add tables: `tickets`, `messages`, `products`, `customers`, `pricing`, `inventory`
   - Enable Supabase Auth (email or magic link)

2. **Configure environment variables**

```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
GEMINI_API_KEY=your-gemini-key
ZOHO_DESK_API_KEY=your-zoho-desk-key
```

3. **Install dependencies**

```bash
npm install
```

4. **Run development server**

```bash
npm run dev
```

