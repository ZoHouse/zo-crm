# Smart CRM Sales Agent

Voice-powered AI sales assistant using Cerebras (LLaMA 3.3 70B), Cartesia (TTS/STT), and LiveKit.

## Features

- 🎤 Real-time voice conversations
- 🔍 CRM contact lookup by name, email, or company
- 📊 Contact statistics and relationship stages
- 🚀 Ultra-fast responses via Cerebras inference

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
export LIVEKIT_URL=wss://samurai-l8v345nb.livekit.cloud
export LIVEKIT_API_KEY=APINYGvPDgve8sd
export LIVEKIT_API_SECRET=Myr0Ux3hufoVPoyFwFZbi6j8DQUrPXx0SZcsggYOMKI
export CEREBRAS_API_KEY=csk-rhk2m5kp3tm4md63ttfk9mf8vt8c9et32ftr65jmeftf868y
export CARTESIA_API_KEY=sk_car_U3GcMUYwqMvEfyH7DdahU1

# Optional: Supabase for CRM data
export SUPABASE_URL=https://yzvawdpzmidbmimyalkd.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Run the Agent

```bash
python main.py start
```

The agent will connect to LiveKit and wait for users to join rooms.

## Deploy to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repo or push this folder
3. Add the environment variables above
4. Deploy!

Railway will automatically detect the `Procfile` and start the agent.

## Deploy to Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set LIVEKIT_URL=wss://samurai-l8v345nb.livekit.cloud
fly secrets set LIVEKIT_API_KEY=APINYGvPDgve8sd
fly secrets set LIVEKIT_API_SECRET=Myr0Ux3hufoVPoyFwFZbi6j8DQUrPXx0SZcsggYOMKI
fly secrets set CEREBRAS_API_KEY=csk-rhk2m5kp3tm4md63ttfk9mf8vt8c9et32ftr65jmeftf868y
fly secrets set CARTESIA_API_KEY=sk_car_U3GcMUYwqMvEfyH7DdahU1

# Deploy
fly deploy
```

## Agent Capabilities

The agent can:

- **Search contacts**: "Find John Smith" or "Look up contacts at Google"
- **Get statistics**: "How many leads do we have?" or "Count VIP contacts"
- **Company lookup**: "Who do we know at Microsoft?"

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   LiveKit   │────▶│   Agent     │
│  (Your CRM) │◀────│   Cloud     │◀────│  (Python)   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Cerebras   │     │  Supabase   │
                    │   (LLM)     │     │   (CRM DB)  │
                    └─────────────┘     └─────────────┘
```
