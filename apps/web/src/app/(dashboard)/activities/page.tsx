import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity as ActivityIcon, Clock } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <p className="text-gray-500">Track all interactions across your contacts</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-12 text-gray-500">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ActivityIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
            <p className="max-w-md">
              When you log calls, notes, or meetings for your contacts, they will appear here in a unified timeline.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
