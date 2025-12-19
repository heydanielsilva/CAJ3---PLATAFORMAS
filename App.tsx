
import React, { useState, useEffect, useMemo } from 'react';
import { fetchSpreadsheetData, fetchMapData } from './services/sheetLoader';
import { getAiInsights } from './services/gemini';
import { Activity, MapPoint } from './types';
import { KpiCard } from './components/KpiCard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LabelList, PieChart, Pie, Cell, Label
} from 'recharts';
import { 
  BarChart3, CheckCircle2, AlertCircle, Layers, RefreshCcw, 
  Zap, Search, X, LayoutGrid, Calendar, Table as TableIcon, Filter, Target, Map as MapIcon, Globe
} from 'lucide-react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const EXCLUDE_LIST = ['APROVADO', 'NÃO INSPECIONADO', 'STATUS', 'DATA'];

const BRAND = {
  blue: '#00378b',
  orange: '#f36f21',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#facc15',
  slate: '#64748b',
  lightOrange: '#fff6ed',
  borderOrange: '#ffedd5',
  purple: '#1e1b4b',
  lightGreen: '#dcfce7',
  lightRed: '#fee2e2',
  lightYellow: '#fef08a',
  lightGreyCell: '#f1f5f9'
};

const Logo = () => (
  <div className="flex items-center select-none mr-8">
    <div className="flex items-center">
      <span 
        className="text-[#00378b] font-[900] text-[42px] tracking-[-0.06em] leading-none"
        style={{ fontFamily: '"Arial Black", "Inter", sans-serif' }}
      >
        DOIS
      </span>
      <div className="bg-[#f36f21] w-[42px] h-[42px] flex items-center justify-center ml-0.5">
        <span 
          className="text-white font-[900] text-[36px] leading-none mb-1.5"
          style={{ fontFamily: '"Arial", "Inter", sans-serif' }}
        >
          a
        </span>
      </div>
    </div>
  </div>
);

type Tab = 'GERAL' | 'CONTROLE' | 'MAPA';

