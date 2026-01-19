"""
Zo House Sales Agent - Voice AI Assistant
Based on: https://inference-docs.cerebras.ai/cookbook/agents/sales-agent-cerebras-livekit

Powered by Cerebras (LLaMA 3.3 70B), Cartesia (TTS/STT), and LiveKit
Updated with Zo House Complete Sales Bible
"""

import os
import logging
from typing import Optional
from datetime import datetime

from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, function_tool
from livekit.plugins import openai, silero, deepgram

# Optional: Supabase for CRM data
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None  # Placeholder for type hint
    print("⚠️ Supabase not installed. Install with: pip install supabase")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zo-house-agent")

# Environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL"))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_KEY"))

# Initialize Supabase client
supabase = None
if SUPABASE_AVAILABLE and SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase connected")
    except Exception as e:
        logger.warning(f"⚠️ Supabase connection failed: {e}")


# =============================================================================
# ZO HOUSE SALES BIBLE - COMPLETE KNOWLEDGE BASE
# =============================================================================

ZO_HOUSE_KNOWLEDGE = """
ZO HOUSE SALES KNOWLEDGE BASE:

WHAT IS ZO HOUSE:
Zo House is a clubhouse for human acceleration. It's where founders, builders, and creators come to level up. We're not a hostel or a coworking space - we're a community that accelerates your growth through proximity to other ambitious people building cool things.

THE THREE SACRED PILLARS:
1. Culture - rituals, values, weekly demo days, founder dinners, retrospectives
2. Vibes - carefully curated cohorts, selective admissions (800 apps for 12 spots)
3. Unit Economics - EBITDA-positive, 70/30 model (residency/short stays)

WHO ZO HOUSE IS FOR:
- Founders and Entrepreneurs building startups
- Builders and Developers creating products
- Creators and Artists (YouTube, podcasts, designers)
- Remote Workers with serious side projects
- Web3 Enthusiasts (crypto, NFT, DeFi builders)

IDEAL CUSTOMER:
- Has a clear project they're building
- Budget of 35-60k per month
- Values community over privacy
- Ready for 3 month commitment
- Seriousness score 8+ out of 10

RED FLAGS (NOT A GOOD FIT):
- Just wants cheap accommodation
- Can't afford 35k per month
- Looking for party hostel vibe
- Wants isolation or complete privacy
- No clear project or purpose
- Timeline is "someday" (6+ months out)

THE TWO LOCATIONS:

KORAMANGALA:
- 3-floor penthouse on 17th floor
- Urban, vibrant, central location
- Rooftop with city views, poker room
- Event capacity up to 100 people
- Best for: central location, nightlife access, budget-conscious, intimate events
- Address: Koramangala 1st Block, Bangalore
- Phone: +91 804 568 2223
- WhatsApp: +91 928 922 9822
- The Residency partnership (exclusive)
- EBITDA positive Q1

WHITEFIELD:
- 36,000 sq ft villa mansion
- Premium flagship experience
- Pool, pickleball court, sauna
- Near tech campuses (Amazon, Google, Microsoft)
- Event capacity 100+ people
- Best for: large events, corporate retreats, wellness-focused, premium experience
- Address: 406B, Outer Circle, Dodsworth Layout, Whitefield
- Phone: +91 804 588 8997

PRODUCTS AND PRICING:

RESIDENCY PROGRAM (3 months):
- Shared Room: 35,000 rupees per month (1,05,000 total)
- Private Room: 60,000 rupees per month (1,80,000 total)
- Includes: accommodation, 24/7 workspace, events, workshops, demo days, founder dinners, community of 12-20 curated builders

SHORT STAYS (1-7 nights):
- 5,000 to 7,000 rupees per night
- Includes: bed, WiFi, workspace, events access, community
- Check-in 1 PM, Check-out 10 AM

EVENT HOSTING:
Koramangala:
- Schelling Point: $60/hour (60 people)
- Multiverse: $60/hour (30 people)
- Full Venue: $100/hour (100 people)

Whitefield:
- Schelling Point: $90/hour (100 people)
- Degen Lounge: $60/hour (60 people)
- Full Venue: $120/hour (100+ people, includes pool)

WORKSPACE:
- Flo Zone day pass: 426 rupees
- Flo Zone weekly: 2,557 rupees
- Flo Zone monthly: 10,231 rupees
- Studio hourly: 1,023 rupees
- Studio full day: 5,627 rupees

KEY SELLING POINTS:
1. Community Accelerator: "You're not just getting a room - you're joining 12-20 people actively building things. People find co-founders, first customers, and investors."
2. All-in-One Value: "Most people spend 25-30k on rent plus 10-15k on coworking. That's 35-45k and you're alone. Here for 35k you get both plus community."
3. Proven Track Record: "800+ applications for 12 spots. This isn't a hostel - it's an elite cohort."
4. Focus Environment: "Everyone here is building something. Weekly demo days keep you accountable."

OBJECTION HANDLING:

"Too expensive":
Most people spend 25-30k on rent plus 10-15k on coworking. So you're already at 35-45k and you're alone. Here for 35k or 60k you get both plus community of builders. What's your current monthly burn on housing and workspace?

"Need to think about it":
Totally fair. What's your main question or concern? I can probably answer it now, or you can come check out the space at our next event.

"Not sure about 3 month commitment":
That's what creates tight community. People who commit build real relationships vs just passing through. You can try a short stay first - 5-7k per night to test the vibe.

"Can I get a discount":
Our pricing is tight - we're EBITDA positive. The only discount is Founder Member NFT which gets 10% off. Shared room at 35k is our most accessible option.

"Don't know anyone there":
That's why people come here - to meet people. We select for builders so you're pre-filtered. Come to a mixer first to see the community.

LEAD QUALIFICATION:
HOT LEAD (Schedule call):
- Budget confirmed (35k-60k no hesitation)
- Timeline within 1-2 months
- Clear project or purpose
- Ready for 3 month commitment
- Seriousness 8-10 out of 10

WARM LEAD (Nurture):
- Budget hesitant but interested
- Timeline 2-3 months
- Seriousness 5-7 out of 10
- Wants to visit first

COLD LEAD (Newsletter only):
- Can't afford even after explanation
- Timeline is "someday"
- Seriousness below 5 out of 10
- Just wants cheap accommodation

SUCCESS METRICS:
- 800+ applications for 12 residency spots
- EBITDA positive within Q1 at Koramangala
- 150+ person poker community with WSOP participants
- 120+ artists from 20-30 countries in Zo Studio network
- 20+ projects incubated
- Multiple co-founder matches within cohorts

ZO WORLD ECOSYSTEM:
- Zostel: 100+ properties, 1M+ users, $18M GBV
- $Zo Token: 283,881 holders on Base
- Founder NFT: $4.3M market cap, 10% discount on services
- Content reach: 1B+ monthly views

BOOKING LINKS:
- Koramangala: zostel.com/destination/bangalore/stay/zo-house-koramangala-bnghO812
- Whitefield: zostel.com/destination/bangalore/stay/zo-house-bangalore-whitefield-bngs531
- Events: lu.ma/blrxzo
"""


