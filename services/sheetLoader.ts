
import { Activity, MapPoint } from '../types';

const SHEET_ID = '1s3_pUm6o5JKTCoSQGAYIpQDM3Y9BmEVjgLA7TpvOQh8';
const MAP_SHEET_ID = '1HvwKzHEDTPJaYEsBOZnOabaxvfqXUTw92zvoROOFcg0';

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const MAP_CSV_URL = `https://docs.google.com/spreadsheets/d/${MAP_SHEET_ID}/gviz/tq?tqx=out:csv`;

export async function fetchSpreadsheetData(): Promise<Activity[]> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error('Failed to fetch spreadsheet');
    
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error loading sheet:', error);
    return getMockData();
  }
}

export async function fetchMapData(): Promise<MapPoint[]> {
  try {
    const response = await fetch(MAP_CSV_URL);
    if (!response.ok) throw new Error('Failed to fetch map data');
    
    const csvText = await response.text();
    return parseMapCSV(csvText);
  } catch (error) {
    console.error('Error loading map data:', error);
    return [];
  }
}

function parseCSV(csvText: string): Activity[] {
  const lines = csvText.split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].replace(/"/g, '').split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const entry: any = {};
    
    values.forEach((val, idx) => {
      const cleanVal = val.replace(/"/g, '').trim();
      const header = headers[idx];
      if (!header) return;
      
      if (header.includes('plataforma')) entry.plataforma = cleanVal;
      else if (header.includes('atividade')) entry.atividade = cleanVal;
      else if (header.includes('tipo')) entry.tipo = cleanVal;
      else if (header.includes('status')) entry.status = cleanVal;
      else if (header.includes('data')) entry.data = cleanVal;
      else if (header.includes('impeditivo')) entry.impeditivo = cleanVal;
      else if (header.includes('categoria')) entry.categoria = cleanVal;
    });
    
    return entry as Activity;
  }).filter(a => a.plataforma);
}

function parseMapCSV(csvText: string): MapPoint[] {
  const lines = csvText.split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].replace(/"/g, '').split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const entry: any = {};
    
    values.forEach((val, idx) => {
      const cleanVal = val.replace(/"/g, '').trim();
      const header = headers[idx];
      if (!header) return;
      
      // Adapt based on expected spreadsheet column names
      if (header.includes('lat')) entry.latitude = parseFloat(cleanVal.replace(',', '.'));
      else if (header.includes('long')) entry.longitude = parseFloat(cleanVal.replace(',', '.'));
      else if (header.includes('nome')) entry.nome = cleanVal;
      else if (header.includes('desc')) entry.descricao = cleanVal;
    });
    
    return entry as MapPoint;
  }).filter(p => !isNaN(p.latitude) && !isNaN(p.longitude));
}

function splitCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function getMockData(): Activity[] {
  return [
    { plataforma: 'Mobile', atividade: 'Login Fix', tipo: 'Bug', status: 'APROVADO', data: '2024-05-01', impeditivo: 'Não', categoria: 'Autenticação' },
    { plataforma: 'Web', atividade: 'Dark Mode', tipo: 'Feature', status: 'PENDENTE', data: '2024-05-02', impeditivo: 'Não', categoria: 'UI/UX' },
    { plataforma: 'API', atividade: 'Docs Update', tipo: 'Task', status: 'EM ANDAMENTO', data: '2024-05-03', impeditivo: 'Não', categoria: 'Documentação' },
    { plataforma: 'Mobile', atividade: 'Push Notifications', tipo: 'Feature', status: 'PENDENTE', data: '2024-05-04', impeditivo: 'Não', categoria: 'Notificações' },
    { plataforma: 'Web', atividade: 'Checkout Bug', tipo: 'Bug', status: 'APROVADO', data: '2024-05-05', impeditivo: 'Sim', categoria: 'Financeiro' },
    { plataforma: 'Desktop', atividade: 'Sync Fix', tipo: 'Bug', status: 'PENDENTE', data: '2024-05-06', impeditivo: 'Sim', categoria: 'Sincronização' },
  ];
}
