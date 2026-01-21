'use client';

import { useState, useCallback } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MoreHorizontal,
  Plus,
  Star,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import type { Lead } from './page';

// Define the pipeline stages
const STAGES = [
  { id: 'lead', label: 'New Leads', color: 'bg-blue-500' },
  { id: 'contact', label: 'Contacted', color: 'bg-yellow-500' },
  { id: 'engaged', label: 'Engaged', color: 'bg-purple-500' },
  { id: 'partner', label: 'Partner', color: 'bg-green-500' },
  { id: 'vip', label: 'VIP', color: 'bg-amber-500' },
  { id: 'inactive', label: 'Inactive', color: 'bg-gray-400' },
] as const;

type StageId = typeof STAGES[number]['id'];

interface KanbanBoardProps {
  initialLeads: Lead[];
}

interface KanbanColumnProps {
  stage: typeof STAGES[number];
  leads: Lead[];
  onAddLead?: () => void;
}

interface KanbanCardProps {
  lead: Lead;
  isDragging?: boolean;
}

// Sortable Card Component
function SortableCard({ lead }: { lead: Lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard lead={lead} />
    </div>
  );
}

// Kanban Card Component
function KanbanCard({ lead, isDragging }: KanbanCardProps) {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email;
  const initials = lead.first_name && lead.last_name 
    ? `${lead.first_name[0]}${lead.last_name[0]}`.toUpperCase()
    : lead.email[0].toUpperCase();

  return (
    <Card className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}>
      <div className="space-y-2">
        {/* Header with name and score */}
        <div className="flex items-start justify-between gap-2">
          <Link 
            href={`/contacts/${lead.id}`}
            className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{name}</p>
              {lead.job_title && (
                <p className="text-xs text-gray-500 truncate">{lead.job_title}</p>
              )}
            </div>
          </Link>
          {lead.lead_score !== null && lead.lead_score > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-xs font-medium text-gray-600">{lead.lead_score}</span>
            </div>
          )}
        </div>

        {/* Company */}
        {lead.company && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.company}</span>
          </div>
        )}

        {/* Contact info */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1 truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        </div>

        {/* Footer with source and date */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          {lead.source && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {lead.source}
            </Badge>
          )}
          {lead.updated_at && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-2.5 h-2.5" />
              {new Date(lead.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Droppable Column Component
function KanbanColumn({ stage, leads, onAddLead }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div 
      className={`flex flex-col bg-gray-100 rounded-xl min-w-[280px] max-w-[320px] w-full transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
          <h3 className="font-semibold text-gray-900 text-sm">{stage.label}</h3>
          <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs font-medium text-gray-600">
            {leads.length}
          </span>
        </div>
        <button 
          onClick={onAddLead}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Add lead"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Column Content */}
      <div 
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]"
      >
        <SortableContext 
          items={leads.map(l => l.id)} 
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <User className="w-8 h-8 mb-2" />
            <p className="text-sm">No leads</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Kanban Board Component
export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group leads by stage
  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = leads.filter(lead => 
      (lead.relationship_stage || 'lead') === stage.id
    );
    return acc;
  }, {} as Record<StageId, Lead[]>);

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active lead
    const activeLead = leads.find(l => l.id === activeId);
    if (!activeLead) return;

    // Check if dropping on a column (stage)
    const overStage = STAGES.find(s => s.id === overId);
    if (overStage) {
      // Update the lead's stage
      const currentStage = activeLead.relationship_stage || 'lead';
      if (currentStage !== overStage.id) {
        setLeads(prev => prev.map(lead => 
          lead.id === activeId 
            ? { ...lead, relationship_stage: overStage.id }
            : lead
        ));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the lead being dragged
    const activeLead = leads.find(l => l.id === activeId);
    if (!activeLead) return;

    // Determine the target stage
    let targetStage: StageId | null = null;

    // Check if dropped on a stage column
    const overStage = STAGES.find(s => s.id === overId);
    if (overStage) {
      targetStage = overStage.id;
    } else {
      // Dropped on another card - find that card's stage
      const overLead = leads.find(l => l.id === overId);
      if (overLead) {
        targetStage = (overLead.relationship_stage || 'lead') as StageId;
      }
    }

    if (targetStage && targetStage !== (activeLead.relationship_stage || 'lead')) {
      // Update local state
      setLeads(prev => prev.map(lead => 
        lead.id === activeId 
          ? { ...lead, relationship_stage: targetStage, updated_at: new Date().toISOString() }
          : lead
      ));

      // Update in database
      try {
        const response = await fetch(`/api/leads/${activeId}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: targetStage }),
        });

        if (!response.ok) {
          console.error('Failed to update lead stage');
          // Revert on error
          setLeads(initialLeads);
        }
      } catch (error) {
        console.error('Error updating lead stage:', error);
        // Revert on error
        setLeads(initialLeads);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage[stage.id]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="w-[280px]">
            <KanbanCard lead={activeLead} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
