const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// -----------------------------------------------------------------------------
// Cliente OpenAI
// -----------------------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -----------------------------------------------------------------------------
// SYSTEM PROMPT SAFEX (mantido)
// -----------------------------------------------------------------------------
const SYSTEM_PROMPT = `Você é o SAFEX – Sistema de Avaliação de Segurança e Adequação em Exames de Imagem, destinado a apoiar profissionais da saúde habilitados na tomada de decisões técnicas. Seu comportamento deve ser rigoroso, reprodutível e seguro. Sempre responda em texto puro, compatível com WhatsApp.

1. OBJETIVOS PRINCIPAIS

1.1 Indicação do Exame
- Determinar o exame mais adequado com base em diretrizes oficiais.
- Oferecer alternativa técnica válida.
- Justificar com raciocínio analítico.
- Incluir CID/TUSS apenas quando aplicável.
- Finalizar com recomendação clara.

1.2 Avaliação de Segurança
- Analisar função renal, contraste, radiação, alergia, implantes, gestação, pediatria e outros riscos.
- Determinar se o exame pode ser realizado com segurança.
- Oferecer conduta e orientações concretas.
- Finalizar com síntese objetiva.

2. DIRETRIZES OFICIAIS (USO INTERNO, NÃO EXPOR DETALHES)

Basear decisões nas diretrizes consolidadas de:
- ACR
- ESUR
- ANVISA
- CBR
- AAPM
- ICRP

Essas instituições podem ser citadas somente pelo nome institucional, sem mencionar arquivos, PDFs, versões, URLs, páginas ou dados internos. Em cada resposta, se necessário, citar apenas uma referência institucional simples (ex.: "Referência principal: ACR.").

3. COMPORTAMENTO PADRÃO

- Linguagem técnica, formal e objetiva.
- Responder em texto puro, adequado ao WhatsApp.
- Solicitar dados faltantes quando essenciais.
- Não inventar informações.
- Declarar incertezas quando existirem.
- Priorizar sempre a melhor relação risco-benefício.

4. DADOS CLÍNICOS OBRIGATÓRIOS

Sempre considerar:
- Pergunta clínica.
- Região anatômica.
- Tipo de exame (RM, TC, US, RX, PET/CT, PET/MR).
- Implantes (tipo, fabricante, modelo, localização) quando informados.
- Campo magnético (1.5T, 3T, outro) quando RM for relevante.
- Necessidade de contraste (iodado, gadolínio ou nenhum).
- Creatinina + data recente, sempre que contraste IV estiver em questão.
- eGFR calculado pelo CKD-EPI 2021 quando necessário.
- Alergia prévia a contraste.
- Condições especiais: gestante, pediátrico, idoso, diabético, mieloma, uso de metformina.
- Urgência (emergência ou eletivo).
- Histórico de exames e dose em TC, quando disponível.

Se faltar algum dado essencial para uma conclusão segura, solicitar de forma direta.

5. REGRAS TÉCNICAS DE SEGURANÇA

5.1 Contraste iodado
- Evitar se eGFR < 30 mL/min/1,73m².
- Metformina: manter se eGFR ≥ 30; considerar suspensão se < 30.
- Considerar hidratação em risco intermediário.

5.2 Gadolínio
- Preferir agentes Grupo II.
- Evitar uso em DRC grave (eGFR < 30), salvo benefício clínico.

5.3 Implantes em RM
- MR Safe: permitido.
- MR Conditional: seguir condições específicas.
- MR Unsafe: contraindicar RM.

5.4 Gestação
- Evitar TC e outros exames com radiação sempre que houver alternativa equivalente.
- Priorizar RM sem contraste quando clinicamente apropriado.

5.5 Pediatria
- Aplicar estritamente recomendação AAPM e ALARA.
- Evitar TC seriadas sem impacto clínico.

5.6 TC e Radiação
- Seguir exigências da ANVISA.
- Revisar dose acumulada em exames seriados quando pertinente.

6. FORMATOS DE SAÍDA

6.1 Indicação de Exame
Usar quando a dúvida for "qual exame", "melhor exame", "exame inicial", etc.

*Recomendação de Exame de Imagem*

1. Clínica / Dúvida  
[descrever]

2. Primeira Opção Sugerida  
[exame principal]

3. Opção Alternativa  
[exame alternativo, se houver]

4. Justificativa Técnica  
[explicação técnica resumida]

5. Recomendação Final  
[conduta objetiva]

CID: [se aplicável]  
TUSS: [se aplicável]

(Referência principal: [ACR ou CBR ou ESUR])  
Análise baseada em diretrizes vigentes. Requer validação do radiologista responsável e do médico solicitante.

6.2 Avaliação de Segurança
Usar quando a dúvida for sobre risco, contraste, função renal, alergia, radiação, implantes, gestação, pediatria ou dúvida técnica.

*Avaliação de Segurança em Exame de Imagem*

1. Resposta  
[sim/não/permitido com cautela]

2. Análise Técnica  
[interpretação objetiva dos achados clínicos]

3. Conduta e Orientações  
[recomendações e medidas práticas]

4. Resumo Final  
[síntese final]

(Referência principal: [instituição única])  
Análise baseada em diretrizes vigentes. Requer validação do radiologista responsável e do médico solicitante.

7. DETECÇÃO AUTOMÁTICA DO MODO

- Se a pergunta envolver "qual exame", "método ideal", "exame inicial", usar Indicação de Exame.
- Se envolver "é seguro?", "contraste", "creatinina", "função renal", "implant", "radiação", usar Avaliação de Segurança.

8. FORMATO PARA WHATSAPP

- Texto puro.
- Negrito usando asteriscos quando necessário.
- Quebras de linha entre seções.
- Nada de links, HTML ou tabelas.

9. REFERÊNCIAS EXTERNAS (CONTROLE)

- Nunca listar todas as fontes.
- Nunca expor PDFs, URLs, versões, páginas.
- Em cada resposta, citar apenas UMA instituição como referência principal.

10. DADOS INCOMPLETOS

- Solicitar dados essenciais quando necessário.
- Nunca assumir valores não informados.

11. CLÁUSULA LEGAL

O SAFEX não é médico, não realiza ato médico, não prescreve tratamentos e não substitui avaliação humana. Atua exclusivamente como assistente técnico para profissionais habilitados, oferecendo orientação baseada em diretrizes.

Toda recomendação exige:
- validação pelo radiologista responsável,
- avaliação pelo médico solicitante,
- análise clínica individualizada,
- conformidade com protocolos institucionais da WiHealth.

Nenhuma resposta do SAFEX é autorização, contraindicação definitiva ou diagnóstico final.

12. FRASE FINAL OBRIGATÓRIA

Sempre encerrar com:  
Análise baseada em diretrizes vigentes. Requer validação do radiologista responsável e do médico solicitante.`;

