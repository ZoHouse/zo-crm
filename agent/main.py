"""
Smart CRM Sales Agent - Voice AI Assistant
Powered by Cerebras (LLaMA 3.3 70B), Cartesia (TTS/STT), and LiveKit

This agent connects to LiveKit rooms and provides voice-based CRM assistance.
It can look up contacts, provide information, and help with sales queries.
"""

import os
import logging
import asyncio
from typing import Optional
from datetime import datetime

from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, function_tool
from livekit.plugins import openai, silero, cartesia

# Optional: Supabase for CRM data
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("⚠️ Supabase not installed. CRM lookups will be limited.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crm-agent")

# Environment variables
CEREBRAS_API_KEY = os.environ.get("CEREBRAS_API_KEY")
CARTESIA_API_KEY = os.environ.get("CARTESIA_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL"))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_KEY"))

# Initialize Supabase client
supabase: Optional[Client] = None
if SUPABASE_AVAILABLE and SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase connected")
    except Exception as e:
        logger.warning(f"⚠️ Supabase connection failed: {e}")


def load_crm_context() -> str:
    """Load CRM context from Supabase for the agent."""
    if not supabase:
        return "CRM database not connected. I can still help with general sales questions."
    
    try:
        # Get contact statistics
        contacts_result = supabase.table("contacts").select("*", count="exact").execute()
        total_contacts = contacts_result.count or 0
        
        # Get top companies
        companies_result = supabase.table("contacts").select("company").not_.is_("company", "null").limit(100).execute()
        companies = list(set([c["company"] for c in companies_result.data if c.get("company")]))[:20]
        
        # Get stage breakdown
        stages_result = supabase.table("contacts").select("relationship_stage").execute()
        stages = {}
        for c in stages_result.data:
            stage = c.get("relationship_stage", "lead")
            stages[stage] = stages.get(stage, 0) + 1
        
        context = f"""
CRM DATABASE CONTEXT:
- Total Contacts: {total_contacts:,}
- Top Companies: {', '.join(companies[:10])}
- Relationship Stages: {', '.join([f'{k}: {v}' for k, v in stages.items()])}

You have access to search for specific contacts by name, email, or company using the search_contact function.
"""
        logger.info(f"📊 Loaded CRM context: {total_contacts} contacts")
        return context
        
    except Exception as e:
        logger.error(f"Failed to load CRM context: {e}")
        return "CRM data temporarily unavailable."


