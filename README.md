# TaskTracker — Level-Precedence Organization Task Management

A fast, lightweight, and 100% free-tier compatible Task Tracker web application built with **Next.js (App Router)**, **MongoDB Atlas**, and **Tailwind CSS**, designed for deployment on **Vercel**.

---

## Key Features

1. **Root Administrator**:
   - The Admin is the top authority and alone can create organization accounts and configure numeric levels.
2. **Numeric Level-Based Precedence**:
   - Every member has a numeric `level` (e.g., Admin = 100, Manager = 50, Lead = 30, Junior = 10).
   - **Precedence Rule**: Any person with $\text{level}(A) > \text{level}(B)$ can assign tasks to person $B$.
   - Any person can assign tasks to themselves.
   - Peers ($\text{level}(A) = \text{level}(B)$) and superiors ($\text{level}(A) < \text{level}(B)$) cannot be assigned tasks by $A$.
3. **Dual Dashboards**:
   - **Admin View (`/admin`)**: Create accounts, manage precedence levels, and oversee company members.
   - **Task View (`/tasks`)**: Track work assigned to yourself and to subordinates ($\text{level} < \text{your level}$), with priority tags, status updates, and dynamic assignees.
4. **Security & Zero Key Exposure**:
   - MongoDB connection strings and JWT secrets run exclusively inside serverless API routes on Vercel.
   - Browser client bundles never touch or receive database credentials.

---

## 24/7 Free-Tier Setup (MongoDB Atlas & Vercel)

### Step 1: Free MongoDB Atlas Database (Takes 2 mins)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and register a free account.
2. Click **Create a Deployment** and select the **M0 (Free)** tier (Free forever, 512 MB storage, no credit card required).
3. Under **Security Quickstart**:
   - Create a database user (e.g. username `taskadmin` and a password).
   - Under **Network Access**, click **Allow Access from Anywhere** (`0.0.0.0/0`) so Vercel serverless functions can connect.
4. Click **Connect** &rarr; **Drivers** &rarr; copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/tasktracker?retryWrites=true&w=majority
   ```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local` and paste your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/tasktracker?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_32_characters_minimum
ADMIN_EMAIL=admin@tasktracker.local
ADMIN_PASSWORD=AdminPassword123!
ADMIN_NAME=Root Administrator
ADMIN_LEVEL=100
```

### Step 3: Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). On first launch, you'll see a button to initialize the Root Admin account.

---

## Deploy to Vercel (100% Free & Always Online)

### Method A: Deploy via GitHub (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of TaskTracker"
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"** &rarr; Import your GitHub repo.
3. Under **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: Any random string (e.g. `c7a4e9b1d6f345892...`).
   - `ADMIN_EMAIL`: `admin@yourdomain.com` (or your preferred admin email).
   - `ADMIN_PASSWORD`: Your chosen admin password.
   - `ADMIN_NAME`: `Root Administrator`.
   - `ADMIN_LEVEL`: `100`.
4. Click **Deploy**. Vercel will build and deploy the app with 24/7 uptime and zero server-sleeping delays!

### Method B: Deploy via Vercel CLI
```bash
npx vercel
```
Follow the interactive prompts to link and deploy.

---

## Verifying Precedence Rules
Run the built-in unit tests to verify the level-based authorization logic:
```bash
npm test
```
