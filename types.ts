
export interface Activity {
  plataforma: string;
  atividade: string;
  tipo: string;
  status: string;
  data: string;
  categoria?: string;
  impeditivo?: string;
  prioridade?: string;
  responsavel?: string;
}

export interface MapPoint {
  latitude: number;
  longitude: number;
  nome: string;
  descricao?: string;
}

export interface DashboardStats {
  totalItems: number;
  totalApproved: number;
  totalOpen: number;
  approvedPercentage: number;
  platformDistribution: { name: string; value: number; open: number }[];
  typeDistribution: { name: string; value: number }[];
}

export enum Status {
  APROVADO = 'APROVADO',
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM ANDAMENTO',
  REPROVADO = 'REPROVADO'
}
