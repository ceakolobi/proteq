import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  Mail,
  MapPin,
  Car,
  Bike,
  Truck,
  Tractor,
  Instagram,
  Facebook,
  Globe,
  MessageCircle,
  PhoneCall,
  Users,
  Edit,
  History,
  UserCheck,
  MoreVertical,
  GripVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VehicleType } from '@/types/database';
import { vehicleTypeLabels } from '@/types/database';

type LeadStatus = 'novo' | 'em_contato' | 'cotado' | 'convertido' | 'perdido';
type LeadOrigem = 'instagram' | 'facebook' | 'indicacao' | 'site' | 'whatsapp' | 'telefone' | 'presencial' | 'outro';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  tipo_veiculo: VehicleType | null;
  origem: LeadOrigem | null;
  status: LeadStatus | null;
  consultor_id: string;
  regiao_id: string | null;
  sede_id: string | null;
  observacoes: string | null;
  convertido: boolean;
  created_at: string;
  updated_at: string;
  regiao_nome?: string;
  sede_nome?: string;
  consultor_nome?: string;
}

interface LeadKanbanProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onViewHistory: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
  canEdit: boolean;
  masker: {
    telefone: (value: string | null | undefined) => string;
    email: (value: string | null | undefined) => string;
  };
}

const columns: { id: LeadStatus; title: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: 'novo', title: 'Novos', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  { id: 'em_contato', title: 'Em Contato', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
  { id: 'cotado', title: 'Cotados', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
  { id: 'convertido', title: 'Convertidos', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
  { id: 'perdido', title: 'Perdidos', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-300' },
];

const getOrigemIcon = (origem: LeadOrigem | null) => {
  switch (origem) {
    case 'instagram': return <Instagram className="h-3 w-3" />;
    case 'facebook': return <Facebook className="h-3 w-3" />;
    case 'whatsapp': return <MessageCircle className="h-3 w-3" />;
    case 'telefone': return <PhoneCall className="h-3 w-3" />;
    case 'site': return <Globe className="h-3 w-3" />;
    default: return <Users className="h-3 w-3" />;
  }
};

const getVehicleIcon = (tipo: VehicleType | null) => {
  switch (tipo) {
    case 'moto': return <Bike className="h-3 w-3" />;
    case 'caminhao':
    case 'utilitario':
    case 'pickup': return <Truck className="h-3 w-3" />;
    case 'maquina_agricola':
    case 'implemento_agricola': return <Tractor className="h-3 w-3" />;
    default: return <Car className="h-3 w-3" />;
  }
};

const leadOrigemLabels: Record<LeadOrigem, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  indicacao: 'Indicação',
  site: 'Site',
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  presencial: 'Presencial',
  outro: 'Outro'
};

export function LeadKanban({ leads, onEdit, onConvert, onViewHistory, onStatusChange, canEdit, masker }: LeadKanbanProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => (lead.status || 'novo') === status);
  };

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== targetStatus && canEdit) {
      onStatusChange(draggedLead, targetStatus);
    }
    setDraggedLead(null);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnLeads = getLeadsByStatus(column.id);
        
        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-72 rounded-lg ${column.bgColor} border-2 ${column.borderColor}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={`p-3 border-b ${column.borderColor}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${column.color}`}>{column.title}</h3>
                <Badge variant="secondary" className="bg-white/80">
                  {columnLeads.length}
                </Badge>
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px]">
              <div className="p-2 space-y-2">
                {columnLeads.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum lead
                  </div>
                ) : (
                  columnLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md bg-white ${
                        draggedLead?.id === lead.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {canEdit && (
                              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {lead.nome.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{lead.nome}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(lead.created_at)}</p>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => onEdit(lead)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => onViewHistory(lead)}>
                                <History className="mr-2 h-4 w-4" />
                                Histórico
                              </DropdownMenuItem>
                              {lead.status !== 'convertido' && canEdit && (
                                <DropdownMenuItem onClick={() => onConvert(lead)}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Converter
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{masker.telefone(lead.telefone)}</span>
                          </div>
                          
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{masker.email(lead.email)}</span>
                            </div>
                          )}

                          {(lead.cidade || lead.estado) && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{lead.cidade}{lead.cidade && lead.estado && '/'}{lead.estado}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {lead.tipo_veiculo && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 px-1.5 py-0">
                              {getVehicleIcon(lead.tipo_veiculo)}
                              <span className="truncate max-w-[60px]">
                                {vehicleTypeLabels[lead.tipo_veiculo]}
                              </span>
                            </Badge>
                          )}
                          
                          {lead.origem && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1 px-1.5 py-0">
                              {getOrigemIcon(lead.origem)}
                              <span className="truncate max-w-[60px]">
                                {leadOrigemLabels[lead.origem]}
                              </span>
                            </Badge>
                          )}
                        </div>

                        {lead.consultor_nome && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground truncate">
                              {lead.consultor_nome}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
