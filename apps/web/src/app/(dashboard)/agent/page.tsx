"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Bot,
  Loader2,
  Settings2,
  Sparkles,
  MessageSquare,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AgentStatus = "idle" | "connecting" | "connected" | "speaking" | "listening" | "error";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

export default function SalesAgentPage() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contactCount, setContactCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contact count for context display
  useEffect(() => {
    fetch("/api/agent/context")
      .then((res) => res.json())
      .then((data) => setContactCount(data.contactCount || 0))
      .catch(() => setContactCount(0));
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startCall = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    
    try {
      // Get token from our API
      const response = await fetch("/api/agent/token", {
        method: "POST",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to connect to agent");
      }

      // For now, simulate connection since we need full LiveKit setup
      setStatus("connected");
      
      // Add initial greeting
      setMessages([{
        id: "1",
        role: "agent",
        content: "Hello! I'm your AI sales assistant. I have access to your CRM with contact information. How can I help you today?",
        timestamp: new Date(),
      }]);

      // Simulate agent listening
      setTimeout(() => setStatus("listening"), 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  }, []);

  const endCall = useCallback(() => {
    setStatus("idle");
    setMessages([]);
  }, []);

  const toggleMute = () => setIsMuted(!isMuted);
  const toggleSpeaker = () => setIsSpeakerOn(!isSpeakerOn);

  const statusConfig: Record<AgentStatus, { label: string; color: string; pulse?: boolean }> = {
    idle: { label: "Ready", color: "bg-gray-400" },
    connecting: { label: "Connecting...", color: "bg-yellow-400", pulse: true },
    connected: { label: "Connected", color: "bg-green-400" },
    speaking: { label: "Agent Speaking", color: "bg-blue-400", pulse: true },
    listening: { label: "Listening", color: "bg-green-400", pulse: true },
    error: { label: "Error", color: "bg-red-400" },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
            Sales Agent
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Voice-powered AI assistant with CRM knowledge
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            currentStatus.color,
            currentStatus.pulse && "animate-pulse"
          )} />
          <span className="text-sm font-medium text-gray-600">{currentStatus.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Agent Interface */}
        <div className="lg:col-span-2 space-y-4">
          {/* Agent Avatar & Controls */}
          <Card className="overflow-hidden">
            <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8 md:p-12">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%)`,
                  backgroundSize: "50px 50px"
                }} />
              </div>
              
              {/* Agent Visual */}
              <div className="relative flex flex-col items-center">
                <div className={cn(
                  "w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-2xl transition-all duration-300",
                  status === "speaking" && "scale-110 ring-4 ring-blue-400/50",
                  status === "listening" && "ring-4 ring-green-400/50"
                )}>
                  {status === "connecting" ? (
                    <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-white animate-spin" />
                  ) : (
                    <Bot className="w-12 h-12 md:w-16 md:h-16 text-white" />
                  )}
                </div>
                
                {/* Sound Wave Animation */}
                {(status === "speaking" || status === "listening") && (
                  <div className="absolute -bottom-2 flex items-end justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 rounded-full transition-all",
                          status === "speaking" ? "bg-blue-400" : "bg-green-400"
                        )}
                        style={{
                          height: `${Math.random() * 20 + 10}px`,
                          animation: `soundwave 0.5s ease-in-out infinite`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                )}

                <h2 className="mt-6 text-xl font-semibold text-white">Aria</h2>
                <p className="text-blue-200 text-sm">Sales Assistant</p>
              </div>

              {/* Call Controls */}
              <div className="relative mt-8 flex items-center justify-center gap-4">
                {status === "idle" || status === "error" ? (
                  <Button
                    onClick={startCall}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8 py-6 shadow-lg"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Start Call
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={toggleMute}
                      variant={isMuted ? "default" : "outline"}
                      size="icon"
                      className={cn(
                        "w-12 h-12 rounded-full",
                        isMuted ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                      )}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    
                    <Button
                      onClick={endCall}
                      size="lg"
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8 py-6 shadow-lg"
                    >
                      <PhoneOff className="w-5 h-5 mr-2" />
                      End Call
                    </Button>
                    
                    <Button
                      onClick={toggleSpeaker}
                      variant={!isSpeakerOn ? "default" : "outline"}
                      size="icon"
                      className={cn(
                        "w-12 h-12 rounded-full",
                        !isSpeakerOn ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                      )}
                    >
                      {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Conversation Transcript */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">Start a call to begin conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === "agent" && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2",
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-200"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          msg.role === "user" ? "text-blue-200" : "text-gray-400"
                        )}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Agent Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Agent Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>Voice conversation</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>CRM contact lookup</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>Meeting scheduling</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>Lead qualification</span>
              </div>
            </CardContent>
          </Card>

          {/* CRM Context */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                CRM Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Contacts Loaded</span>
                  <Badge variant="secondary">{contactCount.toLocaleString()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Source</span>
                  <Badge variant="secondary">Supabase</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Agent has access to contact names, emails, companies, and relationship stages.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <Settings2 className="w-4 h-4" />
                Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-700 space-y-2">
              <p>To enable the voice agent, add these environment variables:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><code className="bg-amber-100 px-1 rounded">LIVEKIT_URL</code></li>
                <li><code className="bg-amber-100 px-1 rounded">LIVEKIT_API_KEY</code></li>
                <li><code className="bg-amber-100 px-1 rounded">LIVEKIT_API_SECRET</code></li>
                <li><code className="bg-amber-100 px-1 rounded">CEREBRAS_API_KEY</code></li>
                <li><code className="bg-amber-100 px-1 rounded">CARTESIA_API_KEY</code></li>
              </ul>
              <a 
                href="https://inference-docs.cerebras.ai/cookbook/agents/sales-agent-cerebras-livekit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-amber-600 hover:text-amber-800 underline"
              >
                View Cerebras Cookbook →
              </a>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p className="text-sm text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* CSS for sound wave animation */}
      <style jsx>{`
        @keyframes soundwave {
          0%, 100% { height: 10px; }
          50% { height: 30px; }
        }
      `}</style>
    </div>
  );
}