def load_crm_context() -> str:
    """Load CRM context from Supabase for the agent."""
    if not supabase:
        return "CRM database not connected. I can still help with Zo House sales questions."
    
    try:
        # Get contact statistics
        contacts_result = supabase.table("contacts").select("*", count="exact").execute()
        total_contacts = contacts_result.count or 0
        
        # Get top companies
        companies_result = supabase.table("contacts").select("company").not_.is_("company", "null").limit(100).execute()
        companies = list(set([c["company"] for c in companies_result.data if c.get("company")]))[:20]
        
        context = f"""
CRM DATABASE:
Total Contacts: {total_contacts:,}
Top Companies: {', '.join(companies[:10])}
"""
        logger.info(f"📊 Loaded CRM context: {total_contacts} contacts")
        return context
        
    except Exception as e:
        logger.error(f"Failed to load CRM context: {e}")
        return "CRM data temporarily unavailable."


# Load context once at startup
CRM_CONTEXT = load_crm_context()


class SalesAgent(Agent):
    """Aria - Main Zo House Sales Agent."""
    
    def __init__(self):
        llm = openai.LLM.with_cerebras(model="llama-3.3-70b")
        stt = deepgram.STT()  # Free tier: 200 hours
        tts = deepgram.TTS(model="aura-asteria-en")  # Deepgram Aura - female voice
        vad = silero.VAD.load()
        
        instructions = f"""
        You are Aria from Zo House Bangalore. You're on a voice call - be natural, conversational, like a real person.

        CRITICAL: ASK FIRST, TELL LATER
        - DO NOT info-dump or explain what Zo House is upfront
        - Your FIRST response should be a SHORT greeting and ONE question
        - Find out WHY they're calling before giving any information
        - Only share info that's relevant to what THEY asked about

        CONVERSATION FLOW:
        1. Greet briefly, ask what brings them here (one sentence max)
        2. Listen to their answer
        3. Ask a follow-up question to understand their situation better
        4. THEN share relevant info based on what they need
        5. Keep asking questions throughout - this is a conversation, not a pitch

        GOOD EXAMPLE:
        User: "Hi"
        You: "Hey! What brings you to Zo House today?"
        User: "Looking for a place to stay while I work on my startup"
        You: "Nice, what are you building?"
        [Then based on their answer, share relevant info about residency]

        BAD EXAMPLE:
        User: "Hi"  
        You: "Hey! Zo House is a clubhouse for human acceleration with residency programs, events, coworking..." [NO! Too much info upfront]

        {ZO_HOUSE_KNOWLEDGE}

        {CRM_CONTEXT}

        YOUR STYLE:
        - Short responses, like texting - not paragraphs
        - Ask questions, be curious about them
        - "What are you working on?", "Why now?", "What's your timeline?"
        - Only explain things they ask about
        - If they ask about pricing, give pricing. If they ask about location, talk location.
        - Match their energy and keep it flowing

        You can bring in specialists:
        - switch_to_technical for facility details
        - switch_to_pricing for detailed pricing discussions
        """
        
        super().__init__(
            instructions=instructions,
            stt=stt, llm=llm, tts=tts, vad=vad
        )
    
    async def on_enter(self):
        """Greet user when they join."""
        print("Current Agent: 🏠 Aria (Zo House Sales) 🏠")
        # Direct greeting - not generated, just spoken exactly as written
        await self.session.say("Hey, I'm Aria from Zo House! What brings you here today?")
    
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
    async def recommend_location(self, needs: str) -> str:
        """
        Recommend Koramangala or Whitefield based on needs.
        
        Args:
            needs: What the person is looking for (events, amenities, location preference)
        """
        needs_lower = needs.lower()
        
        whitefield_keywords = ["pool", "sauna", "pickleball", "large event", "corporate", "retreat", "premium", "spacious", "quiet", "tech hub", "wellness"]
        koramangala_keywords = ["central", "nightlife", "budget", "intimate", "poker", "residency", "the residency", "urban", "cafes"]
        
        whitefield_score = sum(1 for k in whitefield_keywords if k in needs_lower)
        koramangala_score = sum(1 for k in koramangala_keywords if k in needs_lower)
        
        if whitefield_score > koramangala_score:
            return "Based on what you're looking for, I'd recommend Whitefield. It's our premium flagship with 36,000 square feet, a pool, sauna, and pickleball court. Perfect for larger events and wellness-focused stays. It's near the tech hub where Amazon, Google, and Microsoft are located."
        else:
            return "Based on what you need, Koramangala would be perfect. It's our central location in the heart of Bangalore's most vibrant neighborhood. Walking distance to cafes, restaurants, and nightlife. Great for intimate events and the residency program. It also has our exclusive partnership with The Residency program."
    
    @function_tool
    async def qualify_lead(self, budget: str, timeline: str, project: str, seriousness: int) -> str:
        """
        Qualify a lead based on their responses.
        
        Args:
            budget: Their budget response
            timeline: When they want to start
            project: What they're building
            seriousness: Score from 1-10
        """
        score = 0
        reasons = []
        
        # Budget check
        budget_lower = budget.lower()
        if "35" in budget or "60" in budget or "yes" in budget_lower or "fine" in budget_lower or "ok" in budget_lower:
            score += 3
            reasons.append("budget confirmed")
        elif "maybe" in budget_lower or "need to check" in budget_lower:
            score += 1
            reasons.append("budget hesitant")
        
        # Timeline check
        timeline_lower = timeline.lower()
        if any(x in timeline_lower for x in ["now", "next week", "this month", "soon", "1 month", "2 weeks"]):
            score += 3
            reasons.append("immediate timeline")
        elif any(x in timeline_lower for x in ["1-2 months", "couple months"]):
            score += 2
            reasons.append("near-term timeline")
        
        # Project check
        if len(project) > 20 and any(x in project.lower() for x in ["building", "startup", "company", "app", "product", "creating"]):
            score += 2
            reasons.append("clear project")
        
        # Seriousness
        if seriousness >= 8:
            score += 3
            reasons.append("highly serious")
        elif seriousness >= 5:
            score += 1
            reasons.append("moderately serious")
        
        if score >= 8:
            return f"Hot lead! {', '.join(reasons)}. Ready to send application link and schedule follow-up."
        elif score >= 5:
            return f"Warm lead. {', '.join(reasons)}. Invite them to an event to see the space and community first."
        else:
            return f"Cold lead. May not be the right fit right now. Add to newsletter for future cohorts."
    
    @function_tool
    async def get_pricing(self, product: str) -> str:
        """Get pricing for a specific product."""
        product_lower = product.lower()
        
        if "residency" in product_lower or "room" in product_lower:
            return "Residency is 35,000 rupees per month for a shared room or 60,000 rupees per month for a private room. That's a 3-month commitment. It includes accommodation, 24/7 workspace, all events, workshops, demo days, and founder dinners."
        elif "short stay" in product_lower or "night" in product_lower:
            return "Short stays are 5,000 to 7,000 rupees per night. You get a bed, WiFi, workspace access, and entry to community events. Check-in is 1 PM, check-out is 10 AM."
        elif "event" in product_lower:
            return "Event spaces at Koramangala are $60 per hour for individual rooms or $100 per hour for full venue buyout. At Whitefield it's $60 to $90 per hour or $120 for full venue which includes pool access. Minimum 2 hour booking."
        elif "workspace" in product_lower or "coworking" in product_lower or "flo" in product_lower:
            return "Flo Zone coworking is 426 rupees per day, 2,557 per week, or 10,231 per month. Studio rental for podcasting or content creation is 1,023 rupees per hour or 5,627 for a full day."
        else:
            return "We have residency at 35-60k per month, short stays at 5-7k per night, events starting at $60 per hour, and workspace from 426 rupees per day. What are you most interested in?"
    
    @function_tool
    async def switch_to_technical(self):
        """Switch to technical specialist for product questions."""
        await self.session.generate_reply(
            user_input="Say you're connecting them to your technical specialist who can explain the facilities and integrations in detail."
        )
        return TechnicalAgent()
    
    @function_tool
    async def switch_to_pricing(self):
        """Switch to pricing specialist for detailed budget discussions."""
        await self.session.generate_reply(
            user_input="Say you're connecting them to your pricing specialist who can help with packages and budgeting."
        )
        return PricingAgent()


