# Setting up the admin dashboard (one time, about 15 minutes, free)

You do this once. After that, the person running the charity only uses the Dashboard, no code.

## Step 1. Create the free database (Supabase)
1. Go to **supabase.com**, sign up, press **New project**. Name it `rock-childcare`, pick a strong database password, choose a region close to you, then **Create**. Wait about 2 minutes.
2. Left menu, **SQL Editor**, **New query**. Open `setup.sql` from this folder, copy everything, paste, press **Run**. It should say "Success".

## Step 2. Create the admin login
1. Left menu, **Authentication**, **Users**, **Add user**, **Create new user**. Enter the email and password the operator will use. Tick **Auto Confirm User**.
2. **Authentication**, **Sign In / Providers** (or Settings), turn **OFF** "Allow new users to sign up". This is important: it stops strangers from creating logins.

## Step 3. Connect the website
1. In Supabase: **Project Settings**, **API** (or "API Keys"). Copy the **Project URL** and the **anon / publishable key**.
2. Open `config.js` and paste them between the quotes. Save.
3. Upload `index.html`, `admin.html`, `cms.js`, `cms-defaults.js`, `config.js` to your website host, in the same place as your pictures.

## Step 4. First login
1. Open `yourwebsite/admin.html` and sign in.
2. In **Children**, **Gallery** and **Before & After**, press the **Import the current ...** button once in each, so the existing pictures become editable.
3. In **Campaign**, check the raised amount and goal, and press Save.

## Daily use (for the operator)
| I want to... | Go to |
|---|---|
| Change any words or swap any picture | Words & pictures, then **Open website in edit mode**, tap it, Publish |
| Update money raised | Campaign |
| Add or remove children / photos / before-after stories | Their tabs |
| See partners, donors, child requests | Sign-ups & messages (download as Excel too) |

## Good to know
- Partner, child-request and donation forms still open WhatsApp as before, and now also save to the dashboard.
- Donations are **pledges**: money still arrives by Wave, WorldRemit or MoneyGram. Mark them done once received.
- Editing words matches by the original text, so identical words in several places change together. Wording that the Dashboard controls (campaign amounts) is locked from tap-editing.
- Phone photos are shrunk automatically on upload. Free Supabase plan is plenty for this site (1 GB pictures).
- Back up: Supabase, **Database**, **Backups**, or download the sign-ups list from the Dashboard regularly.
