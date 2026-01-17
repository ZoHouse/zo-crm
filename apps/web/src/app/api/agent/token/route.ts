import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const dynamic = "force-dynamic";

export async function POST() {
  // Check for required environment variables
  const livekitUrl = process.env.LIVEKIT_URL;
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
  const cerebrasApiKey = process.env.CEREBRAS_API_KEY;
  const cartesiaApiKey = process.env.CARTESIA_API_KEY;

  const missingKeys: string[] = [];
  
  if (!livekitUrl) missingKeys.push("LIVEKIT_URL");
  if (!livekitApiKey) missingKeys.push("LIVEKIT_API_KEY");
  if (!livekitApiSecret) missingKeys.push("LIVEKIT_API_SECRET");
  if (!cerebrasApiKey) missingKeys.push("CEREBRAS_API_KEY");
  if (!cartesiaApiKey) missingKeys.push("CARTESIA_API_KEY");

  if (missingKeys.length > 0) {
    return NextResponse.json(
      { 
        error: `Missing required environment variables: ${missingKeys.join(", ")}`,
        setup_url: "https://inference-docs.cerebras.ai/cookbook/agents/sales-agent-cerebras-livekit"
      },
      { status: 400 }
    );
  }

  try {
    // Generate a unique room name and participant identity
    const roomName = `crm-agent-${Date.now()}`;
    const participantIdentity = `user-${Date.now()}`;

    // Generate LiveKit access token
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: participantIdentity,
      ttl: "1h", // Token valid for 1 hour
    });
    
    at.addGrant({ 
      room: roomName, 
      roomJoin: true, 
      canPublish: true, 
      canPublishData: true,
      canSubscribe: true,
    });
    
    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      token,
      roomName,
      participantIdentity,
      livekitUrl,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