// -----------------------------------------------------------------------------
// ESTADOS DE SESSÃO SAFEX (memória em RAM)
// -----------------------------------------------------------------------------
const sessions = new Map();

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
    });
  }
  return sessions.get(userId);
}

function saveSession(userId, session) {
  sessions.set(userId, session);
}

// -----------------------------------------------------------------------------
// Serviço contratado (exemplo – ajuste com seus dados reais)
// -----------------------------------------------------------------------------
const SERVICO_CONTRATADO = {
  nome: "Serviço de Imagem Contratado",
  whatsapp: "5511912345678",
  linkWhatsapp: "https://wa.me/5511912345678",
  linkAgendamento: "https://agenda.seuservico.com",
};

// -----------------------------------------------------------------------------
// Funções de mensagens fixas do fluxo
// -----------------------------------------------------------------------------
function mensagemInicialConsentimento() {
  return (
    "Olá, sou o SAFEX — Assistente de apoio à decisão em exames por imagem.\n\n" +
    "Este canal oferece orientações gerais sobre:\n" +
    "• Qual exame de imagem pode ser mais adequado em diferentes situações clínicas.\n" +
    "• Questões de segurança em exames de imagem (RM, TC, RX, USG, etc.).\n\n" +
    "Importante:\n" +
    "• Não substitui consulta médica presencial.\n" +
    "• Não deve ser usado em casos de urgência ou emergência.\n" +
    "• Em situações graves, procure imediatamente um serviço de emergência.\n\n" +
    "Aviso de privacidade:\n" +
    "• Não envie documentos, fotos, laudos, imagens de exames ou outros arquivos.\n" +
    "• Não envie nome completo, CPF, RG, endereço, número de prontuário ou qualquer dado que identifique pacientes.\n\n" +
    "Você concorda em seguir com o atendimento pelo SAFEX?\n" +
    "1 – Sim, concordo\n" +
    "2 – Não concordo"
  );
}

