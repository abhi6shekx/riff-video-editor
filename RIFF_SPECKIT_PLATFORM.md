# RIFF — Speckit Creator & Brand Marketplace Upgrade

> **Version**: 2.0 (Production Architecture)  
> **Target**: Real working social creator + brand campaign marketplace platform (similar to Speckit by MemeChat)  
> **Stack**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Start/Router, Supabase, PostgreSQL, Supabase Storage & Realtime.

---

## 📌 Summary of Major Changes (Kya Badla?)

Pehle yeh app ek **frontend-only prototype** tha jismein sabhi memes, campaigns, chats aur wallet balances browser ke `localStorage` / Zustand mein simulated the. Ab isko ek **real production-grade platform** bana diya gaya hai:

1. **Real Database Backend (PostgreSQL + Supabase)**
   - Hardcoded data hatakar 17+ tables ka relational schema implement kiya gaya hai.
   - Database hi ab single source of truth hai users, campaigns, submissions, wallets aur posts ke liye.

2. **Speckit-Style Brand Briefs Marketplace (`/briefs`)**
   - Brands live campaigns chala sakti hain (Memes, Instagram Reels, UGC).
   - Har campaign me fixed payout (`₹2,400 / drop`), total budget pool, slots tracker, Do's & Don'ts guidelines, aur mandatory tags hote hain.
   - Creators direct **Instagram Reel link** submit kar sakte hain ya **Studio se meme banakar drop** kar sakte hain.

3. **Anti-Fraud Review & Payout Lifecycle**
   - Creator submit karta hai toh status pehle `pending` rehta hai (instant auto-pay strictly disabled).
   - **Brand Dashboard (`/brand`)** par brand content aur Instagram link verify karke **Approve** ya **Reject** karta hai.
   - Approve hote hi creator ke wallet me paise credit hote hain aur double-entry ledger me entry hoti hai.

4. **Real Wallet & UPI/Bank Withdrawals (`/you`)**
   - **Available Balance**, **In Review (Pending)**, aur **Lifetime Earnings** ke real metrics.
   - **Withdrawal Modal**: Creator apne kamaye hue paise **UPI ID (VPA)** ya **Bank Account (A/C, IFSC, Holder Name)** par withdraw karne ki request bhej sakta hai (Min ₹100).

5. **Admin Treasury & Governance Console (`/admin`)**
   - Platform metrics (total submissions, pending withdrawals, payouts disbursed).
   - Withdrawal queue jahan admin UPI payouts verify karke "Mark Paid" kar sakta hai.
   - Global submissions review aur Content moderation.
   - **Role Simulator**: Bina logout kiye **Creator**, **Brand**, aur **Admin** roles live test karne ka switcher.

6. **Authentication & Roles (`/login`)**
   - Supabase Auth connect kiya gaya hai with **Creator** aur **Brand** role selection on signup.

7. **Notifications & Alerts (`/notifications`)**
   - Realtime alerts jab submission approve/reject ho, likes milein, ya wallet me paise aayein.

---

## 🗄️ Database Architecture (PostgreSQL)

