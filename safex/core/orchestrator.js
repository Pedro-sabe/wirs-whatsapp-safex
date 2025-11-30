// safex/core/orchestrator.js

const {
  mensagemInicialConsentimento,
  mensagemRecusaConsentimento,
  mensagemPedirPrimeiroNome,
  mensagemPedirEmail,
  mensagemPerguntarPerfil,
  mensagemColetaDuvida,
  mensagemPerguntasAdicionais,
  mensagemPosPerguntaMaisDuvida,
  mensagemEncerramento,
  mensagemAgradecerFeedback,
  mensagemNaoEntendiOpcao12,
  mensagemNaoEntendiOpcao14,
  mensagemSomenteTexto,
} = require("./messages");

const { getSession, saveSession, chamarSafex } = require("./state");

async function handleSafexMessage(userId, texto) {
  const session = getSession(userId);
  const entradaBruta = (texto || "").trim();
  const entradaNorm = entradaBruta
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  let resposta = "";

  switch (session.estado) {
    // -------------------------------------------------------
    case "INICIAL": {
      resposta = mensagemInicialConsentimento();
      session.estado = "CONSENTIMENTO";
      break;
    }

    // -------------------------------------------------------
    case "CONSENTIMENTO": {
      if (["1", "sim", "s"].includes(entradaNorm)) {
        resposta = mensagemPedirPrimeiroNome();
        session.estado = "PRIMEIRO_NOME";
      } else if (["2", "nao", "não", "n"].includes(entradaNorm)) {
        resposta = mensagemRecusaConsentimento();
        session.estado = "FINALIZADO";
        session.sessaoAtiva = false;
      } else {
        resposta = "Por favor, responda com 1 (Sim) ou 2 (Não).";
      }
      break;
    }

    // -------------------------------------------------------
    case "PRIMEIRO_NOME": {
      const nome = entradaBruta.split(" ")[0];
      session.primeiroNome = nome || "Colega";
      resposta = mensagemPedirEmail(session.primeiroNome);
      session.estado = "EMAIL";
      break;
    }

    // -------------------------------------------------------
    case "EMAIL": {
      session.email = entradaBruta;
      resposta = mensagemPerguntarPerfil(session.primeiroNome);
      session.estado = "PERFIL";
      break;
    }

    // -------------------------------------------------------
    case "PERFIL": {
      if (entradaNorm === "1") session.perfil = "MEDICO";
      else if (entradaNorm === "2") session.perfil = "PROF_SAUDE";
      else if (entradaNorm === "3") session.perfil = "OUTROS";
      else {
        resposta = "Responda com 1, 2 ou 3.";
        break;
      }

      resposta = mensagemColetaDuvida(session.primeiroNome, session.perfil);
      session.estado = "COLETA_DUVIDA";
      break;
    }

    // -------------------------------------------------------
    case "COLETA_DUVIDA": {
      if (!entradaBruta) {
        resposta = "Por favor, descreva a dúvida ou situação clínica.";
        break;
      }
      session.duvidaAtual = entradaBruta;
      resposta = mensagemPerguntasAdicionais();
      session.estado = "PERGUNTAS_ADICIONAIS";
      break;
    }

    // ---------------------------------------------------------
case "PERGUNTAS_ADICIONAIS": {
  if (!entradaBruta) {
    resposta = "Por favor, responda em um único parágrafo.";
    break;
  }

  session.riscoAtual = entradaBruta;
  const textoCompleto = `Situação clínica:\n${session.duvidaAtual}\n\nCondições adicionais:\n${entradaBruta}`;

  const respostaSafex = await chamarSafex(session, textoCompleto);

  const textoLimpo = respostaSafex
    .replace(/posso[\s\S]{0,20}ajudar[\s\S]{0,200}$/gi, "")
    .replace(/\n?\s*1\s*[-–]\s*sim[\s\S]{0,50}$/gi, "")
    .replace(/\n?\s*2\s*[-–]\s*(nao|não)[\s\S]{0,50}$/gi, "")
    .trim();

  resposta =
    textoLimpo +
    "\n\nComo deseja continuar?\n" +
    "1 – Continuar este mesmo caso (acrescentar dúvidas ou detalhes)\n" +
    "2 – Iniciar um novo caso";

  session.estado = "PERGUNTA_NOVA_OU_ENCERRA";
  break;
}

// ---------------------------------------------------------
case "MESMO_CASO": {
  if (!entradaBruta) {
    resposta = "Envie o complemento da dúvida em texto.";
    break;
  }

  session.duvidaAtual =
    (session.duvidaAtual || "") + "\nComplemento:\n" + entradaBruta;

  const textoCompleto = `Situação atualizada:\n${session.duvidaAtual}\n\nCondições adicionais previamente informadas:\n${session.riscoAtual}`;

  const respostaSafex = await chamarSafex(session, textoCompleto);

  const textoLimpo = respostaSafex
    .replace(/posso[\s\S]{0,20}ajudar[\s\S]{0,200}$/gi, "")
    .replace(/\n?\s*1\s*[-–]\s*sim[\s\S]{0,50}$/gi, "")
    .replace(/\n?\s*2\s*[-–]\s*(nao|não)[\s\S]{0,50}$/gi, "")
    .trim();

  resposta =
    textoLimpo +
    "\n\nComo deseja continuar?\n" +
    "1 – Continuar este mesmo caso (acrescentar dúvidas ou detalhes)\n" +
    "2 – Iniciar um novo caso";

  session.estado = "PERGUNTA_NOVA_OU_ENCERRA";
  break;
}


    // -------------------------------------------------------
    case "PERGUNTA_NOVA_OU_ENCERRA": {
      if (["1", "sim", "s"].includes(entradaNorm)) {
        resposta =
          "Certo, vamos manter este mesmo caso.\n" +
          "Envie apenas o complemento da dúvida ou nova pergunta sobre este paciente.";
        session.estado = "MESMO_CASO";
      } else if (["2", "nao", "não", "n"].includes(entradaNorm)) {
        session.duvidaAtual = null;
        session.riscoAtual = null;
        resposta = mensagemColetaDuvida(session.primeiroNome, session.perfil);
        session.estado = "COLETA_DUVIDA";
      } else {
        resposta = mensagemNaoEntendiOpcao12();
      }
      break;
    }

    // -------------------------------------------------------
    case "FEEDBACK": {
      if (["1", "2", "3", "4"].includes(entradaNorm)) {
        session.feedback = entradaNorm;
        resposta = mensagemAgradecerFeedback();
        session.estado = "FINALIZADO";
      } else {
        resposta = mensagemNaoEntendiOpcao14();
      }
      break;
    }

    // -------------------------------------------------------
    case "FINALIZADO": {
      session.estado = "INICIAL";
      resposta = mensagemInicialConsentimento();
      session.estado = "CONSENTIMENTO";
      break;
    }

    // -------------------------------------------------------
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

module.exports = { handleSafexMessage };
