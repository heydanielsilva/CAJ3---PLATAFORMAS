
import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect, useMemo } from 'react';
import { fetchSpreadsheetData } from './services/sheetLoader';
import { getAiInsights } from './services/gemini';
import { Activity } from './types';
import { KpiCard } from './components/KpiCard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LabelList, PieChart, Pie, Cell, Label
} from 'recharts';
import { 
  BarChart3, CheckCircle2, AlertCircle, Layers, RefreshCcw, 
  FileSpreadsheet, Zap, Search, ChevronUp, ChevronDown, Filter, X
} from 'lucide-react';

const EXCLUDE_LIST = ['APROVADO', 'NÃO INSPECIONADO', 'STATUS', 'DATA'];

// Exact Brand Colors from Logo
const BRAND = {
  blue: '#00378b',
  orange: '#f36f21',
  green: '#10b981',
  slate: '#64748b',
  lightOrange: '#fff6ed',
  borderOrange: '#ffedd5'
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
      <div className="bg-[#f36f21] w-[40px] h-[40px] flex items-center justify-center ml-0.5 mt-0.5">
        <span 
          className="text-white font-[900] text-[34px] leading-none pb-1.5"
          style={{ fontFamily: '"Arial", "Inter", sans-serif' }}
        >
          a
        </span>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [data, setData] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string>('');
  
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [tableSearch, setTableSearch] = useState('');
  const [tablePlatform, setTablePlatform] = useState('All');
  const [tableStatus, setTableStatus] = useState('All');
  const [tableType, setTableType] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    try {
      const activities = await fetchSpreadsheetData();
      setData(activities);
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
    let result = [...baseData];
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
  }, [baseData, tableSearch, tablePlatform, tableStatus, tableType]);

  const stats = useMemo(() => {
    const totalActivities = globalFilteredData.length;
    const totalApprovedActivities = globalFilteredData.filter(a => a.status === 'APROVADO').length;
    const totalOpenActivities = totalActivities - totalApprovedActivities;
    const approvedPercentage = totalActivities > 0 ? Math.round((totalApprovedActivities / totalActivities) * 100) : 0;
    
    const platformMap: Record<string, { approved: number, open: number, total: number }> = {};
    globalFilteredData.forEach(a => {
      if (!platformMap[a.plataforma]) platformMap[a.plataforma] = { approved: 0, open: 0, total: 0 };
      platformMap[a.plataforma].total++;
      if (a.status === 'APROVADO') platformMap[a.plataforma].approved++;
      else platformMap[a.plataforma].open++;
    });

    const platformStats = Object.entries(platformMap).map(([name, vals]) => ({
      name,
      ...vals
    }));

    const platformCount = platformStats.length;
    const fullyApprovedPlatformsCount = platformStats.filter(p => p.open === 0).length;
    const pendingPlatformsCount = platformStats.filter(p => p.open > 0).length;

    const chartData = [...platformStats].sort((a, b) => b.total - a.total);
    const rankingData = [...platformStats].sort((a, b) => b.open - a.open);

    const donutData = [
      { name: 'Totalmente OK', value: fullyApprovedPlatformsCount, color: BRAND.green },
      { name: 'Com Pendências', value: pendingPlatformsCount, color: BRAND.orange }
    ];

    return { 
      totalItems: totalActivities, 
      totalOpen: totalOpenActivities, 
      approvedPercentage, 
      platformCount, 
      fullyApprovedPlatformsCount,
      pendingPlatformsCount,
      chartData, 
      rankingData, 
      donutData 
    };
  }, [globalFilteredData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCcw className="w-10 h-10 text-[#00378b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      <nav className="bg-white border-b border-slate-100 px-8 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <Logo />
            
            <div className="h-10 w-px bg-slate-200 hidden md:block mr-8" />
            
            <div>
              <h1 className="text-xl font-extrabold text-[#00378b] leading-none">Painel de Pendências</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Dados DOISa</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button onClick={fetchData} className="flex items-center gap-2 border border-slate-200 text-[#00378b] px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
              <RefreshCcw size={16} /> Atualizar
            </button>
            <a href="https://docs.google.com/spreadsheets/d/1s3_pUm6o5JKTCoSQGAYIpQDM3Y9BmEVjgLA7TpvOQh8/edit" target="_blank" className="flex items-center gap-2 bg-[#0f9d58] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0b8043] transition-all">
              <FileSpreadsheet size={16} /> Planilha
            </a>
            <button onClick={() => alert(aiInsights)} className="flex items-center gap-2 bg-[#6366f1] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">
              <Zap size={16} /> Insights IA
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Busca global..." 
                className="bg-[#f1f5f9] border-none rounded-xl pl-10 pr-4 py-2 text-xs w-64 focus:ring-2 focus:ring-[#00378b] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-8 py-8 space-y-8">
        
        {/* Filter Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} /> Filtro Rápido por Plataforma
            </p>
            {selectedPlatforms.length > 0 && (
              <button 
                onClick={clearGlobalFilters}
                className="flex items-center gap-1.5 text-[10px] font-black text-[#f36f21] uppercase tracking-widest hover:text-[#00378b] transition-colors"
              >
                <X size={12} /> Limpar Filtros
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

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title="Total Atividades" value={stats.totalItems} icon={<Layers size={22} />} iconBg="bg-blue-600" />
          <KpiCard title="Pendências Abertas" value={stats.totalOpen} icon={<AlertCircle size={22} />} iconBg="bg-orange-600" />
          <KpiCard title="Taxa de Conclusão" value={`${stats.approvedPercentage}%`} icon={<CheckCircle2 size={22} />} iconBg="bg-emerald-600" />
          <KpiCard title="Plataformas" value={stats.platformCount} icon={<BarChart3 size={22} />} iconBg="bg-amber-600" />
        </div>

        {/* Productivity Chart */}
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

        {/* Summary Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col h-[440px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#00378b] rounded-full"></div>
                <h3 className="text-xl font-extrabold text-slate-800">Visão Geral das Plataformas</h3>
              </div>
              <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">
                ESTADO ATUAL
              </span>
            </div>

            <div className="flex flex-1 flex-col md:flex-row items-center justify-center gap-12">
              <div className="relative w-[280px] h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
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

              <div className="flex flex-col gap-4 w-full md:w-auto min-w-[200px]">
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
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#f36f21] rounded-full"></div>
                <h3 className="text-xl font-extrabold text-slate-800">Ranking de Criticidade</h3>
              </div>
              <span className="text-[10px] font-black text-[#f36f21] bg-[#fff6ed] px-3 py-1 rounded-full border border-[#ffedd5] uppercase tracking-widest">
                PENDÊNCIAS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-4">
              {stats.rankingData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between p-4 bg-white border border-slate-50 rounded-2xl hover:border-blue-100 hover:bg-slate-50/30 transition-all">
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg flex-shrink-0 ${
                      idx === 0 ? 'bg-[#f36f21]' :
                      idx === 1 ? 'bg-[#f58e5a]' :
                      idx === 2 ? 'bg-[#f8ae89]' :
                      'bg-slate-200 text-slate-500 shadow-none'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex flex-col min-w-0">
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

        {/* Detailed Table Section */}
        <section className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-7 bg-[#00388b] rounded-full"></div>
              <h2 className="text-xl font-bold text-slate-800">Detalhamento das Atividades</h2>
            </div>
            <div className="bg-[#f1f5f9] text-[#64748b] text-[10px] font-black tracking-widest px-4 py-2 rounded-full border border-slate-200 uppercase">
              {tableFilteredData.length} REGISTROS
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesquisar:</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Atividade..." 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-[#00388b] transition-all outline-none"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plataforma:</label>
              <select 
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-[#00388b] appearance-none transition-all outline-none"
                value={tablePlatform}
                onChange={(e) => setTablePlatform(e.target.value)}
              >
                <option value="All">Todas</option>
                {platformsList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</label>
              <select 
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-[#00388b] appearance-none transition-all outline-none"
                value={tableStatus}
                onChange={(e) => setTableStatus(e.target.value)}
              >
                <option value="All">Todos</option>
                {statusList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo:</label>
              <select 
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-[#00388b] appearance-none transition-all outline-none"
                value={tableType}
                onChange={(e) => setTableType(e.target.value)}
              >
                <option value="All">Todos</option>
                {typeList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="border border-slate-100 rounded-[20px] overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-4 bg-[#f8fafc] text-[10px] font-black text-[#94a3b8] uppercase tracking-widest border-b border-slate-50">
              <div className="col-span-8">Atividade</div>
              <div className="col-span-2 text-center">Plataforma</div>
              <div className="col-span-1 text-center">Tipo</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-slate-50 bg-white">
              {tableFilteredData.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 px-6 py-6 items-center hover:bg-[#f8fafc]/50 transition-all group">
                  <div className="col-span-8 space-y-1">
                    <h4 className="text-[14px] font-bold text-slate-800 leading-tight group-hover:text-[#00388b] transition-colors">{item.atividade}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      ID: ITEM-{idx} <span className="w-1 h-1 bg-slate-200 rounded-full"></span> {item.responsavel || 'DOISa OPS'}
                    </p>
                  </div>
                  <div className="col-span-2 text-center text-sm font-bold text-slate-600">
                    {item.plataforma}
                  </div>
                  <div className="col-span-1 text-center text-sm font-bold text-slate-600">
                    {item.tipo}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                      item.status === 'APROVADO' 
                        ? 'bg-[#EBFDF5] text-[#10B981] border-[#D1FAE5]' 
                        : 'bg-[#fff6ed] text-[#f36f21] border-[#ffedd5]'
                    }`}>
                      {item.status === 'APROVADO' ? 'OK' : 'PENDENTE'}
                    </span>
                  </div>
                </div>
              ))}
              {tableFilteredData.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-bold text-sm">Sem resultados para os filtros selecionados.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-slate-400 text-sm font-medium border-t border-slate-100 bg-white">
        &copy; {new Date().getFullYear()} • DOISa • Inteligência de Dados Corporativos
      </footer>
    </div>
  );
};

export default App;