All database definitions are saved in:
👉 [`migrations/0002_speckit_core.sql`](file:///Users/abhishekgawade/Downloads/XyXHP2eXGH6opzF5-grok-workspace/migrations/0002_speckit_core.sql)

### Core Tables & Structure:

| Table Name | Description | Key Columns |
|---|---|---|
| `profiles` | User profiles with roles & verification | `id`, `username`, `display_name`, `role` (`creator` \| `brand` \| `admin`), `instagram_handle`, `total_earnings` |
| `brands` | Brand accounts managing campaigns | `id`, `owner_id`, `company_name`, `logo_url`, `total_spend` |
| `campaigns` | Briefs created by brands | `id`, `brand_id`, `title`, `description`, `content_type` (`meme` \| `reel` \| `ugc`), `total_budget`, `reward_per_creator`, `maximum_creators`, `slots_taken`, `guidelines_do`, `guidelines_dont` |
| `campaign_submissions` | Creator entries waiting for review | `id`, `campaign_id`, `creator_id`, `content_url`, `external_url` (Instagram Reel), `status` (`pending` \| `approved` \| `rejected`), `payout_amount`, `review_note` |
| `wallets` | Real financial balances | `user_id`, `available_balance`, `pending_balance`, `lifetime_earnings`, `total_withdrawn` |
| `wallet_transactions` | Double-entry ledger logs | `id`, `user_id`, `type` (`campaign_reward` \| `withdrawal` \| `bonus`), `amount`, `status`, `description` |
| `withdrawals` | Payout requests to creators | `id`, `user_id`, `amount`, `payment_method` (`upi` \| `bank_transfer`), `payment_details` (VPA/IFSC), `status` (`pending` \| `completed` \| `rejected`) |
| `posts` | Meme feed entries | `id`, `user_id`, `media_url`, `top_caption`, `bottom_caption`, `likes_count`, `comments_count` |
| `post_likes` / `post_saves` | Social bookmarking & heat | `post_id`, `user_id`, `created_at` |
| `post_comments` | Discussion notes on memes | `id`, `post_id`, `user_id`, `content` |
| `communities` | Hub rooms (Menagerie, Pavilion, etc.) | `id`, `name`, `slug`, `members_count` |
| `community_members` | Hub memberships | `community_id`, `user_id` |
| `conversations` / `messages` | Chat threads with meme & audio boards | `id`, `conversation_id`, `sender_id`, `content`, `media_url`, `sound_id` |
| `notifications` | Activity stream | `id`, `user_id`, `type`, `title`, `message`, `is_read` |
| `reports` | Flagged content moderation queue | `id`, `reporter_id`, `target_type`, `target_id`, `reason`, `status` |

---

## 🛠️ Code Structure & Files Modified

```text
src/
├── components/
│   ├── app-frame.tsx           # Sidebar with live wallet widget & links to Brand/Admin portals
│   ├── meme-card.tsx           # Feed card supporting real Post types, likes, saves & reporting
│   └── onboarding.tsx          # First-time user welcome flow
├── lib/
│   ├── auth-context.tsx        # Supabase Auth provider with Creator/Brand/Admin roles
│   ├── database.types.ts       # Complete TypeScript schema matching PostgreSQL
│   ├── supabase.ts             # Supabase client with graceful unconfigured fallback & uploadMedia
│   ├── utils.ts                # Formatting helpers (INR currency, timeAgo, deadlineLeft)
│   └── services/
│       ├── campaigns.ts        # Campaign marketplace querying, creation & review logic
│       ├── posts.ts            # Algorithmic feed, likes, comments, reports
│       ├── social.ts           # Communities, chat messages & notifications
│       └── wallet.ts           # Balance queries, ledger transactions & UPI/Bank withdrawals
└── routes/
    ├── __root.tsx              # Root document wrapped in AuthProvider
    ├── index.tsx               # Algorithmic Feed (For You, Hot, New, Following)
    ├── briefs.tsx              # Brand Briefs Marketplace with filter & sort
    ├── briefs.$id.tsx          # Brief detail with Do's/Don'ts & Reel/Meme submission
    ├── brand.tsx               # Brand Dashboard (Campaign creation & review queue)
    ├── admin.tsx               # Admin Console (Treasury withdrawals & moderation)
    ├── you.tsx                 # Creator Profile, live wallet stats & UPI payout modal
    ├── notifications.tsx       # Realtime alerts for rewards and approvals
    ├── studio.tsx              # Meme canvas editor uploading directly to Storage & Posts
    ├── chat.tsx & chat.$id.tsx # Realtime chat rooms with meme/audio board
    ├── login.tsx               # Sign in / Register with Creator or Brand role selection
    └── m.$id.tsx               # Single post view with comments
```

---

## 🚀 How to Run & Configure

### 1. Connecting Your Live Supabase Backend
Create a `.env` file in the root directory (referencing `.env.example`):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
XAI_API_KEY=your-grok-or-openai-api-key # optional for AI captions
```
Once added, run the SQL script `migrations/0002_speckit_core.sql` in your Supabase SQL Editor.

*(Note: If no `.env` is configured, the app automatically runs in resilient fallback mode so all screens and flows work immediately without crashing.)*

### 2. Running Locally
```bash
# Start dev server on 0.0.0.0:8080
npm run dev

# Run TypeScript typecheck (0 errors)
npm run typecheck

# Build production bundle
npm run build
```

---

## ✅ Quality & Verification Status

- **Typecheck**: `npm run typecheck` passed with **0 errors**.
- **Production Build**: `npm run build` passed with **0 errors** (Nitro / Vercel ready).
- **SSR / Rendering**: All routes (`/`, `/briefs`, `/brand`, `/admin`, `/you`, `/notifications`, `/studio`, `/chat`, `/login`) verified with **HTTP 200**.
- **Browser QA**: Visual smoke test passed with 0 console errors, 0 page errors, and responsive layouts on desktop (1280×800) and mobile (390×844).