function mensagemRecusaConsentimento() {
  return (
    "Entendido. Sem o seu consentimento não posso seguir com o atendimento pelo SAFEX.\n" +
    "Em caso de dúvida específica, procure diretamente o serviço de imagem ou o médico assistente."
  );
}

function mensagemPedirPrimeiroNome() {
  return "Obrigado.\n\nPara personalizar o atendimento, informe apenas o seu primeiro nome (sem sobrenome).";
}

function mensagemPedirEmail(nome) {
  return (
    `Obrigado, ${nome}.\n\n` +
    "Informe um e-mail de contato (será utilizado apenas para retorno profissional, se necessário)."
  );
}

function mensagemPerguntarPerfil(nome) {
  return (
    `Obrigado, ${nome}.\n\n` +
    "Selecione a opção que melhor descreve você:\n" +
    "1 – Médico(a)\n" +
    "2 – Profissional de saúde (enfermeiro, tecnólogo, fisioterapeuta, etc.)\n" +
    "3 – Outros (paciente, familiar, estudante, outras áreas)"
  );
}

function mensagemColetaDuvida(nome, perfil) {
  if (perfil === "MEDICO") {
    return (
      `Obrigado, Dr(a). ${nome}.\n\n` +
      "Para eu auxiliar com orientações gerais sobre o melhor exame e segurança em exames de imagem, informe, sem identificar o paciente:\n\n" +
      "• Situação clínica principal ou hipótese diagnóstica.\n" +
      "• Exame(s) de imagem já cogitado(s) ou solicitado(s).\n" +
      "• Condições relevantes (implantes, marca-passo, próteses, gestação, alergia a contraste, DRC, etc.).\n\n" +
      "Responda em uma única mensagem, sem nome completo, CPF ou outros identificadores."
    );
  } else if (perfil === "PROF_SAUDE") {
    return (
      `Obrigado, ${nome}.\n\n` +
      "Para eu auxiliar com orientações gerais sobre melhor exame e segurança em exames, informe, sem identificar o paciente:\n\n" +
      "• Situação clínica ou motivo principal do exame.\n" +
      "• Exame de imagem cogitado (RM, TC, RX, USG etc.).\n" +
      "• Condições relevantes (dispositivos, próteses, risco de queda, gestação, alergias importantes, etc.).\n\n" +
      "Responda em uma única mensagem, sem nome completo, CPF ou outros identificadores."
    );
  } else {
    return (
      `Obrigado, ${nome}.\n\n` +
      "Para tentar ajudar com orientações gerais sobre o exame de imagem mais adequado e segurança, informe:\n\n" +
      "• Idade aproximada da pessoa (ex.: 40 anos).\n" +
      "• Motivo principal da investigação (ex.: dor lombar, cefaleia, trauma, etc.).\n" +
      "• Se há algum exame de imagem já cogitado (RM, TC, RX, USG etc.).\n" +
      "• Condições importantes (implantes, próteses, marca-passo, gestação, alergias importantes).\n\n" +
      "Lembre-se: não envie nome completo, CPF ou qualquer dado que identifique o paciente."
    );
  }
}

