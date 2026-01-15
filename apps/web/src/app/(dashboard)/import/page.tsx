"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  CalendarDays,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Users,
} from "lucide-react";
import { supabase, type Contact } from "@/lib/supabase";

// Common personal email domains
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'live.com', 'icloud.com', 'aol.com', 'protonmail.com',
]);

// Available contact fields for mapping
const CONTACT_FIELDS = [
  { key: 'email', label: 'Email', required: true },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'eth_address', label: 'ETH Address' },
  { key: 'solana_address', label: 'Solana Address' },
  { key: 'notes', label: 'Notes' },
];

function getCompanyFromEmail(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || PERSONAL_EMAIL_DOMAINS.has(domain)) return null;
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'csv' | 'luma'>('luma');
  
  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [csvStep, setCsvStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload');
  
  // Luma Sync State
  const [lumaStatus, setLumaStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [lumaResults, setLumaResults] = useState<{
    calendars: { name: string; events: number; guests: number }[];
    totalContacts: number;
    imported: number;
    errors: number;
  } | null>(null);
  
  // Import Results
  const [importResults, setImportResults] = useState<{
    total: number;
    imported: number;
    duplicates: number;
    errors: number;
  } | null>(null);

  // CSV File Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => {
        // Handle CSV parsing with quoted values
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of row) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      }).filter(row => row.some(cell => cell));

      if (rows.length > 0) {
        setCsvHeaders(rows[0]);
        setCsvData(rows.slice(1));
        
        // Auto-map columns based on header names
        const autoMapping: Record<string, string> = {};
        rows[0].forEach((header, idx) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '');
          CONTACT_FIELDS.forEach(field => {
            const normalizedField = field.label.toLowerCase().replace(/[^a-z]/g, '');
            if (normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader)) {
              autoMapping[idx.toString()] = field.key;
            }
          });
          // Special cases
          if (normalizedHeader.includes('name') && !normalizedHeader.includes('first') && !normalizedHeader.includes('last')) {
            autoMapping[idx.toString()] = 'first_name'; // Will split later
          }
        });
        setColumnMapping(autoMapping);
        setCsvStep('map');
      }
    };
    
    reader.readAsText(file);
  };

  // CSV Import Handler
  const handleCsvImport = async () => {
    setCsvStep('importing');
    
    const emailColumnIdx = Object.entries(columnMapping).find(([_, field]) => field === 'email')?.[0];
    if (!emailColumnIdx) {
      alert('Please map the Email column');
      setCsvStep('map');
      return;
    }

    const contacts: Partial<Contact>[] = [];
    let duplicates = 0;
    let errors = 0;
    const seenEmails = new Set<string>();

    for (const row of csvData) {
      try {
        const email = row[parseInt(emailColumnIdx)]?.toLowerCase().trim();
        if (!email || !email.includes('@')) {
          errors++;
          continue;
        }
        
        if (seenEmails.has(email)) {
          duplicates++;
          continue;
        }
        seenEmails.add(email);

        const contact: Partial<Contact> = {
          email,
          source: 'csv_import',
          source_detail: csvFile?.name || 'CSV Import',
          relationship_stage: 'lead',
        };

        // Map columns to contact fields
        Object.entries(columnMapping).forEach(([colIdx, field]) => {
          const value = row[parseInt(colIdx)]?.trim();
          if (value && field) {
            (contact as Record<string, string>)[field] = value;
          }
        });

        // Auto-extract company from email if not provided
        if (!contact.company) {
          contact.company = getCompanyFromEmail(email) || undefined;
        }

        contacts.push(contact);
      } catch {
        errors++;
      }
    }

    // Upsert to Supabase in batches
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('contacts')
        .upsert(batch as Contact[], { onConflict: 'email' })
        .select();

      if (error) {
        console.error('Import error:', error);
        errors += batch.length;
      } else {
        imported += data?.length || 0;
      }
    }

    setImportResults({
      total: csvData.length,
      imported,
      duplicates,
      errors,
    });
    setCsvStep('done');
  };

  // Luma Sync Handler
  const handleLumaSync = async () => {
    setLumaStatus('syncing');
    
    try {
      const response = await fetch('/api/sync-luma', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setLumaResults(data);
        setLumaStatus('done');
      } else {
        console.error('Luma sync error:', data.error);
        setLumaStatus('error');
      }
    } catch (error) {
      console.error('Luma sync error:', error);
      setLumaStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Contacts</h1>
        <p className="text-gray-500">
          Import contacts from Luma events or upload a CSV file
        </p>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('luma')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'luma'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Luma Events
        </button>
        <button
          onClick={() => setActiveTab('csv')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'csv'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          CSV Upload
        </button>
      </div>

      {/* Luma Sync */}
      {activeTab === 'luma' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-purple-600" />
              Sync from Luma
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lumaStatus === 'idle' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Import from Luma Events
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Sync all contacts from your BLR and SFO calendars to Supabase.
                  This will import names, emails, phone numbers, socials, and wallet addresses.
                </p>
                <Button onClick={handleLumaSync} size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Start Sync
                </Button>
              </div>
            )}

            {lumaStatus === 'syncing' && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Syncing Contacts...
                </h3>
                <p className="text-gray-500">
                  This may take a few minutes. Fetching all events and guests from Luma.
                </p>
              </div>
            )}

            {lumaStatus === 'done' && lumaResults && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sync Complete!
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {lumaResults.totalContacts.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Total Contacts</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {lumaResults.imported.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Imported</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {lumaResults.calendars.reduce((sum, c) => sum + c.events, 0)}
                    </p>
                    <p className="text-sm text-gray-500">Events</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {lumaResults.errors}
                    </p>
                    <p className="text-sm text-gray-500">Errors</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Calendars Synced:</p>
                  {lumaResults.calendars.map((cal) => (
                    <div key={cal.name} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="font-medium">{cal.name}</span>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{cal.events} events</span>
                        <span>{cal.guests.toLocaleString()} guests</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => window.location.href = '/contacts'}>
                    <Users className="w-4 h-4 mr-2" />
                    View Contacts
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setLumaStatus('idle');
                    setLumaResults(null);
                  }}>
                    Sync Again
                  </Button>
                </div>
              </div>
            )}

            {lumaStatus === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sync Failed
                </h3>
                <p className="text-gray-500 mb-4">
                  There was an error syncing from Luma. Please try again.
                </p>
                <Button onClick={() => setLumaStatus('idle')} variant="outline">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CSV Import */}
      {activeTab === 'csv' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Upload CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Upload */}
            {csvStep === 'upload' && (
              <div className="text-center py-8">
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop your CSV file here
                    </p>
                    <p className="text-gray-500 mb-4">
                      or click to browse
                    </p>
                    <Badge variant="secondary">CSV, XLS, XLSX</Badge>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Step 2: Map Columns */}
            {csvStep === 'map' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Map Columns</h3>
                    <p className="text-sm text-gray-500">
                      {csvFile?.name} • {csvData.length} rows
                    </p>
                  </div>
                  <Badge variant="secondary">Step 2 of 3</Badge>
                </div>

                <div className="space-y-3">
                  {csvHeaders.map((header, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-48">
                        <p className="font-medium text-gray-900">{header}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {csvData[0]?.[idx] || '—'}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <select
                        value={columnMapping[idx.toString()] || ''}
                        onChange={(e) => setColumnMapping({
                          ...columnMapping,
                          [idx.toString()]: e.target.value
                        })}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Skip this column —</option>
                        {CONTACT_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label} {field.required && '*'}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => {
                    setCsvStep('upload');
                    setCsvFile(null);
                    setCsvData([]);
                    setCsvHeaders([]);
                    setColumnMapping({});
                  }}>
                    Back
                  </Button>
                  <Button onClick={handleCsvImport}>
                    Import {csvData.length} Contacts
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Importing */}
            {csvStep === 'importing' && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Importing Contacts...
                </h3>
                <p className="text-gray-500">
                  Processing {csvData.length} rows
                </p>
              </div>
            )}

            {/* Step 4: Done */}
            {csvStep === 'done' && importResults && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Import Complete!
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {importResults.total}
                    </p>
                    <p className="text-sm text-gray-500">Total Rows</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {importResults.imported}
                    </p>
                    <p className="text-sm text-gray-500">Imported</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {importResults.duplicates}
                    </p>
                    <p className="text-sm text-gray-500">Duplicates</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {importResults.errors}
                    </p>
                    <p className="text-sm text-gray-500">Errors</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => window.location.href = '/contacts'}>
                    <Users className="w-4 h-4 mr-2" />
                    View Contacts
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setCsvStep('upload');
                    setCsvFile(null);
                    setCsvData([]);
                    setCsvHeaders([]);
                    setColumnMapping({});
                    setImportResults(null);
                  }}>
                    Import Another File
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