class TechnicalAgent(Agent):
    """Technical Specialist - handles facility and feature questions."""
    
    def __init__(self):
        llm = openai.LLM.with_cerebras(model="llama-3.3-70b")
        stt = deepgram.STT()
        tts = deepgram.TTS(model="aura-orion-en")  # Male voice
        vad = silero.VAD.load()
        
        instructions = f"""
        You are the Technical Specialist for Zo House, communicating by voice. All text you return will be spoken aloud - no bullets or special formatting.

        {ZO_HOUSE_KNOWLEDGE}

        YOUR EXPERTISE:
        - Detailed facility information for both locations
        - Event space capabilities and AV setup
        - Workspace features (Flo Zone, Studio)
        - The Residency program partnership
        - Zo World ecosystem and Web3 integration
        - Zostel network and booking systems

        KORAMANGALA FACILITIES:
        - 3 floors: Private (Zo Studio, Degen Lounge), Communal (Schelling Point, Multiverse, Dorms), Focused (Flo Zone, Private Rooms, Terrace)
        - Zo Studio IRL: 3D printers, podcast setup, design workstations
        - Degen Lounge: poker room, private booth seating, community kitchen
        - 360 degree terrace with sunrise viewing

        WHITEFIELD FACILITIES:
        - 36,000 square feet
        - Swimming pool, sauna, pickleball court
        - Schelling Point (100 capacity), Degen Lounge (60 capacity)
        - Flo Zone (10 capacity), Studio
        - Liquidity Pool outdoor space

        You can transfer:
        - Use switch_to_sales for general sales questions
        - Use switch_to_pricing for pricing discussions
        """
        
        super().__init__(
            instructions=instructions,
            stt=stt, llm=llm, tts=tts, vad=vad
        )
    
    async def on_enter(self):
        print("Current Agent: 💻 Technical Specialist 💻")
        await self.session.say(
            "Hey, I'm the technical specialist. I can give you all the details on our facilities, event spaces, and how everything works. What would you like to know?"
        )
    
    @function_tool
    async def switch_to_sales(self):
        """Switch back to sales representative."""
        await self.session.generate_reply(
            user_input="Say you're transferring them back to Aria for next steps."
        )
        return SalesAgent()
    
    @function_tool
    async def switch_to_pricing(self):
        """Switch to pricing specialist."""
        await self.session.generate_reply(
            user_input="Say you're connecting them to pricing specialist."
        )
        return PricingAgent()