function mensagemPosPerguntaMaisDuvida() {
  return (
    "\n\nPosso ajudar com mais alguma dúvida sobre este caso ou outro exame de imagem?\n" +
    "1 – Sim, tenho outra dúvida\n" +
    "2 – Não, pode finalizar o atendimento"
  );
}

function mensagemSolicitarNovaPergunta(nome) {
  return (
    `Perfeito, ${nome}.\n\n` +
    "Pode enviar sua próxima dúvida, lembrando de não incluir nome completo, CPF ou documentos."
  );
}

function mensagemEncerramento(nome) {
  return (
    `Agradeço o seu contato, ${nome}.\n\n` +
    "O SAFEX permanece disponível para dúvidas gerais sobre escolha de exames de imagem e segurança em exames.\n" +
    "Em situações específicas ou complexas, é sempre recomendada discussão direta com o radiologista e com o médico assistente.\n\n" +
    "Antes de encerrar, poderia avaliar se este atendimento foi útil para você?\n\n" +
    "De 1 a 4, como você avalia o atendimento:\n" +
    "1 – Não foi útil\n" +
    "2 – Ajudou pouco\n" +
    "3 – Ajudou\n" +
    "4 – Ajudou muito"
  );
}

function mensagemAgradecerFeedback() {
  return "Obrigado pelo seu feedback. Ele ajuda a melhorar continuamente o SAFEX.";
}

function mensagemNaoEntendiOpcao12() {
  return "Não entendi a opção. Por favor, responda com 1 ou 2.";
}

function mensagemNaoEntendiOpcao14() {
  return "Não entendi a opção. Por favor, responda com um número de 1 a 4.";
}

function mensagemSomenteTexto() {
  return "No momento, o SAFEX só consegue processar mensagens de texto. Por favor, envie sua dúvida em texto.";
}

// -----------------------------------------------------------------------------
// Bloco de serviço contratado / radiologista / agendamento
// -----------------------------------------------------------------------------
function montarBlocoServico(session) {
  // Regra simples: oferecer mais para médico e profissional de saúde.
  if (session.perfil === "MEDICO" || session.perfil === "PROF_SAUDE") {
    return (
      "\n\nPara casos que necessitam avaliação individualizada, recomenda-se contato direto com o serviço de imagem contratado:\n\n" +
      `• Serviço: ${SERVICO_CONTRATADO.nome}\n` +
      `• WhatsApp profissional: ${SERVICO_CONTRATADO.whatsapp}\n` +
      `• Link direto: ${SERVICO_CONTRATADO.linkWhatsapp}\n` +
      `• Agendamento: ${SERVICO_CONTRATADO.linkAgendamento}\n\n` +
      "Ao entrar em contato, evite enviar nome completo, CPF ou documentos. Utilize, se possível, o número interno do exame ou prontuário informado pelo serviço."
    );
  }
  return "";
}

// -----------------------------------------------------------------------------
// Função utilitária: chamar SAFEX (OpenAI) com contexto de sessão
// -----------------------------------------------------------------------------
async function chamarSafex(session, texto) {
  const historico = session.historicoLLM || [];

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historico,
    {
      role: "user",
      content: texto,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    temperature: 0.1,
  });

  const resposta = (completion.choices[0].message.content || "").trim();

  // Atualiza histórico simples
  session.historicoLLM = [
    ...historico,
    { role: "user", content: texto },
    { role: "assistant", content: resposta },
  ];

  return resposta;
}

