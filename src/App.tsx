/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Trophy, TrendingUp, ChevronLeft, Loader2, Info, CheckCircle2, XCircle, History, ArrowUpAZ, ArrowDownZA, Zap, Target, PieChart, Gift, X, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeMatch, fetchRecentResults, generateSpecialTips, searchMatchesRealTime } from './services/geminiService';
import { Match } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MOCK_MATCHES: Match[] = [
  { id: '1', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', league: 'La Liga', date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], time: '16:00', odds: { home: 2.1, draw: 3.4, away: 3.2 } },
  { id: '2', homeTeam: 'Manchester City', awayTeam: 'Liverpool', league: 'Premier League', date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], time: '12:30', odds: { home: 1.8, draw: 3.8, away: 4.2 } },
  { id: '3', homeTeam: 'Bayern Munich', awayTeam: 'Dortmund', league: 'Bundesliga', date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], time: '15:30', odds: { home: 1.5, draw: 4.5, away: 5.5 } },
  { id: '4', homeTeam: 'PSG', awayTeam: 'Marseille', league: 'Ligue 1', date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], time: '20:00', odds: { home: 1.4, draw: 4.8, away: 6.5 } },
  { id: '5', homeTeam: 'Inter Milan', awayTeam: 'AC Milan', league: 'Serie A', date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0], time: '19:45', odds: { home: 2.3, draw: 3.2, away: 3.1 } },
  { id: '6', homeTeam: 'Chelsea', awayTeam: 'Arsenal', league: 'Premier League', date: new Date().toISOString().split('T')[0], time: '14:00', odds: { home: 2.5, draw: 3.3, away: 2.8 }, result: '1-2' },
];

interface SpecialTip {
  homeTeam: string;
  awayTeam: string;
  league: string;
  tip: string;
  odds: number;
  reasoning: string;
  date?: string;
  time?: string;
}