class PricingAgent(Agent):
    """Pricing Specialist - handles pricing, packages, and budget discussions."""
    
    def __init__(self):
        llm = openai.LLM.with_cerebras(model="llama-3.3-70b")
        stt = deepgram.STT()
        tts = deepgram.TTS(model="aura-luna-en")  # Friendly female voice
        vad = silero.VAD.load()
        
        instructions = f"""
        You are the Pricing Specialist for Zo House, communicating by voice. All text you return will be spoken aloud - no bullets or special formatting.

        {ZO_HOUSE_KNOWLEDGE}

        YOUR EXPERTISE:
        - All pricing details and packages
        - Value comparison vs alternatives
        - Founder NFT benefits (10% discount)
        - Budget discussions and payment options
        - Cross-sell and upsell strategies

        PRICING PHILOSOPHY:
        - We're EBITDA-positive, not running a hostel
        - Price reflects community value, not just beds
        - Most people spend 35-45k on rent plus coworking separately
        - The serendipity of community is what you're paying for

        KEY PRICING:
        - Shared Room Residency: 35,000/month (3 months = 1,05,000)
        - Private Room Residency: 60,000/month (3 months = 1,80,000)
        - Short Stay: 5,000-7,000/night
        - Events: $60-120/hour depending on space
        - Workspace: 426-10,231/month

        DISCOUNTS:
        - Only discount: Founder NFT holders get 10% off everything
        - No other discounts - pricing is already tight

        VALUE COMPARISON:
        - Rent in Bangalore: 25-30k
        - Coworking: 10-15k
        - Total: 35-45k and you're alone
        - Zo House: 35k and you get both plus community

        You can transfer:
        - Use switch_to_sales to return to Aria
        - Use switch_to_technical for facility questions
        """
        
        super().__init__(
            instructions=instructions,
            stt=stt, llm=llm, tts=tts, vad=vad
        )
    
    async def on_enter(self):
        print("Current Agent: 💰 Pricing Specialist 💰")
        await self.session.say(
            "Hi there! I'm the pricing specialist. I can help you understand our packages and find the best value for what you need. What's your situation?"
        )
    
    @function_tool
    async def calculate_value(self, current_rent: int, coworking_cost: int) -> str:
        """
        Calculate value comparison vs their current costs.
        
        Args:
            current_rent: Their current monthly rent
            coworking_cost: Their coworking or workspace cost
        """
        current_total = current_rent + coworking_cost
        zo_shared = 35000
        zo_private = 60000
        
        if current_total >= zo_shared:
            savings = current_total - zo_shared
            return f"You're currently spending {current_total:,} rupees. For the same or less - {zo_shared:,} rupees - you get housing, workspace, and a community of builders at Zo House. That's actually {savings:,} less AND you get the community bonus. The private room at {zo_private:,} is just {zo_private - current_total:,} more than what you're paying now."
        else:
            diff = zo_shared - current_total
            return f"You're spending {current_total:,} rupees. Zo House shared room is {zo_shared:,} - so {diff:,} more. But you're getting housing plus workspace plus 12-20 builders around you. People find co-founders, first customers, and investors here. That extra {diff:,} is for the serendipity."
    
    @function_tool
    async def switch_to_sales(self):
        """Switch back to sales representative."""
        await self.session.generate_reply(
            user_input="Say you're transferring them back to Aria to discuss next steps."
        )
        return SalesAgent()
    
    @function_tool
    async def switch_to_technical(self):
        """Switch to technical specialist."""
        await self.session.generate_reply(
            user_input="Say you're connecting them to the technical specialist."
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
    required = ["CEREBRAS_API_KEY", "DEEPGRAM_API_KEY"]
    missing = [k for k in required if not os.environ.get(k)]
    
    if missing:
        print(f"❌ Missing: {', '.join(missing)}")
        print("\nRequired:")
        print("  LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET")
        print("  CEREBRAS_API_KEY (LLM - free tier)")
        print("  DEEPGRAM_API_KEY (STT + TTS - free tier!)")
        print("\nOptional:")
        print("  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
        exit(1)
    
    print("🏠 Starting Zo House Multi-Agent Sales System...")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nAgents available:")
    print("  🏠 Aria (Sales Agent) - main contact")
    print("  💻 Technical Specialist - facilities & features")
    print("  💰 Pricing Specialist - packages & value")
    print("\nKnowledge loaded:")
    print("  📚 Zo House Complete Sales Bible")
    print("  📍 Koramangala & Whitefield locations")
    print("  💵 All products & pricing")
    print("  🎯 Lead qualification & objection handling")
    
    agents.cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
