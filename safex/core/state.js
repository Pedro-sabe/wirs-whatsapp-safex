// safex/core/state.js

const OpenAI = require("openai");
const SYSTEM_PROMPT = require("../config/systemPrompt");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sessions = new Map();
const leads = new Map();
const worklist = [];

// Sessão por telefone (WhatsApp)
function getSession(userId) {
  if (!sessions.has(userId)) {
    const lead = leads.get(userId);
    sessions.set(userId, {
      estado: "INICIAL",
      primeiroNome: lead?.firstName || null,
      email: lead?.email || null,
      perfil: lead?.role || null,
      historicoLLM: [],
      sessaoAtiva: true,
      feedback: null,
      duvidaAtual: null,
      riscoAtual: null,
      casoAtualId: null,
    });
  }
  return sessions.get(userId);
}

function saveSession(userId, session) {
  sessions.set(userId, session);
}

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
    emailConfirmed: true, // confirmação via chat (MVP)
    createdAt: existente?.createdAt || now,
    updatedAt: now,
  };
  leads.set(userId, lead);
}

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

async function chamarSafex(session) {
  const texto = montarPromptClinico(session);
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

  const resposta = (completion.choices[0].message.content || "").trim();

  session.historicoLLM = [
    ...historico,
    { role: "user", content: texto },
    { role: "assistant", content: resposta },
  ];

  return resposta;
}

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
