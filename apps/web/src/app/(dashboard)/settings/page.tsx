import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Shield, Bell, Database } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your CRM configuration and preferences</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-400" />
              General Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">CRM Name</p>
                <p className="text-xs text-gray-500">The name displayed in your sidebar</p>
              </div>
              <span className="text-sm text-gray-900 font-medium">Smart CRM</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Default Currency</p>
                <p className="text-xs text-gray-500">Used for revenue tracking</p>
              </div>
              <span className="text-sm text-gray-900 font-medium">USD ($)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-400" />
              API & Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Luma API Integration</p>
                <p className="text-xs text-green-600 font-medium">Connected</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Supabase Backend</p>
                <p className="text-xs text-green-600 font-medium">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
