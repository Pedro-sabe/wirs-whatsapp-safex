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
  mensagemConfirmarIdentidade,
  mensagemPerguntarPerfil,
  mensagemColetaDuvida,
  mensagemChecklistRisco,
  mensagemConfirmacaoDadosClinicos,
  mensagemPosPerguntaMaisDuvida,
  mensagemSolicitarNovaPergunta,
  mensagemEncerramento,
  mensagemAgradecerFeedback,
  mensagemNaoEntendiOpcao12,
  mensagemNaoEntendiOpcao14,
  mensagemSomenteTexto,
  montarBlocoServico,
} = require("./messages");

async function handleSafexMessage(userId, texto) {
  const session = getSession(userId);
  const entrada = (texto || "").trim();
  let resposta = "";

  switch (session.estado) {
    case "INICIAL": {
      resposta = mensagemInicialConsentimento(session);
      session.estado = "CONSENTIMENTO";
      break;
    }

    case "CONSENTIMENTO":
      if (entrada === "1") {
        const lead = _leads.get(userId);
        if (lead && lead.firstName && lead.email && lead.role) {
          session.primeiroNome = lead.firstName;
          session.email = lead.email;
          session.perfil = lead.role;
          resposta = mensagemColetaDuvida(session.primeiroNome, session.perfil, true);
          session.estado = "COLETA_DUVIDA";
        } else {
          resposta = mensagemPedirPrimeiroNome();
          session.estado = "PRIMEIRO_NOME";
        }
      } else if (entrada === "2") {
        resposta = mensagemRecusaConsentimento();
        session.estado = "FINALIZADO";
        session.sessaoAtiva = false;
      } else {
        resposta = "Por favor, responda com 1 (Sim, concordo) ou 2 (Não concordo).";
      }
      break;

    case "PRIMEIRO_NOME": {
      const primeiroNome = entrada.split(" ")[0];
      session.primeiroNome = primeiroNome || "Colega";
      resposta = mensagemPedirEmail(session.primeiroNome);
      session.estado = "EMAIL";
      break;
    }

    case "EMAIL":
      session.email = entrada;
      resposta = mensagemConfirmarIdentidade(session);
      session.estado = "CONFIRMA_IDENTIDADE";
      break;

    case "CONFIRMA_IDENTIDADE": {
      const lower = entrada.toLowerCase();
      if (lower === "sim" || lower === "s") {
        resposta = mensagemPerguntarPerfil(session.primeiroNome);
        session.estado = "PERFIL";
      } else if (lower === "nao" || lower === "não" || lower === "n") {
        resposta =
          "Sem problema. Por favor, informe novamente o e-mail correto que deseja utilizar.";
        session.estado = "EMAIL";
      } else {
        resposta = "Por favor, responda apenas SIM ou NÃO.";
      }
      break;
    }

    case "PERFIL":
      if (entrada === "1") {
        session.perfil = "MEDICO";
      } else if (entrada === "2") {
        session.perfil = "PROF_SAUDE";
      } else if (entrada === "3") {
        session.perfil = "OUTROS";
      } else {
        resposta = "Por favor, responda com 1, 2 ou 3.";
        break;
      }
      atualizarLead(userId, session);
      resposta = mensagemColetaDuvida(session.primeiroNome, session.perfil);
      session.estado = "COLETA_DUVIDA";
      break;

    case "COLETA_DUVIDA":
      if (!entrada) {
        resposta = "Por favor, descreva a situação clínica ou dúvida em texto.";
        break;
      }
      session.duvidaAtual = entrada;
      resposta = mensagemChecklistRisco();
      session.estado = "CHECKLIST_RISCO";
      break;

    case "CHECKLIST_RISCO":
      session.riscoAtual = entrada || "Sem fatores adicionais relevantes.";
      resposta = mensagemConfirmacaoDadosClinicos();
      session.estado = "CONFIRMACAO_DADOS";
      break;

    case "CONFIRMACAO_DADOS": {
      const lower = entrada.toLowerCase();
      if (lower === "ok" || lower === "ok.") {
        criarCasoNaWorklist(userId, session);
        const respostaSafex = await chamarSafex(session);
        resposta = respostaSafex + montarBlocoServico(session) + mensagemPosPerguntaMaisDuvida();
        session.estado = "PERGUNTA_NOVA_OU_ENCERRA";
      } else {
        session.duvidaAtual =
          (session.duvidaAtual || "") + "\nComplemento do usuário:\n" + entrada;
        resposta =
          "Anotado o complemento.\nSe quiser acrescentar mais alguma informação, envie agora.\nSe estiver tudo certo, responda: OK.";
      }
      break;
    }

    case "DIALOGO_ATIVO":
      if (!entrada) {
        resposta = "Por favor, envie sua dúvida em texto.";
        break;
      }
      session.duvidaAtual = entrada;
      session.riscoAtual = null;
      resposta = mensagemChecklistRisco();
      session.estado = "CHECKLIST_RISCO";
      break;

    case "PERGUNTA_NOVA_OU_ENCERRA":
      if (entrada === "1") {
        resposta = mensagemSolicitarNovaPergunta(session.primeiroNome);
        session.estado = "DIALOGO_ATIVO";
      } else if (entrada === "2") {
        resposta = mensagemEncerramento(session.primeiroNome);
        session.estado = "FEEDBACK";
      } else {
        resposta = mensagemNaoEntendiOpcao12();
      }
      break;

    case "FEEDBACK":
      if (["1", "2", "3", "4"].includes(entrada)) {
        session.feedback = entrada;
        resposta = mensagemAgradecerFeedback();
        session.estado = "FINALIZADO";
        session.sessaoAtiva = false;
      } else {
        resposta = mensagemNaoEntendiOpcao14();
      }
      break;

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

      resposta = mensagemInicialConsentimento(session);
      session.estado = "CONSENTIMENTO";
      break;
    }
  }

  saveSession(userId, session);
  return resposta;
}

module.exports = {
  handleSafexMessage,
  mensagemSomenteTexto,
};
