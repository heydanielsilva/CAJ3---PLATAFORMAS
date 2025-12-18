
import { Activity } from '../types';

const SHEET_ID = '1s3_pUm6o5JKTCoSQGAYIpQDM3Y9BmEVjgLA7TpvOQh8';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

export async function fetchSpreadsheetData(): Promise<Activity[]> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error('Failed to fetch spreadsheet');
    
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error loading sheet:', error);
    // Return mock data if fetch fails for demo purposes
    return getMockData();
  }
}

function parseCSV(csvText: string): Activity[] {
  const lines = csvText.split('\n');
  const headers = lines[0].replace(/"/g, '').split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const entry: any = {};
    
    // Attempt to map typical columns: Platform, Activity, Type, Status, Date
    // Headers in the sheet are roughly: Plataforma, Atividade, Tipo, Status, Data
    values.forEach((val, idx) => {
      const cleanVal = val.replace(/"/g, '').trim();
      const header = headers[idx];
      
      if (header.includes('plataforma')) entry.plataforma = cleanVal;
      else if (header.includes('atividade')) entry.atividade = cleanVal;
      else if (header.includes('tipo')) entry.tipo = cleanVal;
      else if (header.includes('status')) entry.status = cleanVal;
      else if (header.includes('data')) entry.data = cleanVal;
    });
    
    return entry as Activity;
  }).filter(a => a.plataforma); // Filter out empty lines
}

function getMockData(): Activity[] {
  return [
    { plataforma: 'Mobile', atividade: 'Login Fix', tipo: 'Bug', status: 'APROVADO', data: '2024-05-01' },
    { plataforma: 'Web', atividade: 'Dark Mode', tipo: 'Feature', status: 'PENDENTE', data: '2024-05-02' },
    { plataforma: 'API', atividade: 'Docs Update', tipo: 'Task', status: 'EM ANDAMENTO', data: '2024-05-03' },
    { plataforma: 'Mobile', atividade: 'Push Notifications', tipo: 'Feature', status: 'PENDENTE', data: '2024-05-04' },
    { plataforma: 'Web', atividade: 'Checkout Bug', tipo: 'Bug', status: 'APROVADO', data: '2024-05-05' },
    { plataforma: 'Desktop', atividade: 'Sync Fix', tipo: 'Bug', status: 'PENDENTE', data: '2024-05-06' },
  ];
}
