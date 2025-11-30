// safex/core/state.js

const OpenAI = require("openai");
const SYSTEM_PROMPT = require("../config/systemPrompt");

// -----------------------------------------------------------------------------
// Cliente OpenAI (único, reutilizado)
// -----------------------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -----------------------------------------------------------------------------
// Estruturas em memória
// -----------------------------------------------------------------------------
const sessions = new Map(); // Sessões ativas por usuário (telefone)
const leads = new Map();    // Cadastro básico por usuário
const worklist = [];        // Lista de casos SAFEX (CWO simplificado)

// -----------------------------------------------------------------------------
// SESSÃO (por userId = telefone WhatsApp)
// -----------------------------------------------------------------------------
function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      estado: "INICIAL",
      primeiroNome: null,
      email: null,
      perfil: null, // "MEDICO" | "PROF_SAUDE" | "OUTROS"
      historicoLLM: [],
      sessaoAtiva: true,
      feedback: null,
      duvidaAtual: null,
      riscoAtual: null,
      casoAtualId: null,
      lastInteraction: Date.now(),
    });
  } else {
    const s = sessions.get(userId);
    if (!s.lastInteraction) s.lastInteraction = Date.now();
  }
  return sessions.get(userId);
}

function saveSession(userId, session) {
  sessions.set(userId, session);
}

// -----------------------------------------------------------------------------
// LEAD (cadastro básico do usuário)
// -----------------------------------------------------------------------------
function atualizarLead(userId, session) {
  if (!session.primeiroNome || !session.email || !session.perfil) return;

  const now = new Date().toISOString();
  const existente = leads.get(userId);

  const lead = {
    leadId: existente?.leadId || `SX-L-${String(leads.size + 1).padStart(6, "0")}`,
    phoneNumber: userId,
    firstName: session.primeiroNome,
    email: session.email,
    role: session.perfil,
    emailConfirmed: true,
    createdAt: existente?.createdAt || now,
    updatedAt: now,
  };

  leads.set(userId, lead);
}

// -----------------------------------------------------------------------------
// WORKLIST / CWO_ID
// -----------------------------------------------------------------------------
function gerarCwoId() {
  const numero = worklist.length + 1;
  const ano = new Date().getFullYear();
  return `SAFEX-IMG-${ano}-${String(numero).padStart(6, "0")}`;
}

function criarCasoNaWorklist(userId, session) {
  if (session.casoAtualId) return session.casoAtualId;

  const cwoId = gerarCwoId();
  const now = new Date().toISOString();
  const lead = leads.get(userId);

  const caso = {
    cwoId,
    leadId: lead?.leadId || null,
    phoneNumber: userId,
    workflowType: "imagem",
    status: "em_analise",
    createdAt: now,
    updatedAt: now,
    lastInteractionAt: now,
  };

  worklist.push(caso);
  session.casoAtualId = cwoId;
  return cwoId;
}

// -----------------------------------------------------------------------------
// Montagem do prompt clínico
// -----------------------------------------------------------------------------
function montarPromptClinico(session) {
  const perfil =
    session.perfil === "MEDICO"
      ? "Médico"
      : session.perfil === "PROF_SAUDE"
      ? "Profissional em Saúde"
      : "Paciente / Acompanhante";

  let instrucaoSaida = "";
  if (session.perfil === "MEDICO") {
    instrucaoSaida =
      "Perfil do usuário: Médico. Use linguagem técnica. Aplique o formato de Indicação de Exame ou Avaliação de Segurança (item 6 do system prompt), conforme a pergunta. Mantenha a estrutura numerada prevista no system prompt.";
  } else if (session.perfil === "PROF_SAUDE") {
    instrucaoSaida =
      "Perfil do usuário: Profissional em Saúde. Responda em um parágrafo único, em linguagem técnica simplificada, iniciando com 'Auxílio orientativo:' e concluindo com a frase legal final prevista no system prompt.";
  } else {
    instrucaoSaida =
      "Perfil do usuário: Paciente/Leigo. Responda em um parágrafo único, em linguagem clara, iniciando com 'Auxílio orientativo:' e concluindo com a frase legal final prevista no system prompt. Evite termos excessivamente técnicos.";
  }

  const duvida = session.duvidaAtual || "";
  const risco = session.riscoAtual || "";

  const texto = [
    `Perfil do usuário: ${perfil}.`,
    instrucaoSaida,
    "",
    "Dados clínicos principais:",
    duvida,
    "",
    "Informações adicionais de risco e contexto:",
    risco,
  ].join("\n");

  return texto;
}

// -----------------------------------------------------------------------------
// Chamada ao LLM (com limpeza e normalização de resposta)
// -----------------------------------------------------------------------------
async function chamarSafex(session, textoManual = null) {
  const texto = textoManual || montarPromptClinico(session);
  const historico = session.historicoLLM || [];

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historico,
    { role: "user", content: texto },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    temperature: 0.1,
  });

  let resposta = completion.choices[0].message.content || "";

  // 🔧 Limpeza avançada — remove frases redundantes e blocos automáticos
  resposta = resposta
    .replace(/posso[\s\S]{0,20}ajudar[\s\S]{0,200}$/gi, "") // “Posso ajudar com mais alguma dúvida?”
    .replace(/\n?\s*1\s*[-–]\s*sim[\s\S]{0,50}$/gi, "")
    .replace(/\n?\s*2\s*[-–]\s*(nao|não)[\s\S]{0,50}$/gi, "")
    .replace(/Análise baseada em diretrizes vigentes[\s\S]{0,50}(Requer validação do radiologista responsável e do médico solicitante\.)?/gi,
      "Análise baseada em diretrizes vigentes. Requer validação do radiologista responsável e do médico solicitante.")
    .replace(/(Análise baseada[\s\S]{0,100})\1+/gi, "$1") // remove duplicatas da frase final
    .replace(/\n{2,}/g, "\n\n")
    .trim();

  // Atualiza histórico
  session.historicoLLM = [
    ...historico,
    { role: "user", content: texto },
    { role: "assistant", content: resposta },
  ];

  return resposta;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------
module.exports = {
  getSession,
  saveSession,
  atualizarLead,
  criarCasoNaWorklist,
  chamarSafex,
  _leads: leads,
  _worklist: worklist,
  _sessions: sessions,
};
