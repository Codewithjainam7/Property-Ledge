# Local Setup Instructions

Follow these steps to set up the project on your local machine.

## 1. Clone the repository
Open your terminal and clone the repository from GitHub:
```bash
git clone https://github.com/Codewithjainam7/Property-Ledge.git
cd Property-Ledge
```

## 2. Install dependencies
You need to install all the required Node packages (React, Vite, Supabase, etc.). Make sure you have [Node.js](https://nodejs.org/) installed, then run:
```bash
npm install
```

## 3. Set up Environment Variables
This project connects to a Supabase database and Mailtrap for emails. You need to configure the connection keys.

1. Create a new file in the root folder of the project (where `package.json` is located) and name it exactly **`.env`**
2. Open the `.env` file and paste the following configuration:

```env
VITE_SUPABASE_URL=https://qajdlvlwigjrdcnxejts.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamRsdmx3aWdqcmRjbnhlanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Nzk3MzQsImV4cCI6MjA5NjA1NTczNH0.FeseI553Cv79yggo_0Acz4sTYSFU3xChGXEtffePIAQ
MAILTRAP_API_TOKEN=6dbebbc0338570a50303a1f50d4ab328
MAILTRAP_SENDER_EMAIL=mailtrap@sandbox.api.mailtrap.io
```
*(Make sure not to name it `.env.txt`, it must be just `.env`)*

## 4. Run the development server
Start the local Vite development server by running:
```bash
npm run dev
```

Once the server starts, it will give you a local URL (e.g., `http://localhost:3001` or `http://localhost:5173`). Open that link in your browser to view the app!