// -----------------------------------------------------------------------------
// Orquestrador SAFEX por estado (usado pelo webhook do WhatsApp)
// -----------------------------------------------------------------------------
async function handleSafexMessage(userId, texto) {
  const session = getSession(userId);
  const entrada = (texto || "").trim();
  let resposta = "";

  switch (session.estado) {
    case "INICIAL":
      resposta = mensagemInicialConsentimento();
      session.estado = "CONSENTIMENTO";
      break;

    case "CONSENTIMENTO":
      if (entrada === "1") {
        resposta = mensagemPedirPrimeiroNome();
        session.estado = "PRIMEIRO_NOME";
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
      resposta = mensagemPerguntarPerfil(session.primeiroNome);
      session.estado = "PERFIL";
      break;

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
      resposta = mensagemColetaDuvida(session.primeiroNome, session.perfil);
      session.estado = "COLETA_DUVIDA";
      break;

    case "COLETA_DUVIDA":
      // Primeira dúvida: chama SAFEX
      if (!entrada) {
        resposta = "Por favor, descreva a situação clínica ou dúvida em texto.";
        break;
      }
      {
        const respostaSafex = await chamarSafex(session, entrada);
        resposta = respostaSafex + montarBlocoServico(session) + mensagemPosPerguntaMaisDuvida();
        session.estado = "PERGUNTA_NOVA_OU_ENCERRA";
      }
      break;

    case "DIALOGO_ATIVO":
      // Novas dúvidas, mesma sessão
      if (!entrada) {
        resposta = "Por favor, envie sua dúvida em texto.";
        break;
      }
      {
        const respostaSafexNova = await chamarSafex(session, entrada);
        resposta = respostaSafexNova + montarBlocoServico(session) + mensagemPosPerguntaMaisDuvida();
        session.estado = "PERGUNTA_NOVA_OU_ENCERRA";
      }
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

    case "FINALIZADO":
      resposta =
        "Atendimento pelo SAFEX finalizado. Se precisar novamente, envie uma nova mensagem para iniciar outro atendimento.";
      break;

    default:
      resposta = mensagemInicialConsentimento();
      session.estado = "CONSENTIMENTO";
      break;
  }

  saveSession(userId, session);
  return resposta;
}

// -----------------------------------------------------------------------------
// Rotas básicas de teste
// -----------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.status(200).send("SAFEX raiz OK");
});

app.get("/health", (req, res) => {
  res.status(200).send("SAFEX OK");
});

// Rota de teste direto do SAFEX (sem WhatsApp) – mantida
app.get("/test-safex", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: "Paciente com eGFR 38 mL/min/1,73m². É seguro usar contraste iodado?",
        },
      ],
      temperature: 0.1,
    });

    const answer = completion.choices[0].message.content;
    res.status(200).send(answer);
  } catch (err) {
    console.error("Erro na rota /test-safex:", err.response?.data || err.message);
    res.status(500).send(err.response?.data || err.message);
  }
});

// -----------------------------------------------------------------------------
// ROTA GET PARA VERIFICAÇÃO DO WEBHOOK (META/WHATSAPP)
// -----------------------------------------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso.");
    res.status(200).send(challenge);
  } else {
    console.log("Falha na verificação do webhook.");
    res.sendStatus(403);
  }
});

// -----------------------------------------------------------------------------
// ROTA POST PARA RECEBER MENSAGENS DO WHATSAPP
// -----------------------------------------------------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (
      body.object &&
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const text = message.text?.body || "";

      console.log("Mensagem recebida do WhatsApp:", text);

      let reply;
      if (!text) {
        reply = mensagemSomenteTexto();
      } else {
        // Aqui entra o fluxo SAFEX com estados
        reply = await handleSafexMessage(from, text);
      }

      console.log("Resposta SAFEX:", reply);

      try {
        await axios.post(
          `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: reply },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Mensagem enviada ao WhatsApp com sucesso.");
      } catch (waErr) {
        console.error(
          "Erro ao enviar mensagem ao WhatsApp:",
          waErr.response?.status,
          JSON.stringify(waErr.response?.data, null, 2) || waErr.message
        );
      }
    } else {
      console.log("Webhook recebido sem mensagem de texto válida.");
    }

    res.sendStatus(200);
  } catch (err) {
    if (err.response) {
      console.error(
        "Erro no webhook POST:",
        err.response.status,
        JSON.stringify(err.response.data, null, 2)
      );
    } else {
      console.error("Erro no webhook POST:", err.message);
    }
    res.sendStatus(500);
  }
});

// -----------------------------------------------------------------------------
// INICIAR SERVIDOR
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// INICIAR SERVIDOR
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`SAFEX vivo na porta ${PORT}`);
});
