// safex/core/orchestrator.js

const {
  getSession,
  saveSession,
  atualizarLead,
  criarCasoNaWorklist,
  chamarSafex,
  _leads,
} = require("./state");

const {
  mensagemInicialConsentimento,
  mensagemRecusaConsentimento,
  mensagemPedirPrimeiroNome,
  mensagemPedirEmail,
  mensagemPerguntarPerfil,
  mensagemColetaDuvida,
  mensagemPerguntasAdicionais,
  mensagemPosPerguntaMaisDuvida,
  mensagemSolicitarNovaPergunta,
  mensagemEncerramento,
  mensagemAgradecerFeedback,
  mensagemNaoEntendiOpcao12,
  mensagemNaoEntendiOpcao14,
  mensagemSomenteTexto,
} = require("./messages");

// -----------------------------------------------------------------------------
// Utilitário simples para normalizar entrada textual
// -----------------------------------------------------------------------------
function normalizarEntrada(texto) {
  if (!texto) return "";
  return texto.trim().toLowerCase();
}

// -----------------------------------------------------------------------------
// Orquestrador principal do SAFEX (máquina de estados)
// -----------------------------------------------------------------------------
async function handleSafexMessage(userId, texto) {
  const session = getSession(userId);
  const agora = Date.now();
  const LIMITE = 15 * 60 * 1000; // 15 minutos de inatividade

  // ---------------------------------------------------------------------------
  // Timeout de sessão: se ficou mais de 15min sem interação, reseta o fluxo
  // preservando o LEAD (nome, e-mail, perfil)
  // ---------------------------------------------------------------------------
  if (session.lastInteraction && agora - session.lastInteraction > LIMITE) {
    session.estado = "INICIAL";
    session.historicoLLM = [];
    session.duvidaAtual = null;
    session.riscoAtual = null;
    session.casoAtualId = null;
    session.sessaoAtiva = true;
    session.feedback = null;
    session.lastInteraction = agora;

    saveSession(userId, session);

    return (
      "Sua sessão SAFEX foi encerrada por inatividade (mais de 15 minutos sem resposta).\n\n" +
      "Para continuar, envie sua dúvida novamente ou responda SIM para iniciar um novo atendimento."
    );
  }

  // Atualiza timestamp de última interação
  session.lastInteraction = agora;

  const entradaBruta = (texto || "").trim();
  const entradaNorm = normalizarEntrada(entradaBruta);
  let resposta = "";

  // Comando especial para reiniciar manualmente o fluxo
  if (entradaNorm === "menu" || entradaNorm === "reiniciar" || entradaNorm === "inicio") {
    session.estado = "INICIAL";
    session.historicoLLM = [];
    session.duvidaAtual = null;
    session.riscoAtual = null;
    session.casoAtualId = null;
    session.sessaoAtiva = true;
    session.feedback = null;
    session.lastInteraction = agora;

    saveSession(userId, session);

    resposta = mensagemInicialConsentimento();
    session.estado = "CONSENTIMENTO";
    saveSession(userId, session);
    return resposta;
  }

  switch (session.estado) {
    // -------------------------------------------------------------------------
    // Estado inicial: apresenta SAFEX e pede consentimento
    // -------------------------------------------------------------------------
    case "INICIAL": {
      resposta = mensagemInicialConsentimento();
      session.estado = "CONSENTIMENTO";
      break;
    }

    // -------------------------------------------------------------------------
    // CONSENTIMENTO: aceita 1/2 ou SIM/NÃO
    // -------------------------------------------------------------------------
    case "CONSENTIMENTO": {
      if (entradaNorm === "1" || entradaNorm === "sim" || entradaNorm === "s") {
        const lead = _leads.get(userId);
        if (lead && lead.firstName && lead.email && lead.role) {
          // Usuário recorrente → reaproveita cadastro
          session.primeiroNome = lead.firstName;
          session.email = lead.email;
          session.perfil = lead.role;
          resposta = mensagemColetaDuvida(session.primeiroNome, session.perfil);
          session.estado = "COLETA_DUVIDA";
        } else {
          // Primeiro atendimento
          resposta = mensagemPedirPrimeiroNome();
          session.estado = "PRIMEIRO_NOME";
        }
      } else if (
        entradaNorm === "2" ||
        entradaNorm === "nao" ||
        entradaNorm === "não" ||
        entradaNorm === "n"
      ) {
        resposta = mensagemRecusaConsentimento();
        session.estado = "FINALIZADO";
        session.sessaoAtiva = false;
      } else {
        resposta = "Por favor, responda com 1 (Sim) ou 2 (Não).";
      }
      break;
    }

    // -------------------------------------------------------------------------
    // Coleta do primeiro nome
    // -------------------------------------------------------------------------
    case "PRIMEIRO_NOME": {
      const primeiroNome = entradaBruta.split(" ")[0];
      session.primeiroNome = primeiroNome || "Colega";
      resposta = mensagemPedirEmail(session.primeiroNome);
      session.estado = "EMAIL";
      break;
    }

    // -------------------------------------------------------------------------
    // Coleta de e-mail
    // -------------------------------------------------------------------------
    case "EMAIL": {
      session.email = entradaBruta;
      resposta = mensagemPerguntarPerfil(session.primeiroNome);
      session.estado = "PERFIL";
      break;
    }

    // -------------------------------------------------------------------------
    // Coleta de perfil (médico / prof. saúde / outros)
    // Aceita número ou texto aproximado
    // -------------------------------------------------------------------------
    case "PERFIL": {
      if (entradaNorm === "1" || entradaNorm.includes("medic")) {
        session.perfil = "MEDICO";
      } else if (
        entradaNorm === "2" ||
        entradaNorm.includes("enferm") ||
        entradaNorm.includes("fisiot") ||
        entradaNorm.includes("tec") ||
        entradaNorm.includes("saude") ||
        entradaNorm.includes("saúde")
      ) {
        session.perfil = "PROF_SAUDE";
      } else if (
        entradaNorm === "3" ||
        entradaNorm.includes("pacient") ||
        entradaNorm.includes("acomp") ||
        entradaNorm.includes("leigo")
      ) {
        session.perfil = "OUTROS";
      } else {
        resposta =
          "Não entendi o perfil. Responda com:\n1 – Médico(a)\n2 – Profissionais em Saúde\n3 – Outros (paciente, familiar, estudante).";
        break;
      }

      atualizarLead(userId, session);
      resposta = mensagemColetaDuvida(session.primeiroNome, session.perfil);
      session.estado = "COLETA_DUVIDA";
      break;
    }

    // -------------------------------------------------------------------------
    // COLETA_DUVIDA: descrição livre da situação clínica
    // -------------------------------------------------------------------------
    case "COLETA_DUVIDA": {
      if (!entradaBruta) {
        resposta = "Por favor, descreva a situação clínica ou dúvida em texto.";
        break;
      }
      session.duvidaAtual = entradaBruta;
      resposta = mensagemPerguntasAdicionais();
      session.estado = "PERGUNTAS_ADICIONAIS";
      break;
    }

    // -------------------------------------------------------------------------
    // PERGUNTAS_ADICIONAIS: checklist de segurança resumido em texto livre
    // -------------------------------------------------------------------------
    case "PERGUNTAS_ADICIONAIS": {
      session.riscoAtual = entradaBruta || "Sem fatores adicionais relevantes.";

      // Cria caso na worklist (CWO simplificado)
      criarCasoNaWorklist(userId, session);

      // Chama motor SAFEX (LLM)
      const respostaSafex = await chamarSafex(session);

      resposta = respostaSafex + mensagemPosPerguntaMaisDuvida();
      session.estado = "PERGUNTA_NOVA_OU_ENCERRA";
      break;
    }

    // -------------------------------------------------------------------------
    // DIALOGO_ATIVO: nova dúvida na mesma sessão
    // -------------------------------------------------------------------------
    case "DIALOGO_ATIVO": {
      if (!entradaBruta) {
        resposta = "Por favor, envie sua dúvida em texto.";
        break;
      }
      session.duvidaAtual = entradaBruta;
      session.riscoAtual = null;
      resposta = mensagemPerguntasAdicionais();
      session.estado = "PERGUNTAS_ADICIONAIS";
      break;
    }

    // -------------------------------------------------------------------------
    // PERGUNTA_NOVA_OU_ENCERRA: decide se continua ou encerra
    // -------------------------------------------------------------------------
    case "PERGUNTA_NOVA_OU_ENCERRA": {
      if (entradaNorm === "1" || entradaNorm === "sim" || entradaNorm === "s") {
        resposta = mensagemSolicitarNovaPergunta(session.primeiroNome);
        session.estado = "DIALOGO_ATIVO";
      } else if (
        entradaNorm === "2" ||
        entradaNorm === "nao" ||
        entradaNorm === "não" ||
        entradaNorm === "n"
      ) {
        resposta = mensagemEncerramento(session.primeiroNome);
        session.estado = "FEEDBACK";
      } else {
        resposta = mensagemNaoEntendiOpcao12();
      }
      break;
    }

    // -------------------------------------------------------------------------
    // FEEDBACK: usuário avalia o atendimento (1 a 4)
    // -------------------------------------------------------------------------
    case "FEEDBACK": {
      const numero = parseInt(entradaNorm, 10);
      if ([1, 2, 3, 4].includes(numero)) {
        session.feedback = String(numero);
        resposta = mensagemAgradecerFeedback();
        session.estado = "FINALIZADO";
        session.sessaoAtiva = false;
      } else {
        resposta = mensagemNaoEntendiOpcao14();
      }
      break;
    }

    // -------------------------------------------------------------------------
    // FINALIZADO: qualquer nova mensagem reinicia o fluxo, preservando LEAD
    // -------------------------------------------------------------------------
    case "FINALIZADO": {
      const lead = _leads.get(userId);

      session.estado = "INICIAL";
      session.primeiroNome = lead?.firstName || null;
      session.email = lead?.email || null;
      session.perfil = lead?.role || null;
      session.historicoLLM = [];
      session.sessaoAtiva = true;
      session.feedback = null;
      session.duvidaAtual = null;
      session.riscoAtual = null;
      session.casoAtualId = null;

      resposta = mensagemInicialConsentimento();
      session.estado = "CONSENTIMENTO";
      break;
    }

    // -------------------------------------------------------------------------
    // Qualquer estado inesperado: reinicia o fluxo com segurança
    // -------------------------------------------------------------------------
    default: {
      session.estado = "INICIAL";
      resposta = mensagemInicialConsentimento();
      session.estado = "CONSENTIMENTO";
      break;
    }
  }

  saveSession(userId, session);
  return resposta;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------
module.exports = {
  handleSafexMessage,
  mensagemSomenteTexto,
};
