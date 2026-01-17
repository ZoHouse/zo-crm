"""
Smart CRM Sales Agent - Voice AI Assistant
Based on: https://inference-docs.cerebras.ai/cookbook/agents/sales-agent-cerebras-livekit

Powered by Cerebras (LLaMA 3.3 70B), Cartesia (TTS/STT), and LiveKit
"""

import os
import logging
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
    print("⚠️ Supabase not installed. Install with: pip install supabase")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crm-agent")

# Environment variables
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
Total Contacts: {total_contacts:,}
Top Companies: {', '.join(companies[:10])}
Relationship Stages: {', '.join([f'{k}: {v}' for k, v in stages.items()])}

You can search for contacts using the search_contact function.
You can get contact counts using the get_contact_count function.
You can look up company contacts using the get_company_contacts function.
"""
        logger.info(f"📊 Loaded CRM context: {total_contacts} contacts")
        return context
        
    except Exception as e:
        logger.error(f"Failed to load CRM context: {e}")
        return "CRM data temporarily unavailable."


# Load context once at startup
CRM_CONTEXT = load_crm_context()


class SalesAgent(Agent):
    """Main Sales Agent - handles general inquiries and CRM lookups."""
    
    def __init__(self):
        # Initialize components (Cerebras cookbook pattern)
        llm = openai.LLM.with_cerebras(model="llama-3.3-70b")
        stt = cartesia.STT()
        tts = cartesia.TTS()
        vad = silero.VAD.load()
        
        instructions = f"""
        You are Aria, a sales agent for Smart CRM communicating by voice. All text that you return
        will be spoken aloud, so don't use things like bullets, slashes, or any
        other non-pronouncable punctuation.

        {CRM_CONTEXT}

        CRITICAL RULES:
        - ONLY use information from searches or the context above
        - If asked about a specific contact, use the search_contact function
        - DO NOT make up contact details, emails, or phone numbers
        - Keep responses brief and conversational
        - Be helpful and professional

        You can transfer to specialists:
        - Use switch_to_technical for technical product questions
        - Use switch_to_pricing for pricing and budget discussions
        """
        
        super().__init__(
            instructions=instructions,
            stt=stt, llm=llm, tts=tts, vad=vad
        )
    
    async def on_enter(self):
        """Greet user when they join."""
        print("Current Agent: 🏷️ Sales Agent (Aria) 🏷️")
        self.session.generate_reply(
            user_input="Give a short, 1 sentence greeting. Introduce yourself as Aria and offer to help."
        )
    
    @function_tool
    async def search_contact(self, query: str, search_type: str = "name") -> str:
        """
        Search for a contact in the CRM.
        
        Args:
            query: The search term (name, email, or company name)
            search_type: Type of search - "name", "email", or "company"
        """
        if not supabase:
            return "CRM database is not connected."
        
        try:
            if search_type == "email":
                result = supabase.table("contacts").select(
                    "name, email, company, phone, relationship_stage"
                ).ilike("email", f"%{query}%").limit(5).execute()
            elif search_type == "company":
                result = supabase.table("contacts").select(
                    "name, email, company, phone, relationship_stage"
                ).ilike("company", f"%{query}%").limit(10).execute()
            else:
                result = supabase.table("contacts").select(
                    "name, email, company, phone, relationship_stage"
                ).ilike("name", f"%{query}%").limit(5).execute()
            
            contacts = result.data
            if not contacts:
                return f"No contacts found matching '{query}'."
            
            if len(contacts) == 1:
                c = contacts[0]
                return f"Found {c['name']} from {c.get('company', 'unknown company')}. Email: {c.get('email', 'not available')}. Status: {c.get('relationship_stage', 'lead')}."
            else:
                names = [c['name'] for c in contacts[:5]]
                return f"Found {len(contacts)} contacts: {', '.join(names)}."
                
        except Exception as e:
            return f"Search error: {str(e)}"
    
    @function_tool
    async def get_contact_count(self, stage: str = None) -> str:
        """Get count of contacts, optionally filtered by stage."""
        if not supabase:
            return "CRM database is not connected."
        
        try:
            query = supabase.table("contacts").select("*", count="exact")
            if stage:
                query = query.eq("relationship_stage", stage)
            result = query.execute()
            count = result.count or 0
            
            if stage:
                return f"There are {count:,} {stage} contacts."
            return f"There are {count:,} total contacts in the CRM."
        except Exception as e:
            return f"Error: {str(e)}"
    
    @function_tool
    async def get_company_contacts(self, company: str) -> str:
        """Get all contacts from a specific company."""
        if not supabase:
            return "CRM database is not connected."
        
        try:
            result = supabase.table("contacts").select(
                "name, email, relationship_stage"
            ).ilike("company", f"%{company}%").limit(20).execute()
            
            if not result.data:
                return f"No contacts found at {company}."
            
            names = [c['name'] for c in result.data]
            return f"Found {len(result.data)} contacts at {company}: {', '.join(names[:10])}"
        except Exception as e:
            return f"Error: {str(e)}"
    
    @function_tool
    async def switch_to_technical(self):
        """Switch to technical specialist for product questions."""
        await self.session.generate_reply(
            user_input="Confirm you are transferring to technical support"
        )
        return TechnicalAgent()
    
    @function_tool
    async def switch_to_pricing(self):
        """Switch to pricing specialist for budget discussions."""
        await self.session.generate_reply(
            user_input="Confirm you are transferring to a pricing specialist"
        )
        return PricingAgent()


class TechnicalAgent(Agent):
    """Technical Specialist - handles product and technical questions."""
    
    def __init__(self):
        llm = openai.LLM.with_cerebras(model="llama-3.3-70b")
        stt = cartesia.STT()
        tts = cartesia.TTS(voice="bf0a246a-8642-498a-9950-80c35e9276b5")  # Different voice
        vad = silero.VAD.load()
        
        instructions = f"""
        You are a technical specialist communicating by voice. All text that you return
        will be spoken aloud, so don't use things like bullets, slashes, or any
        other non-pronouncable punctuation.

        You specialize in technical details about the CRM system:
        - Contact management and data organization
        - Integration capabilities (Luma events, CSV imports)
        - API features and customization options
        - Data security and privacy

        {CRM_CONTEXT}

        CRITICAL RULES:
        - Focus on technical accuracy
        - Explain concepts clearly for non-technical users
        - Keep responses conversational

        You can transfer:
        - Use switch_to_sales to return to sales
        - Use switch_to_pricing for pricing questions
        """
        
        super().__init__(
            instructions=instructions,
            stt=stt, llm=llm, tts=tts, vad=vad
        )
    
    async def on_enter(self):
        print("Current Agent: 💻 Technical Specialist 💻")
        await self.session.say(
            "Hi, I'm the technical specialist. I can help you with detailed technical questions about the CRM."
        )
    
    @function_tool
    async def switch_to_sales(self):
        """Switch back to sales representative."""
        await self.session.generate_reply(
            user_input="Confirm you are transferring to the sales team"
        )
        return SalesAgent()
    
    @function_tool
    async def switch_to_pricing(self):
        """Switch to pricing specialist."""
        await self.session.generate_reply(
            user_input="Confirm you are transferring to pricing"
        )
        return PricingAgent()


class PricingAgent(Agent):
    """Pricing Specialist - handles pricing and budget discussions."""
    
    def __init__(self):
        llm = openai.LLM.with_cerebras(model="llama-3.3-70b")
        stt = cartesia.STT()
        tts = cartesia.TTS(voice="4df027cb-2920-4a1f-8c34-f21529d5c3fe")  # Different voice
        vad = silero.VAD.load()
        
        instructions = f"""
        You are a pricing specialist communicating by voice. All text that you return
        will be spoken aloud, so don't use things like bullets, slashes, or any
        other non-pronouncable punctuation.

        You specialize in pricing, budgets, and value discussions:
        - Smart CRM is currently free for early adopters
        - Future plans may include premium tiers
        - Focus on ROI and value proposition

        {CRM_CONTEXT}

        CRITICAL RULES:
        - Be transparent about pricing
        - Focus on value proposition
        - Help customers understand options

        You can transfer:
        - Use switch_to_sales to return to sales
        - Use switch_to_technical for technical questions
        """
        
        super().__init__(
            instructions=instructions,
            stt=stt, llm=llm, tts=tts, vad=vad
        )
    
    async def on_enter(self):
        print("Current Agent: 💰 Pricing Specialist 💰")
        await self.session.say(
            "Hello, I'm the pricing specialist. I can help you understand our pricing and find the best value."
        )
    
    @function_tool
    async def switch_to_sales(self):
        """Switch back to sales representative."""
        await self.session.generate_reply(
            user_input="Confirm you are transferring to sales"
        )
        return SalesAgent()
    
    @function_tool
    async def switch_to_technical(self):
        """Switch to technical specialist."""
        await self.session.generate_reply(
            user_input="Confirm you are transferring to technical support"
        )
        return TechnicalAgent()


async def entrypoint(ctx: JobContext):
    """Main entry point - starts with Sales Agent."""
    logger.info(f"🚀 Agent job started: {ctx.job.id}")
    
    await ctx.connect()
    logger.info(f"📡 Connected to room: {ctx.room.name}")
    
    session = AgentSession()
    
    # Start with sales agent (can transfer to others)
    await session.start(
        agent=SalesAgent(),
        room=ctx.room,
    )
    
    logger.info("✅ Agent session started")


if __name__ == "__main__":
    # Validate environment
    required = ["CEREBRAS_API_KEY", "CARTESIA_API_KEY"]
    missing = [k for k in required if not os.environ.get(k)]
    
    if missing:
        print(f"❌ Missing: {', '.join(missing)}")
        print("\nRequired:")
        print("  LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET")
        print("  CEREBRAS_API_KEY, CARTESIA_API_KEY")
        print("\nOptional:")
        print("  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
        exit(1)
    
    print("🎤 Starting Smart CRM Multi-Agent System...")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nAgents available:")
    print("  🏷️ Sales Agent (Aria) - main contact")
    print("  💻 Technical Specialist")
    print("  💰 Pricing Specialist")
    
    agents.cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
