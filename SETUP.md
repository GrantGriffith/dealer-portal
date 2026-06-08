# Griffith Sales Associates — Dealer Portal Setup Guide

This is a complete step-by-step guide to deploy your dealer portal. It should take about 30–45 minutes.

---

## What You Need First

- A free GitHub account: https://github.com
- A free Vercel account: https://vercel.com (sign up with your GitHub)

---

## Step 1 — Install Node.js (one-time)

Download and install Node.js from https://nodejs.org (choose the "LTS" version).

---

## Step 2 — Push the project to GitHub

1. Open **Terminal** (Mac) or **Command Prompt** (Windows)
2. Navigate to this folder:
   ```
   cd "/Users/gbrewer/Claude/Projects/Dealer Login Website"
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Initialize git and push to GitHub:
   ```
   git init
   git add .
   git commit -m "Initial dealer portal"
   ```
5. Go to https://github.com/new and create a **private** repository called `dealer-portal`
6. Copy the commands GitHub shows you (they'll look like):
   ```
   git remote add origin https://github.com/YOUR_USERNAME/dealer-portal.git
   git push -u origin main
   ```

---

## Step 3 — Deploy to Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New Project"**
3. Select your `dealer-portal` GitHub repository
4. Click **Deploy** (accept all defaults)
5. Wait for the build to finish (about 2 minutes)

---

## Step 4 — Add a Postgres Database

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database** → choose **Postgres**
3. Name it `dealer-portal-db`, accept defaults, click **Create**
4. Vercel will automatically add the database environment variables to your project

---

## Step 5 — Add Blob Storage (for logo/price list uploads)

1. Still in Vercel **Storage** tab, click **Create** → choose **Blob**
2. Name it `dealer-portal-files`, click **Create**
3. Vercel will automatically add `BLOB_READ_WRITE_TOKEN` to your project

---

## Step 6 — Set Environment Variables

In Vercel → your project → **Settings** → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | Any long random string (40+ characters) — e.g., type random keyboard mashing |
| `ADMIN_EMAIL` | `grant@griffithsales.com` |
| `ADMIN_PASSWORD` | Your chosen admin password (keep this safe) |
| `SETUP_SECRET` | Another random string you'll use once — e.g., `setup-abc123xyz` |
| `NEXT_PUBLIC_BASE_URL` | Your Vercel URL, e.g., `https://dealer-portal-xyz.vercel.app` |

After adding variables, click **Redeploy** (Deployments tab → the latest one → Redeploy).

---

## Step 7 — Initialize the Database

Open your browser and go to:
```
https://YOUR-VERCEL-URL/api/setup?secret=YOUR_SETUP_SECRET
```

Replace `YOUR-VERCEL-URL` with your actual Vercel URL and `YOUR_SETUP_SECRET` with the value you set.

You should see a JSON response like:
```json
{
  "success": true,
  "manufacturers_seeded": 47,
  "admin_email": "grant@griffithsales.com"
}
```

This creates all the database tables, seeds all 47 manufacturers from your line card, and creates your admin account.

---

## Step 8 — Log in to the Admin Panel

Go to: `https://YOUR-VERCEL-URL/admin`

Log in with:
- Email: `grant@griffithsales.com`
- Password: whatever you set as `ADMIN_PASSWORD`

---

## Step 9 — Import Your Contacts

1. In the Admin Panel, go to **Dealers** → **Import CSV**
2. Open your contacts CSV file in TextEdit/Notepad, select all, copy
3. Paste it into the CSV field
4. Set a default password (e.g., `GriffithDealer2024!`) — all imported contacts will use this
5. Click **Import**

All dealers will be imported as **inactive**. You'll activate them individually.

---

## Step 10 — Activate Dealers & Assign Manufacturers

For each dealer you want to give access:
1. Go to **Dealers**, find the dealer, click **Edit**
2. Check the box **"Account Active"**
3. Check the manufacturers they're authorized for
4. Click **Save Changes**

That dealer can now log in at `https://YOUR-VERCEL-URL` with their email and the default password.

---

## Ongoing Management

### Change a dealer's password
Admin Panel → Dealers → Edit → enter new password → Save

### Add a manufacturer logo
Admin Panel → Manufacturers → click **📷 Logo** next to the manufacturer → upload an image

### Upload a price list
Admin Panel → Manufacturers → click **📄 Price List** next to the manufacturer → upload PDF or Excel file

### Add a new dealer
Admin Panel → Dealers → **+ Add Dealer**

### Remove a dealer's access
Admin Panel → Dealers → Edit → uncheck **Account Active** (or delete them entirely)

---

## Getting Your Custom Domain (optional)

In Vercel → your project → **Settings** → **Domains**, add your domain (e.g., `dealers.griffithsales.com`).
You'll need to add a DNS record at your domain registrar — Vercel will show you exactly what to add.

---

## Support

For technical help: this site can be revised and improved in future sessions.
