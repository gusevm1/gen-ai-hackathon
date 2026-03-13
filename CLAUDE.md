# HomeMatch — Project Instructions

## Infrastructure & Deployment

### EC2 Backend (FastAPI)
- **SSH**: `ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105`
- **Deploy** (after pushing backend changes to main):
  ```bash
  ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105 "cd gen-ai-hackathon && git pull && pkill -f uvicorn; cd backend && nohup /home/ubuntu/gen-ai-hackathon/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &"
  ```
- **Health check**: `ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105 "curl -s http://localhost:8000/health"`
- **View logs**: `ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105 "tail -50 /tmp/backend.log"`

### Supabase
- **Project ref**: `mlhtozdtiorkemamzjjc`
- **Deploy edge function**: `npx supabase functions deploy score-proxy --no-verify-jwt`
- **Inspect DB**: `npx supabase inspect db index-stats --linked`
- **List functions**: `npx supabase functions list --project-ref mlhtozdtiorkemamzjjc`
- **List secrets**: `npx supabase secrets list --project-ref mlhtozdtiorkemamzjjc`

### Web App (Next.js)
- Hosted on Vercel — auto-deploys on push to main

### Chrome Extension
- **Build**: `cd extension && npm run build` → output at `dist/chrome-mv3/`
- User must manually reload in `chrome://extensions` after rebuild

## Work Style
- Use all available CLIs (SSH, Supabase, AWS, gh) autonomously. Do not ask the user to run commands — execute them yourself.