const App: React.FC = () => {
  const [data, setData] = useState<Activity[]>([]);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('GERAL');
  
  // Global Filters
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Local Table Specific Filters
  const [tableSearch, setTableSearch] = useState('');
  const [tablePlatform, setTablePlatform] = useState('All');
  const [tableStatus, setTableStatus] = useState('All');
  const [tableType, setTableType] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activities, geoPoints] = await Promise.all([
        fetchSpreadsheetData(),
        fetchMapData()
      ]);
      setData(activities);
      setMapPoints(geoPoints);
      getAiInsights(activities).then(setAiInsights);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const baseData = useMemo(() => {
    return data.filter(a => a.plataforma && !EXCLUDE_LIST.includes(a.plataforma.toUpperCase()));
  }, [data]);

  const platformsList = useMemo(() => {
    const pSet = new Set(baseData.map(a => a.plataforma));
    return Array.from(pSet).sort();
  }, [baseData]);

  const statusList = useMemo(() => {
    const sSet = new Set(baseData.map(a => a.status));
    return Array.from(sSet).sort();
  }, [baseData]);

  const typeList = useMemo(() => {
    const tSet = new Set(baseData.map(a => a.tipo));
    return Array.from(tSet).sort();
  }, [baseData]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) return prev.filter(p => p !== platform);
      return [...prev, platform];
    });
  };

  const clearGlobalFilters = () => {
    setSelectedPlatforms([]);
    setSearchTerm('');
  };

  const globalFilteredData = useMemo(() => {
    let result = [...baseData];
    if (selectedPlatforms.length > 0) {
      result = result.filter(a => selectedPlatforms.includes(a.plataforma));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.atividade.toLowerCase().includes(term) || 
        a.plataforma.toLowerCase().includes(term)
      );
    }
    return result;
  }, [baseData, selectedPlatforms, searchTerm]);

  const tableFilteredData = useMemo(() => {
    let result = [...globalFilteredData];
    if (tableSearch) {
      result = result.filter(a => a.atividade.toLowerCase().includes(tableSearch.toLowerCase()));
    }
    if (tablePlatform !== 'All') {
      result = result.filter(a => a.plataforma === tablePlatform);
    }
    if (tableStatus !== 'All') {
      result = result.filter(a => a.status === tableStatus);
    }
    if (tableType !== 'All') {
      result = result.filter(a => a.tipo === tableType);
    }
    return result;
  }, [globalFilteredData, tableSearch, tablePlatform, tableStatus, tableType]);

  const stats = useMemo(() => {
    const totalActivities = globalFilteredData.length;
    const totalApprovedActivities = globalFilteredData.filter(a => a.status === 'APROVADO').length;
    const totalOpenActivities = totalActivities - totalApprovedActivities;
    const approvedPercentage = totalActivities > 0 ? Math.round((totalApprovedActivities / totalActivities) * 100) : 0;
    
    const platformMap: Record<string, { approved: number, open: number, total: number, progress: number }> = {};
    globalFilteredData.forEach(a => {
      if (!platformMap[a.plataforma]) platformMap[a.plataforma] = { approved: 0, open: 0, total: 0, progress: 0 };
      platformMap[a.plataforma].total++;
      if (a.status === 'APROVADO') platformMap[a.plataforma].approved++;
      else platformMap[a.plataforma].open++;
    });

    Object.keys(platformMap).forEach(key => {
      const p = platformMap[key];
      p.progress = p.total > 0 ? Math.round((p.approved / p.total) * 100) : 0;
    });

    const platformStats = Object.entries(platformMap).map(([name, vals]) => ({
      name,
      ...vals
    }));

    const chartData = [...platformStats].sort((a, b) => b.total - a.total);
    const rankingData = [...platformStats].sort((a, b) => b.open - a.open);

    const donutData = [
      { name: 'Totalmente OK', value: platformStats.filter(p => p.open === 0).length, color: BRAND.green },
      { name: 'Com Pendências', value: platformStats.filter(p => p.open > 0).length, color: BRAND.orange }
    ];

    return { 
      totalItems: totalActivities, 
      totalOpen: totalOpenActivities, 
      approvedPercentage, 
      platformCount: platformStats.length,
      fullyApprovedPlatformsCount: donutData[0].value,
      pendingPlatformsCount: donutData[1].value,
      chartData, 
      rankingData, 
      donutData,
      platformMap
    };
  }, [globalFilteredData]);

  const farolMatrix = useMemo(() => {
    const categories: Record<string, Record<string, Record<string, Activity>>> = {};
    globalFilteredData.forEach(item => {
      const cat = item.categoria || 'SEM CATEGORIA';
      if (!categories[cat]) categories[cat] = {};
      if (!categories[cat][item.atividade]) categories[cat][item.atividade] = {};
      categories[cat][item.atividade][item.plataforma] = item;
    });
    return categories;
  }, [globalFilteredData]);

  const renderGeral = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Layers size={14} /> Filtro Rápido por Plataforma (Afeta KPIs, Gráficos e Tabela)
          </p>
          {(selectedPlatforms.length > 0 || searchTerm) && (
            <button 
              onClick={clearGlobalFilters}
              className="flex items-center gap-1.5 text-[10px] font-black text-[#f36f21] uppercase tracking-widest hover:text-[#00378b] transition-colors bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100"
            >
              <X size={12} /> Limpar Filtros Globais
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={clearGlobalFilters}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedPlatforms.length === 0 
              ? 'bg-[#00378b] text-white border-[#00388b] shadow-md shadow-blue-100' 
              : 'bg-white text-slate-500 border-slate-200 hover:border-[#00388b] hover:text-[#00388b]'
            }`}
          >
            Todas
          </button>
          {platformsList.map(p => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedPlatforms.includes(p)
                ? 'bg-[#00378b] text-white border-[#00388b] shadow-md shadow-blue-100' 
                : 'bg-white text-slate-500 border-slate-200 hover:border-[#00388b] hover:text-[#00388b]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Atividades" value={stats.totalItems} icon={<Layers size={22} />} iconBg="bg-blue-600" />
        <KpiCard title="Pendências Abertas" value={stats.totalOpen} icon={<AlertCircle size={22} />} iconBg="bg-orange-600" />
        <KpiCard title="Taxa de Conclusão" value={`${stats.approvedPercentage}%`} icon={<CheckCircle2 size={22} />} iconBg="bg-emerald-600" />
        <KpiCard title="Plataformas" value={stats.platformCount} icon={<BarChart3 size={22} />} iconBg="bg-amber-600" />
      </div>

      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-1.5 h-6 bg-[#00378b] rounded-full"></div>
          <h3 className="text-xl font-extrabold text-slate-800">Produtividade por Plataforma</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="approved" stackId="a" fill={BRAND.green} barSize={45}>
                 <LabelList dataKey="approved" position="center" style={{ fill: 'white', fontWeight: 'bold', fontSize: '10px' }} />
              </Bar>
              <Bar dataKey="open" stackId="a" fill={BRAND.orange} radius={[2, 2, 0, 0]} barSize={45}>
                 <LabelList dataKey="open" position="center" style={{ fill: 'white', fontWeight: 'bold', fontSize: '10px' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col h-[440px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#00378b] rounded-full"></div>
              <h3 className="text-xl font-extrabold text-slate-800">Visão Geral das Plataformas</h3>
            </div>
          </div>
          <div className="flex flex-1 flex-col md:flex-row items-center justify-center gap-12">
            <div className="relative w-[280px] h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.donutData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                    {stats.donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    <Label
                      value={stats.platformCount}
                      position="center"
                      content={({ viewBox }) => {
                        const { cx, cy } = viewBox as any;
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={cx} dy="-0.5em" className="text-4xl font-black fill-[#00378b]">{stats.platformCount}</tspan>
                            <tspan x={cx} dy="1.5em" className="text-[10px] font-black fill-slate-400 uppercase tracking-widest">PLATAFORMAS</tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-4 min-w-[200px]">
              <div className="bg-[#ecfdf5] border border-[#d1fae5] rounded-2xl p-6 flex flex-col gap-1">
                <span className="text-[10px] font-black text-[#059669] uppercase tracking-widest">TOTALMENTE OK</span>
                <span className="text-4xl font-black text-slate-800">{stats.fullyApprovedPlatformsCount}</span>
              </div>
              <div className="bg-[#fff6ed] border border-[#ffedd5] rounded-2xl p-6 flex flex-col gap-1">
                <span className="text-[10px] font-black text-[#f36f21] uppercase tracking-widest">COM PENDÊNCIAS</span>
                <span className="text-4xl font-black text-slate-800">{stats.pendingPlatformsCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col h-[440px]">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1.5 h-6 bg-[#f36f21] rounded-full"></div>
            <h3 className="text-xl font-extrabold text-slate-800">Ranking de Criticidade</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-4">
            {stats.rankingData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-white border border-slate-50 rounded-2xl hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${idx < 3 ? 'bg-[#f36f21]' : 'bg-slate-200 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex flex-col min-0">
                    <span className="text-lg font-black text-slate-800 tracking-tight truncate">{item.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.total} ATIVIDADES</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-3xl font-black text-[#f36f21]">{item.open}</span>
                  <span className="text-[10px] font-black text-[#f8ae89] uppercase tracking-widest pt-1">ABERTAS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-7 bg-[#00388b] rounded-full"></div>
            <h2 className="text-xl font-bold text-slate-800">Detalhamento das Atividades</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesquisar na Tabela:</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Atividade..." className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#00388b] outline-none" value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plataforma:</label>
            <select className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00388b] outline-none" value={tablePlatform} onChange={(e) => setTablePlatform(e.target.value)}>
              <option value="All">Todas</option>
              {platformsList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</label>
            <select className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00388b] outline-none" value={tableStatus} onChange={(e) => setTableStatus(e.target.value)}>
              <option value="All">Todos</option>
              {statusList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo:</label>
            <select className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00388b] outline-none" value={tableType} onChange={(e) => setTableType(e.target.value)}>
              <option value="All">Todos</option>
              {typeList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="border border-slate-100 rounded-[20px] overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-slate-50 bg-white">
            {tableFilteredData.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 px-6 py-6 items-center hover:bg-slate-50 transition-all">
                <div className="col-span-8">
                  <h4 className="text-sm font-bold text-slate-800 leading-tight">{item.atividade}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ref: {idx}</p>
                </div>
                <div className="col-span-2 text-center text-xs font-bold text-slate-500">{item.plataforma}</div>
                <div className="col-span-2 flex justify-end">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${item.status === 'APROVADO' ? 'bg-[#EBFDF5] text-[#10B981] border-[#D1FAE5]' : 'bg-[#fff6ed] text-[#f36f21] border-[#ffedd5]'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const renderFarol = () => (
    <div className="bg-white rounded-[12px] shadow-lg border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#1e1b4b] px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <TableIcon size={20} className="text-[#f36f21]" />
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Matriz Farol de Controle de Execução</h2>
        </div>
        <div className="flex gap-4 text-[9px] font-black tracking-widest">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#dcfce7] border border-slate-400"></div> Aprovado</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#fee2e2] border border-slate-400"></div> Reprovado</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#fef08a] border border-slate-400"></div> Parc. Aprovado</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#f1f5f9] border border-slate-400"></div> Não Inspecionado</div>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-300">
              <th className="text-left px-4 py-3 border-r border-slate-200 min-w-[300px] text-slate-500 font-black uppercase tracking-widest">Atividade / Verificação</th>
              <th className="px-3 py-3 border-r border-slate-200 text-slate-500 font-black uppercase tracking-widest w-[80px] text-center">Impeditivo</th>
              {platformsList.map(p => (
                <th key={p} className="px-2 py-3 border-r border-slate-200 text-slate-500 font-black uppercase tracking-tight text-center min-w-[85px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] leading-tight">{p}</span>
                    <span className="text-[13px] font-black text-[#00378b] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                      {stats.platformMap[p]?.progress || 0}%
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(farolMatrix).map(([category, activities], catIdx) => (
              <React.Fragment key={category}>
                <tr className="bg-[#1e1b4b] text-white border-b border-slate-500">
                  <td colSpan={2} className="px-4 py-3 font-black uppercase tracking-[0.1em] text-[10px] italic">{catIdx + 1}. {category}</td>
                  {platformsList.map(p => <td key={p} className="px-2 py-3 border-r border-slate-500"></td>)}
                </tr>
                {Object.entries(activities).map(([activityName, platforms]) => {
                  const activityRows = Object.values(platforms) as Activity[];
                  const isImpeditivo = activityRows.some(p => p.impeditivo?.toLowerCase() === 'sim');
                  return (
                    <tr key={activityName} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 border-r border-slate-200 text-slate-700 font-medium">{activityName}</td>
                      <td className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-400">{isImpeditivo ? 'Sim' : 'Não'}</td>
                      {platformsList.map(pName => {
                        const item = platforms[pName];
                        let cellColor = BRAND.lightGreyCell;
                        if (item) {
                          const s = item.status.toUpperCase();
                          if (s === 'APROVADO') cellColor = BRAND.lightGreen;
                          else if (s === 'REPROVADO') cellColor = BRAND.lightRed;
                          else cellColor = BRAND.lightYellow;
                        }
                        return <td key={pName} className="px-2 py-2.5 border-r border-slate-200 text-center" style={{ backgroundColor: cellColor }}>{item && <CheckCircle2 size={12} className="mx-auto text-black/10" />}</td>;
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMap = () => {
    const center: [number, number] = mapPoints.length > 0 ? [mapPoints[0].latitude, mapPoints[0].longitude] : [-15.7801, -47.9292];
    
    return (
      <div className="space-y-8 animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <Globe className="text-[#f36f21]" size={28} />
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Monitoramento Geográfico</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visualização em tempo real de pontos operacionais</p>
            </div>
          </div>
          
          <div className="h-[650px] w-full rounded-[24px] overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
            <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {mapPoints.map((point, idx) => {
                const label = point.aeg || (idx + 1).toString();
                const labeledIcon = L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div class="map-marker">${label}</div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                });
                return (
                  <Marker key={idx} position={[point.latitude, point.longitude]} icon={labeledIcon}>
                    <Popup>
                      <div className="p-1 min-w-[120px]">
                        <p className="text-xs font-black uppercase text-[#00378b] mb-1">{point.nome}</p>
                        <p className="text-[10px] text-slate-600 leading-tight font-medium">{point.descricao || 'Sem descrição adicional.'}</p>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AEG: {label}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
          
          <div className="absolute bottom-12 right-12 z-[1000] bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PONTOS ATIVOS</span>
            <span className="text-4xl font-black text-[#00378b]">{mapPoints.length}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCcw className="w-10 h-10 text-[#00378b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo />
          
          <div className="bg-[#f1f5f9] p-1.5 rounded-[18px] flex items-center gap-1 border border-slate-100 shadow-inner">
            <button 
              onClick={() => setActiveTab('GERAL')}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'GERAL' ? 'bg-white text-[#00378b] shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={16} className={activeTab === 'GERAL' ? 'text-[#00378b]' : 'text-slate-400'} />
              Geral
            </button>
            <button 
              onClick={() => setActiveTab('CONTROLE')}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'CONTROLE' ? 'bg-white text-[#00378b] shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar size={16} className={activeTab === 'CONTROLE' ? 'text-[#00378b]' : 'text-slate-400'} />
              Controle
            </button>
            <button 
              onClick={() => setActiveTab('MAPA')}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'MAPA' ? 'bg-white text-[#00378b] shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MapIcon size={16} className={activeTab === 'MAPA' ? 'text-[#00378b]' : 'text-slate-400'} />
              Mapa
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2.5 bg-slate-100 text-[#00378b] rounded-xl hover:bg-slate-200 transition-all border border-slate-200">
              <RefreshCcw size={18} />
            </button>
            <button onClick={() => alert(aiInsights)} className="flex items-center gap-2 bg-[#6366f1] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
              <Zap size={16} /> Insights IA
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Busca rápida..." 
                className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs w-48 focus:w-64 focus:ring-2 focus:ring-[#00378b] transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-8 py-8">
        {activeTab === 'GERAL' && renderGeral()}
        {activeTab === 'CONTROLE' && renderFarol()}
        {activeTab === 'MAPA' && renderMap()}
      </main>

      <footer className="max-w-[1600px] mx-auto px-8 py-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          OPERACIONAL DOISa • {activeTab === 'MAPA' ? 'MAPA OPERACIONAL' : 'DASHBOARD ESTRATÉGICO'}
        </div>
        <div>© {new Date().getFullYear()} DOISa INTELLIGENCE • TODOS OS DIREITOS RESERVADOS</div>
      </footer>
    </div>
  );
};

export default App;
