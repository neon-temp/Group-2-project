# Stash - Resource Library MVP
A lightweight web app to save, organize, and retrieve URLs + notes. Built as MVP Sprint.
## What It Does
Stash lets you:
1. **Save resources** - URLs with title + notes
2. **Organize** - Assign categories/tags to each resource  
3. **Search & Filter** - Find resources by title or filter by category
4. **Edit/Delete** - Update or remove saved resources
Think: "Pocket meets Notion" but focused on speed for MVP.
## Tech Stack
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Firebase Firestore for data + Auth
- **Auth**: Firebase Email and Password Auth 
- **Deploy**: Vercel/Netlify ready
## MVP Sprint Scope
### 1. Core Features
| Feature | Description | Status |
| --- | --- | --- |
| Save Resource | Add URL, title, notes, category, tags | ✅ Done |
| Categories | Create/manage categories for organization | ✅ Done |
| Tags | Add multiple tags per resource | ✅ Done |
| Search | Search by title or URL | ✅ Done |
| Filter | Filter by category | ✅ Done |
| CRUD | Create, Read, Update, Delete resources | ✅ Done |
### 2. User Flow
1. Open app → User signs in or signs up with email and password
2. Click "Add Resource" → Fill form → Save
3. View all resources in grid/list
4. Use search bar or category filter to find items
5. Click resource → Edit or Delete
### 3. Data Model - Firestore
## Setup & Run Locally
### 1. Prerequisites
- Node 18+
- Firebase project
### 2. Firebase Setup
1. Create project at console.firebase.google.com
2. Enable Authentication → Email and password sign-in
3. Enable Firestore Database → Start in test mode
4. Copy config and paste in `src/firebase.js`
### 3. Install & Run
```bash
git clone <repo-url>
cd stash
npm install
npm run dev
