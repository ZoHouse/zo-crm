import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get contact count
    const { count: contactCount } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true });

    // Get sample context for the agent (top companies, stages breakdown)
    const { data: contacts } = await supabase
      .from("contacts")
      .select("name, email, company, relationship_stage")
      .not("company", "is", null)
      .limit(100);

    // Get unique companies
    const companies = [...new Set(contacts?.map((c) => c.company).filter(Boolean))];

    // Get stage breakdown
    const { data: stageData } = await supabase
      .from("contacts")
      .select("relationship_stage");

    const stages = stageData?.reduce((acc: Record<string, number>, c) => {
      const stage = c.relationship_stage || "lead";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    // Build context summary for the agent
    const contextSummary = `
CRM Context Summary:
- Total Contacts: ${contactCount || 0}
- Top Companies: ${companies.slice(0, 20).join(", ")}
- Relationship Stages: ${Object.entries(stages || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")}

The agent can look up specific contacts by name, email, or company.
    `.trim();

    return NextResponse.json({
      contactCount: contactCount || 0,
      topCompanies: companies.slice(0, 20),
      stages: stages || {},
      contextSummary,
    });
  } catch (error) {
    console.error("Context loading error:", error);
    return NextResponse.json(
      { 
        contactCount: 0, 
        error: "Failed to load CRM context" 
      },
      { status: 500 }
    );
  }
}

// POST endpoint for searching contacts (used by the agent)
export async function POST(request: Request) {
  try {
    const { query, type } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    let queryBuilder = supabase
      .from("contacts")
      .select("id, name, email, company, phone, relationship_stage, notes");

    // Search based on type
    switch (type) {
      case "email":
        queryBuilder = queryBuilder.ilike("email", `%${query}%`);
        break;
      case "company":
        queryBuilder = queryBuilder.ilike("company", `%${query}%`);
        break;
      case "name":
      default:
        queryBuilder = queryBuilder.ilike("name", `%${query}%`);
        break;
    }

    const { data: contacts, error } = await queryBuilder.limit(10);

    if (error) throw error;

    return NextResponse.json({
      results: contacts || [],
      count: contacts?.length || 0,
    });
  } catch (error) {
    console.error("Contact search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
