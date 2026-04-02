import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeMatch(homeTeam: string, awayTeam: string, league: string, date: string) {
  const prompt = `Analise detalhadamente o jogo de futebol entre ${homeTeam} (Mandante) e ${awayTeam} (Visitante) pela liga ${league}, marcado para ${date}.
  
  Utilize a pesquisa do Google para obter as informações mais recentes e precisas sobre:
  1. **Forma Atual**: Resultados dos últimos 5 jogos de cada equipe, focando em tendências de gols e desempenho defensivo/ofensivo.
  2. **Desfalques e Retornos**: Liste jogadores lesionados, suspensos ou que estão voltando ao time, avaliando o impacto técnico e tático real.
  3. **Fator Casa/Fora**: Analise o desempenho histórico e recente do ${homeTeam} jogando em casa e do ${awayTeam} jogando fora.
  4. **Confrontos Diretos (H2H)**: Resultados históricos entre as duas equipes e padrões de jogo.
  5. **Contexto da Liga**: Importância do jogo para a tabela (briga por título, G4, rebaixamento).

  **DIRETRIZ DE APOSTA ASSERTIVA**: 
  Sua missão é encontrar o **VALOR REAL**. Não se limite ao óbvio. Priorize a identificação de mercados com **odds de alto valor (acima de 3.0)** que apresentem uma justificativa lógica sólida. Busque por possíveis "surpresas", "zebras justificadas" ou resultados de alto valor (ex: Empate com Gols, Vitória do Azarão por 1 gol, Over 3.5 Gols).

  Com base nesses dados, forneça:
  - Uma análise técnica profunda e audaciosa focada no valor da aposta.
  - Uma recomendação de aposta clara e assertiva (ex: Vitória do Azarão, Empate com Gols, Handicap Específico).
  - Odds estimadas para a recomendação (priorize odds > 3.0 se houver valor).
  - Nível de confiança da aposta (0-100%).

  Responda em Português do Brasil, de forma profissional, analítica, direta e sem rodeios.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text;
  } catch (error) {
    console.error("Erro na análise da IA:", error);
    throw error;
  }
}

export async function fetchRecentResults() {
  const prompt = `Forneça uma lista de 5 jogos de futebol importantes que ocorreram nos últimos 7 dias em qualquer liga mundial (Premier League, La Liga, Serie A, etc.).
  
  Para cada jogo, realize uma análise retrospectiva e inclua:
  - Nome dos times (Mandante e Visitante)
  - Liga
  - Data
  - Resultado Real (Placar)
  - Qual seria a recomendação lógica de aposta da IA ANTES do jogo (ex: Vitória do Azarão, Empate com Gols)
  - Odds sugeridas para essa recomendação (Priorize recomendações com odds > 3.0 para mostrar o valor da análise)
  - Se essa recomendação teria sido um "Green" (Ganhou) ou "Red" (Perdeu) com base no resultado real.

  Retorne os dados em formato JSON estrito:
  Array<{
    homeTeam: string,
    awayTeam: string,
    league: string,
    date: string,
    result: string,
    aiRecommendation: string,
    aiSuggestedOdds: number,
    status: 'win' | 'loss'
  }>`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Erro ao buscar resultados:", error);
    return [];
  }
}

export async function generateSpecialTips(category: string) {
  let categoryFocus = "";
  switch (category) {
    case 'daily-sure':
      categoryFocus = "Dicas de Alta Confiança (Sure Tips). Foque em jogos com odds entre 1.20 e 1.70, onde a probabilidade de vitória ou dupla chance é muito alta.";
      break;
    case 'football-tips':
      categoryFocus = "Dicas Gerais de Futebol. Foque em mercados variados (vencedor, gols, handicaps) com odds entre 1.70 e 2.50.";
      break;
    case 'over-under':
      categoryFocus = "Mercado de Gols (Over/Under). Foque exclusivamente em previsões de mais/menos gols (ex: Over 2.5, Under 3.5) para os jogos de hoje.";
      break;
    case 'bonus-surprise':
      categoryFocus = "Bônus Surpresa (Zebras ou Valor). Foque em odds altas (3.00 a 5.00) onde há uma justificativa lógica para um resultado inesperado ou valor de mercado.";
      break;
  }

  const prompt = `Gere 5 dicas de apostas REAIS e ASSERTIVAS para jogos de futebol que acontecem HOJE (${new Date().toLocaleDateString()}) ou nos próximos 2 dias, baseadas na categoria: ${categoryFocus}.
  
  Utilize a pesquisa do Google para encontrar os melhores jogos, escalações confirmadas e notícias de última hora.
  
  Para cada dica, forneça em formato JSON:
  - homeTeam: string
  - awayTeam: string
  - league: string
  - tip: string (A recomendação exata e audaciosa)
  - odds: number (Odds reais de mercado)
  - reasoning: string (Uma justificativa técnica e assertiva de 1-2 frases)
  - date: string (Data do jogo)
  - time: string (Horário do jogo)

  **IMPORTANTE**: Foque em jogos de elite e mercados com valor real. Retorne APENAS um array JSON estrito.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error(`Erro ao gerar dicas (${category}):`, error);
    return [];
  }
}

export async function searchMatchesRealTime(query: string, date: string) {
  const dateStr = date || "próximos 5 dias";
  const prompt = `Encontre jogos de futebol REAIS, OFICIAIS e ATUALIZADOS que correspondam à pesquisa: "${query}" abrangendo o período de hoje até 5 dias depois (${dateStr}).
  
  Use a pesquisa do Google para encontrar partidas em ligas profissionais de elite (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Brasileirão Série A, Champions League, Europa League, etc.).
  
  Para cada jogo encontrado (máximo 20), realize uma análise assertiva e forneça em formato JSON:
  - id: string (um ID único gerado)
  - homeTeam: string
  - awayTeam: string
  - league: string
  - date: string (formato YYYY-MM-DD, DEVE ser a data real do jogo)
  - time: string (formato HH:MM, horário de Brasília oficial)
  - odds: { home: number, draw: number, away: number } (odds reais de mercado atuais)
  - aiRecommendation: string (Recomendação assertiva focada em VALOR e SURPRESAS, ex: "Vitória do Azarão", "Empate com Gols", "Over 2.5 Gols")
  - aiSuggestedOdds: number (Odd estimada para a recomendação, priorizando odds > 3.0 se houver valor real)
  - status: string (Sempre "pending" para jogos futuros)
  - result?: string (Placar se o jogo já ocorreu)

  **DIRETRIZES DE ASSERTIVIDADE**: 
  1. As datas DEVEM ser reais e futuras (ou de hoje).
  2. Organize os jogos por data e hora crescente.
  3. Busque os jogos com maior liquidez e interesse do público.
  4. A recomendação da IA deve ser baseada em tendências reais de desempenho recente e desequilíbrios de odds.
  Retorne APENAS um array JSON estrito.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Erro na pesquisa em tempo real:", error);
    return [];
  }
}