export default function App() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortOrderOdds, setSortOrderOdds] = useState<'asc' | 'desc' | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'results'>('upcoming');
  const [history, setHistory] = useState<Match[]>(() => {
    const saved = localStorage.getItem('ai_predictor_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [specialTips, setSpecialTips] = useState<SpecialTip[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [tipCategory, setTipCategory] = useState('');
  const [realTimeMatches, setRealTimeMatches] = useState<Match[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    localStorage.setItem('ai_predictor_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    // Load daily matches on mount
    loadDailyMatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'results' && history.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  const loadDailyMatches = async () => {
    setLoadingSearch(true);
    setHasSearched(true);
    const today = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(today.getDate() + 5);
    
    const todayStr = today.toISOString().split('T')[0];
    const rangeStr = `de ${todayStr} até ${fiveDaysLater.toISOString().split('T')[0]}`;
    
    setSelectedDate(''); // Clear date filter to show the range
    try {
      const results = await searchMatchesRealTime("principais jogos de futebol de hoje e dos próximos dias das ligas de elite", rangeStr);
      setRealTimeMatches(results);
    } catch (error) {
      console.error("Erro ao carregar jogos diários:", error);
      setHasSearched(false); // Fallback to mock if AI fails
    } finally {
      setLoadingSearch(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchRecentResults();
      setHistory(data.map((m: any, i: number) => ({ ...m, id: `hist-${i}` })));
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSpecialTips = async (category: string) => {
    setTipCategory(category);
    setLoadingTips(true);
    setShowTipsModal(true);
    setSpecialTips([]);
    try {
      const tips = await generateSpecialTips(category);
      setSpecialTips(tips);
    } catch (error) {
      console.error("Erro ao gerar dicas especiais:", error);
    } finally {
      setLoadingTips(false);
    }
  };

  const getFavorite = (match: Match) => {
    if (!match.odds) return 'N/A';
    const { home, draw, away } = match.odds;
    if (home < away && home < draw) return match.homeTeam;
    if (away < home && away < draw) return match.awayTeam;
    return 'Empate';
  };

  const filteredMatches = MOCK_MATCHES.filter(m => {
    const matchesSearch = m.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.league.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = selectedDate === '' || m.date === selectedDate;
    
    return matchesSearch && matchesDate;
  });

  const getMinOdd = (match: Match) => {
    if (!match.odds) return 0;
    return Math.min(match.odds.home, match.odds.draw, match.odds.away);
  };

  const sortMatches = (matches: Match[]) => {
    return [...matches].sort((a, b) => {
      if (sortOrderOdds) {
        const oddA = getMinOdd(a);
        const oddB = getMinOdd(b);
        return sortOrderOdds === 'asc' ? oddA - oddB : oddB - oddA;
      }
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  const displayMatches = sortMatches(hasSearched ? realTimeMatches : filteredMatches);

  const handleAnalyze = async (match: Match) => {
    setSelectedMatch(match);
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await analyzeMatch(match.homeTeam, match.awayTeam, match.league, match.date);
      setAnalysis(result);
    } catch (error) {
      setAnalysis("Erro ao gerar análise. Verifique sua chave de API ou conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleRealTimeSearch = async () => {
    if (!searchQuery && !selectedDate) return;
    setLoadingSearch(true);
    setHasSearched(true);
    
    let dateToSearch = selectedDate;
    if (!selectedDate) {
      const today = new Date();
      const fiveDaysLater = new Date();
      fiveDaysLater.setDate(today.getDate() + 5);
      dateToSearch = `de ${today.toISOString().split('T')[0]} até ${fiveDaysLater.toISOString().split('T')[0]}`;
    }

    try {
      const results = await searchMatchesRealTime(searchQuery, dateToSearch);
      setRealTimeMatches(results);
    } catch (error) {
      console.error("Erro na pesquisa real-time:", error);
    } finally {
      setLoadingSearch(false);
    }
  };

  const goBack = () => {
    setSelectedMatch(null);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-bg font-sans text-ink selection:bg-accent selection:text-white">
      {/* Header */}
      <header className="border-b border-line p-6 flex justify-between items-center sticky top-0 bg-bg/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Trophy className="text-accent w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic">YURI PROGNOSTICO</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setSelectedMatch(null);
              setAnalysis(null);
              setActiveTab('upcoming');
            }}
            className="flex items-center gap-2 bg-accent text-white px-3 md:px-4 py-2 font-mono text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-ink transition-all shadow-lg shadow-accent/20"
          >
            <TrendingUp className="w-3 h-3" /> <span className="hidden sm:inline">Ver Próximos Jogos</span><span className="sm:hidden">Jogos</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono opacity-50 uppercase">
            <TrendingUp className="w-4 h-4" />
            <span>Odds até 5.0</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {!selectedMatch ? (
          <div className="space-y-8">
            {/* Special Tips Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => handleSpecialTips('daily-sure')}
                disabled={loadingTips}
                className="flex flex-col items-center justify-center p-4 border border-line bg-white/50 hover:bg-accent hover:text-white transition-all group disabled:opacity-50"
              >
                {loadingTips && tipCategory === 'daily-sure' ? (
                  <Loader2 className="w-6 h-6 mb-2 text-accent group-hover:text-white animate-spin" />
                ) : (
                  <Zap className="w-6 h-6 mb-2 text-accent group-hover:text-white" />
                )}
                <span className="text-[10px] font-mono uppercase font-black tracking-widest">Daily Sure Tips</span>
              </button>
              <button 
                onClick={() => handleSpecialTips('football-tips')}
                disabled={loadingTips}
                className="flex flex-col items-center justify-center p-4 border border-line bg-white/50 hover:bg-accent hover:text-white transition-all group disabled:opacity-50"
              >
                {loadingTips && tipCategory === 'football-tips' ? (
                  <Loader2 className="w-6 h-6 mb-2 text-accent group-hover:text-white animate-spin" />
                ) : (
                  <Target className="w-6 h-6 mb-2 text-accent group-hover:text-white" />
                )}
                <span className="text-[10px] font-mono uppercase font-black tracking-widest">Football Tips</span>
              </button>
              <button 
                onClick={() => handleSpecialTips('over-under')}
                disabled={loadingTips}
                className="flex flex-col items-center justify-center p-4 border border-line bg-white/50 hover:bg-accent hover:text-white transition-all group disabled:opacity-50"
              >
                {loadingTips && tipCategory === 'over-under' ? (
                  <Loader2 className="w-6 h-6 mb-2 text-accent group-hover:text-white animate-spin" />
                ) : (
                  <PieChart className="w-6 h-6 mb-2 text-accent group-hover:text-white" />
                )}
                <span className="text-[10px] font-mono uppercase font-black tracking-widest">Over-Under</span>
              </button>
              <button 
                onClick={() => handleSpecialTips('bonus-surprise')}
                disabled={loadingTips}
                className="flex flex-col items-center justify-center p-4 border border-line bg-white/50 hover:bg-accent hover:text-white transition-all group disabled:opacity-50"
              >
                {loadingTips && tipCategory === 'bonus-surprise' ? (
                  <Loader2 className="w-6 h-6 mb-2 text-accent group-hover:text-white animate-spin" />
                ) : (
                  <Gift className="w-6 h-6 mb-2 text-accent group-hover:text-white" />
                )}
                <span className="text-[10px] font-mono uppercase font-black tracking-widest">Bonus-Surprise</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border border-line bg-white/30">
              <button 
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  "flex-1 py-4 font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'upcoming' ? "bg-ink text-bg" : "hover:bg-ink/5"
                )}
              >
                <TrendingUp className="w-4 h-4" /> Próximos Jogos
              </button>
              <button 
                onClick={() => setActiveTab('results')}
                className={cn(
                  "flex-1 py-4 font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'results' ? "bg-ink text-bg" : "hover:bg-ink/5"
                )}
              >
                <History className="w-4 h-4" /> Resultados Reais
              </button>
            </div>

            {activeTab === 'upcoming' ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Filters */}
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                      <input 
                        type="text" 
                        placeholder="Pesquisar times ou ligas..." 
                        className="w-full bg-transparent border border-line p-4 pl-12 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="relative w-full md:w-64">
                      <input 
                        type="date" 
                        className="w-full bg-transparent border border-line p-4 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                      {selectedDate && (
                        <button 
                          onClick={() => {
                            setSelectedDate('');
                            setHasSearched(false);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase opacity-50 hover:opacity-100"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={handleRealTimeSearch}
                      disabled={loadingSearch || (!searchQuery && !selectedDate)}
                      className="bg-accent text-white px-8 py-4 font-mono text-xs uppercase font-black tracking-widest hover:bg-ink transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loadingSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Pesquisar na Web
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={loadDailyMatches}
                      className={cn(
                        "px-4 py-2 font-mono text-[10px] uppercase tracking-widest border border-line transition-all",
                        selectedDate === '' && hasSearched ? "bg-accent text-white border-accent" : "hover:bg-ink hover:text-bg"
                      )}
                    >
                      Próximos 5 Dias
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedDate('');
                        setHasSearched(false);
                      }}
                      className={cn(
                        "px-4 py-2 font-mono text-[10px] uppercase tracking-widest border border-line transition-all",
                        selectedDate === '' && !hasSearched ? "bg-accent text-white border-accent" : "hover:bg-ink hover:text-bg"
                      )}
                    >
                      Limpar Filtros
                    </button>
                    <button 
                      onClick={loadDailyMatches}
                      disabled={loadingSearch}
                      className="bg-ink text-bg px-4 py-2 font-mono text-[10px] uppercase tracking-widest border border-line hover:bg-accent hover:text-white transition-all flex items-center gap-2"
                    >
                      <Zap className="w-3 h-3" /> Atualizar Jogos IA
                    </button>
                    <button 
                      onClick={() => {
                        setSortOrderOdds(prev => prev === 'asc' ? 'desc' : (prev === 'desc' ? null : 'asc'));
                      }}
                      className={cn(
                        "px-4 py-2 font-mono text-[10px] uppercase tracking-widest border border-line hover:bg-ink hover:text-bg transition-all flex items-center gap-2",
                        sortOrderOdds !== null && "bg-accent text-white border-accent"
                      )}
                    >
                      {sortOrderOdds === 'asc' ? <ArrowUpAZ className="w-3 h-3" /> : (sortOrderOdds === 'desc' ? <ArrowDownZA className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                      Odds: {sortOrderOdds === 'asc' ? 'Menores Primeiro' : (sortOrderOdds === 'desc' ? 'Maiores Primeiro' : 'Padrão')}
                    </button>
                    <button 
                      onClick={() => {
                        setSortOrderOdds(null);
                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      }}
                      className={cn(
                        "ml-auto px-4 py-2 font-mono text-[10px] uppercase tracking-widest border border-line hover:bg-ink hover:text-bg transition-all flex items-center gap-2",
                        sortOrderOdds === null && "bg-accent text-white border-accent"
                      )}
                    >
                      {sortOrder === 'asc' ? <ArrowUpAZ className="w-3 h-3" /> : <ArrowDownZA className="w-3 h-3" />}
                      Data: {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                    </button>
                  </div>
                </div>

                {/* Match List */}
                {loadingSearch ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 border border-line border-dashed">
                    <Loader2 className="w-12 h-12 text-accent animate-spin" />
                    <p className="font-mono text-sm animate-pulse uppercase tracking-[0.2em]">IA Buscando Jogos Reais...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displayMatches.map((match) => (
                      <div 
                        key={match.id} 
                        className="bg-white border border-line p-6 hover:shadow-xl hover:border-accent transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => handleAnalyze(match)}
                      >
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent font-bold">
                              {match.league}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono opacity-40 uppercase">
                                {match.date}
                              </span>
                              {match.time && (
                                <>
                                  <span className="text-[10px] opacity-20">•</span>
                                  <span className="text-[10px] font-mono text-accent font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {match.time}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {match.result && (
                            <span className="bg-ink text-bg px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                              Final: {match.result}
                            </span>
                          )}
                        </div>

                        {/* Teams Section */}
                        <div className="flex items-center justify-between gap-4 mb-8">
                          <div className="flex-1 text-center">
                            <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-2">
                              {match.homeTeam}
                            </h4>
                            <span className="text-[9px] font-mono opacity-30 uppercase">Mandante</span>
                          </div>
                          <div className="px-4 py-2 bg-line/5 rounded-full font-mono text-[10px] opacity-40">
                            VS
                          </div>
                          <div className="flex-1 text-center">
                            <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-2">
                              {match.awayTeam}
                            </h4>
                            <span className="text-[9px] font-mono opacity-30 uppercase">Visitante</span>
                          </div>
                        </div>

                        {/* Odds & Recommendation Grid */}
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-line">
                          <div className="space-y-3">
                            <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest block">Odds de Mercado</span>
                            <div className="flex gap-2">
                              <div className="flex-1 bg-line/5 p-2 text-center rounded">
                                <span className="block text-[8px] opacity-40 uppercase mb-1">1</span>
                                <span className="font-mono text-xs font-bold">{match.odds?.home.toFixed(2)}</span>
                              </div>
                              <div className="flex-1 bg-line/5 p-2 text-center rounded">
                                <span className="block text-[8px] opacity-40 uppercase mb-1">X</span>
                                <span className="font-mono text-xs font-bold">{match.odds?.draw.toFixed(2)}</span>
                              </div>
                              <div className="flex-1 bg-line/5 p-2 text-center rounded">
                                <span className="block text-[8px] opacity-40 uppercase mb-1">2</span>
                                <span className="font-mono text-xs font-bold">{match.odds?.away.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 border-l border-line pl-4">
                            <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest block">Prognóstico IA</span>
                            <div className="bg-accent/5 p-2 rounded border border-accent/10">
                              {match.aiRecommendation ? (
                                <div className="flex flex-col">
                                  <span className="text-accent font-black text-[11px] uppercase italic leading-tight">
                                    {match.aiRecommendation}
                                  </span>
                                  <span className="text-[9px] font-mono opacity-60 mt-1">
                                    Odd Sugerida: @{match.aiSuggestedOdds?.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-accent font-black text-[11px] uppercase italic leading-tight">
                                    {getFavorite(match)}
                                  </span>
                                  <span className="text-[9px] font-mono opacity-40 mt-1">
                                    Favorito Técnico
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-ink opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="flex items-center gap-3 text-bg">
                            <TrendingUp className="w-6 h-6 text-accent" />
                            <span className="font-mono text-xs uppercase tracking-[0.3em] font-black">Ver Análise Completa</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {displayMatches.length === 0 && (
                      <div className="col-span-full p-20 text-center border border-line border-dashed opacity-40 font-mono text-sm uppercase tracking-widest">
                        Nenhum jogo encontrado para esta pesquisa.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Results Header with Action Button */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-line pb-6">
                  <div className="flex items-center gap-3">
                    <History className="text-accent w-6 h-6" />
                    <div>
                      <h3 className="font-bold uppercase italic tracking-tighter">Histórico de Assertividade</h3>
                      <p className="text-[10px] font-mono opacity-50 uppercase">Verificação de Green/Red em tempo real</p>
                    </div>
                  </div>
                  <button 
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    className="w-full md:w-auto bg-accent text-white px-6 py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-ink transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                  >
                    {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    Gerar 5 Resultados Recentes
                  </button>
                </div>

                {/* Results Section */}
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 border border-line border-dashed">
                    <Loader2 className="w-12 h-12 text-accent animate-spin" />
                    <p className="font-mono text-sm uppercase tracking-[0.2em]">Consultando Resultados Reais...</p>
                  </div>
                ) : (
                  <div className="border border-line overflow-x-auto">
                    <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_0.5fr] min-w-[800px] bg-ink text-bg pointer-events-none p-4">
                      <span className="col-header text-bg opacity-100">Partida / Liga</span>
                      <span className="col-header text-bg opacity-100 text-center">Placar Real</span>
                      <span className="col-header text-bg opacity-100 text-center">Recomendação IA</span>
                      <span className="col-header text-bg opacity-100 text-center">Odds Sugeridas</span>
                      <span className="col-header text-bg opacity-100 text-right">Status</span>
                    </div>
                    {history.map((match) => (
                      <div 
                        key={match.id} 
                        className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_0.5fr] min-w-[800px] items-center p-4 border-b border-line hover:bg-white/50 transition-colors"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm leading-tight">{match.homeTeam}</span>
                            <span className="text-[10px] opacity-40 font-mono">VS</span>
                            <span className="font-bold text-sm leading-tight">{match.awayTeam}</span>
                          </div>
                          <span className="text-[9px] font-mono uppercase tracking-widest opacity-50">{match.league} • {match.date}</span>
                        </div>
                        
                        <div className="flex justify-center">
                          <span className="bg-ink text-bg px-3 py-1 font-mono text-sm font-bold rounded">
                            {match.result}
                          </span>
                        </div>

                        <div className="flex flex-col items-center text-center">
                          <span className="text-xs font-bold uppercase tracking-tighter">
                            {match.aiRecommendation}
                          </span>
                        </div>

                        <div className="flex justify-center">
                          <span className="font-mono text-sm text-accent font-bold">
                            @{match.aiSuggestedOdds?.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-end">
                          {match.status === 'win' ? (
                            <div className="flex items-center gap-1 text-green-600 font-black text-xs uppercase italic">
                              <CheckCircle2 className="w-4 h-4" /> Green
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600 font-black text-xs uppercase italic">
                              <XCircle className="w-4 h-4" /> Red
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row justify-center gap-4">
                  <button 
                    onClick={loadHistory}
                    className="border border-line px-6 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-ink hover:text-bg transition-all"
                  >
                    Atualizar Resultados
                  </button>
                  <button 
                    onClick={() => setActiveTab('upcoming')}
                    className="bg-accent text-white px-6 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-ink transition-all shadow-lg shadow-accent/20"
                  >
                    Ver Próximos Jogos
                  </button>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-4 border border-dashed border-line/30 rounded-lg flex gap-4 items-start opacity-60">
              <Info className="w-5 h-5 shrink-0 mt-1" />
              <p className="text-xs leading-relaxed">
                As análises são geradas por Inteligência Artificial com base em dados históricos e atuais. 
                Não garantimos 100% de acerto. Aposte com responsabilidade. 
                Odds estimadas podem variar conforme a casa de apostas.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Detail Header */}
            <button 
              onClick={goBack}
              className="flex items-center gap-2 text-xs font-mono uppercase opacity-50 hover:opacity-100 transition-opacity mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar para lista
            </button>

            <div className="border-l-4 border-accent pl-6 py-2">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
                {selectedMatch.homeTeam} <span className="text-accent">vs</span> {selectedMatch.awayTeam}
              </h2>
              <p className="font-mono text-sm opacity-50 mt-2 uppercase tracking-widest">{selectedMatch.league} • {selectedMatch.date}</p>
            </div>

            {/* Analysis Content */}
            <div className="bg-white/50 border border-line p-6 md:p-10 shadow-2xl relative overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-12 h-12 text-accent animate-spin" />
                  <p className="font-mono text-sm animate-pulse uppercase tracking-[0.2em]">IA Processando Dados...</p>
                </div>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>{analysis || ''}</ReactMarkdown>
                </div>
              )}
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 p-2 opacity-10 font-mono text-[8px] pointer-events-none uppercase">
                AI Engine v2.5 // Grounding Enabled
              </div>
            </div>

            {!loading && (
              <div className="flex justify-center">
                <button 
                  onClick={goBack}
                  className="bg-ink text-bg px-8 py-4 font-bold uppercase tracking-widest hover:bg-accent transition-colors"
                >
                  Nova Análise
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-line p-10 text-center opacity-30">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em]">
          © 2026 YURI PROGNOSTICO // Powered by Gemini 3 Flash
        </p>
      </footer>

      {/* Special Tips Modal */}
      {showTipsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg w-full max-w-2xl border border-line shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-line flex justify-between items-center bg-white/50">
              <div className="flex items-center gap-3">
                {tipCategory === 'daily-sure' && <Zap className="text-accent w-6 h-6" />}
                {tipCategory === 'football-tips' && <Target className="text-accent w-6 h-6" />}
                {tipCategory === 'over-under' && <PieChart className="text-accent w-6 h-6" />}
                {tipCategory === 'bonus-surprise' && <Gift className="text-accent w-6 h-6" />}
                <h3 className="text-xl font-black uppercase italic tracking-tighter">
                  {tipCategory.replace('-', ' ')}
                </h3>
              </div>
              <button 
                onClick={() => setShowTipsModal(false)}
                className="p-2 hover:bg-ink hover:text-bg transition-colors rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingTips ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-12 h-12 text-accent animate-spin" />
                  <p className="font-mono text-sm animate-pulse uppercase tracking-[0.2em]">IA Gerando Dicas Reais...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {specialTips.map((tip, i) => (
                    <div key={i} className="border border-line p-4 bg-white/30 hover:border-accent transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-mono uppercase opacity-50">{tip.league}</p>
                            {(tip.date || tip.time) && (
                              <span className="text-[9px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">
                                {tip.date} {tip.time && `• ${tip.time}`}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-lg leading-tight">
                            {tip.homeTeam} <span className="text-accent">vs</span> {tip.awayTeam}
                          </h4>
                        </div>
                        <div className="bg-accent text-white px-3 py-1 font-mono text-sm font-black italic">
                          @{tip.odds.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-ink text-bg p-3 mb-3">
                        <p className="text-xs font-black uppercase tracking-widest text-center">{tip.tip}</p>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-70 italic">
                        <Info className="w-3 h-3 inline-block mr-1 mb-0.5" />
                        {tip.reasoning}
                      </p>
                    </div>
                  ))}
                  {specialTips.length === 0 && !loadingTips && (
                    <p className="text-center font-mono text-sm opacity-50 py-10">Nenhuma dica encontrada para este momento.</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-line bg-white/50 flex justify-center">
              <button 
                onClick={() => handleSpecialTips(tipCategory)}
                disabled={loadingTips}
                className="bg-accent text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-ink transition-all disabled:opacity-50"
              >
                Atualizar Dicas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