class SalesAgent(Agent):
    """AI Sales Agent with CRM integration."""
    
    def __init__(self):
        # Load CRM context
        crm_context = load_crm_context()
        
        # Initialize LLM (Cerebras with LLaMA 3.3 70B)
        llm = openai.LLM.with_cerebras(model="llama-3.3-70b")
        
        # Initialize Speech-to-Text and Text-to-Speech (Cartesia)
        stt = cartesia.STT()
        tts = cartesia.TTS(
            voice="79a125e8-cd45-4c13-8a67-188112f4dd22",  # Professional female voice
        )
        
        # Voice Activity Detection
        vad = silero.VAD.load()
        
        # System instructions
        instructions = f"""
You are Aria, a professional AI sales assistant for Smart CRM. You communicate by voice, 
so all your responses will be spoken aloud. Keep responses natural and conversational.

PERSONALITY:
- Friendly and professional
- Helpful and knowledgeable about the CRM
- Concise - avoid long monologues
- Ask clarifying questions when needed

{crm_context}

CAPABILITIES:
1. Look up contacts by name, email, or company
2. Provide information about leads and relationships
3. Help with sales strategy and follow-ups
4. Answer questions about the CRM data

IMPORTANT RULES:
- Never make up contact information - only use data from searches
- If you don't find a contact, say so honestly
- Keep responses brief and spoken-friendly (no bullets, lists, or special characters)
- Pronounce numbers and dates naturally

When the user asks about a specific contact or company, use the search_contact function to look them up.
"""
        
        super().__init__(
            instructions=instructions,
            stt=stt,
            llm=llm,
            tts=tts,
            vad=vad,
        )
        
        logger.info("🤖 Sales Agent initialized")
    
    async def on_enter(self):
        """Called when agent enters the room."""
        logger.info("👋 Agent entering room")
        await self.session.generate_reply(
            user_input="Greet the user briefly. Introduce yourself as Aria and ask how you can help them today."
        )
    
    @function_tool
    async def search_contact(
        self, 
        query: str, 
        search_type: str = "name"
    ) -> str:
        """
        Search for a contact in the CRM.
        
        Args:
            query: The search term (name, email, or company name)
            search_type: Type of search - "name", "email", or "company"
        
        Returns:
            Information about matching contacts
        """
        if not supabase:
            return "CRM database is not connected. Unable to search contacts."
        
        try:
            # Build query based on search type
            if search_type == "email":
                result = supabase.table("contacts").select(
                    "name, email, company, phone, relationship_stage, notes"
                ).ilike("email", f"%{query}%").limit(5).execute()
            elif search_type == "company":
                result = supabase.table("contacts").select(
                    "name, email, company, phone, relationship_stage, notes"
                ).ilike("company", f"%{query}%").limit(10).execute()
            else:  # name search
                result = supabase.table("contacts").select(
                    "name, email, company, phone, relationship_stage, notes"
                ).ilike("name", f"%{query}%").limit(5).execute()
            
            contacts = result.data
            
            if not contacts:
                return f"No contacts found matching '{query}' in {search_type} field."
            
            # Format results for voice
            if len(contacts) == 1:
                c = contacts[0]
                response = f"Found {c['name']}"
                if c.get('company'):
                    response += f" from {c['company']}"
                if c.get('email'):
                    response += f". Email: {c['email']}"
                if c.get('phone'):
                    response += f". Phone: {c['phone']}"
                if c.get('relationship_stage'):
                    response += f". Status: {c['relationship_stage']}"
                if c.get('notes'):
                    response += f". Notes: {c['notes'][:100]}"
                return response
            else:
                names = [c['name'] for c in contacts[:5]]
                return f"Found {len(contacts)} contacts: {', '.join(names)}. Would you like details on any of them?"
                
        except Exception as e:
            logger.error(f"Search error: {e}")
            return f"Error searching contacts: {str(e)}"
    
    @function_tool
    async def get_contact_count(self, stage: str = None) -> str:
        """
        Get the count of contacts, optionally filtered by relationship stage.
        
        Args:
            stage: Optional filter - "lead", "engaged", "partner", or "vip"
        
        Returns:
            Count of contacts
        """
        if not supabase:
            return "CRM database is not connected."
        
        try:
            query = supabase.table("contacts").select("*", count="exact")
            if stage:
                query = query.eq("relationship_stage", stage)
            result = query.execute()
            
            count = result.count or 0
            if stage:
                return f"There are {count:,} contacts with {stage} status."
            return f"There are {count:,} total contacts in the CRM."
            
        except Exception as e:
            logger.error(f"Count error: {e}")
            return "Error counting contacts."
    
    @function_tool
    async def get_company_contacts(self, company: str) -> str:
        """
        Get all contacts from a specific company.
        
        Args:
            company: Company name to search for
        
        Returns:
            List of contacts at that company
        """
        if not supabase:
            return "CRM database is not connected."
        
        try:
            result = supabase.table("contacts").select(
                "name, email, relationship_stage"
            ).ilike("company", f"%{company}%").limit(20).execute()
            
            contacts = result.data
            
            if not contacts:
                return f"No contacts found at {company}."
            
            names = [f"{c['name']} ({c.get('relationship_stage', 'lead')})" for c in contacts]
            return f"Found {len(contacts)} contacts at {company}: {', '.join(names[:10])}"
            
        except Exception as e:
            logger.error(f"Company search error: {e}")
            return f"Error searching company: {str(e)}"


async def entrypoint(ctx: JobContext):
    """Main entry point for the agent."""
    logger.info(f"🚀 Agent job started: {ctx.job.id}")
    
    # Connect to the room
    await ctx.connect()
    logger.info(f"📡 Connected to room: {ctx.room.name}")
    
    # Create and start the agent
    agent = SalesAgent()
    session = AgentSession()
    
    await session.start(
        agent=agent,
        room=ctx.room,
    )
    
    logger.info("✅ Agent session started")


if __name__ == "__main__":
    # Validate required environment variables
    missing = []
    if not CEREBRAS_API_KEY:
        missing.append("CEREBRAS_API_KEY")
    if not CARTESIA_API_KEY:
        missing.append("CARTESIA_API_KEY")
    
    if missing:
        print(f"❌ Missing required environment variables: {', '.join(missing)}")
        print("\nRequired variables:")
        print("  LIVEKIT_URL - Your LiveKit server URL")
        print("  LIVEKIT_API_KEY - LiveKit API key")
        print("  LIVEKIT_API_SECRET - LiveKit API secret")
        print("  CEREBRAS_API_KEY - Cerebras API key")
        print("  CARTESIA_API_KEY - Cartesia API key")
        print("\nOptional (for CRM lookups):")
        print("  SUPABASE_URL - Supabase project URL")
        print("  SUPABASE_SERVICE_ROLE_KEY - Supabase service role key")
        exit(1)
    
    print("🎤 Starting Smart CRM Sales Agent...")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run the agent worker
    agents.cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            # Auto-subscribe to rooms matching this pattern
            # agent_name="smart-crm-agent",
        )
    )
