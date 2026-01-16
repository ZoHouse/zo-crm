import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Brain } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
        <p className="text-gray-500">Intelligent analysis of your relationship data</p>
      </div>

      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-12 text-gray-600">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Relationship Intel</h3>
            <p className="max-w-md mb-6">
              Connect more data sources and log activities to see AI-generated insights about lead quality, 
              best times to contact, and automated follow-up suggestions.
            </p>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-white rounded-lg border border-blue-200 text-sm font-medium">
                Predictive Lead Scoring
              </div>
              <div className="px-4 py-2 bg-white rounded-lg border border-blue-200 text-sm font-medium">
                Smart Follow-ups
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
