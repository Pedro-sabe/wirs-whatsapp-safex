// safex/core/messages.js

// -----------------------------------------------------------------------------
// Mensagens fixas do fluxo SAFEX (simplificadas e alinhadas ao MVP)
// -----------------------------------------------------------------------------

// 0. Mensagem inicial + consentimento
function mensagemInicialConsentimento() {
  return (
    "Olá, sou o SAFEX — Assistente de apoio à decisão em exames de imagem.\n\n" +
    "Posso orientar, de forma geral, sobre:\n" +
    "• Qual exame pode ser mais adequado\n" +
    "• Questões de segurança (contraste, implantes, gestação, radiação)\n\n" +
    "Importante:\n" +
    "• Não substitui consulta médica\n" +
    "• Não usar em urgência/emergência\n" +
    "• Não envie fotos, documentos ou dados pessoais\n\n" +
    "Você concorda em seguir?\n" +
    "1 – Sim, concordo\n" +
    "2 – Não concordo"
  );
}

function mensagemRecusaConsentimento() {
  return (
    "Tudo bem. O atendimento pelo SAFEX só pode ocorrer com consentimento.\n" +
    "Em caso de dúvidas, procure seu médico ou serviço de imagem."
  );
}

// -----------------------------------------------------------------------------
// 1. Coleta de Nome / Email / Perfil
// -----------------------------------------------------------------------------
function mensagemPedirPrimeiroNome() {
  return "Obrigado. Informe apenas seu primeiro nome.";
}

function mensagemPedirEmail(nome) {
  return `Perfeito, ${nome}. Agora informe um e-mail de contato.`;
}

function mensagemPerguntarPerfil(nome) {
  return (
    `Obrigado, ${nome}.\n` +
    "Como você se identifica?\n" +
    "1 – Médico(a)\n" +
    "2 – Profissionais em Saúde\n" +
    "3 – Outros (paciente, familiar, estudante)"
  );
}

// -----------------------------------------------------------------------------
// 2. Coleta da dúvida principal — adaptada por perfil
// -----------------------------------------------------------------------------
function mensagemColetaDuvida(nome, perfil) {
  if (perfil === "MEDICO") {
    return (
      `Certo, Dr(a). ${nome}.\n\n` +
      "Descreva brevemente a situação clínica (sem identificar o paciente):\n" +
      "• Hipótese diagnóstica ou motivo do exame\n" +
      "• Método cogitado (RM, TC, RX, USG)\n" +
      "• Dados relevantes: implantes, marca-passo, alergia a contraste, gestação, DRC, etc."
    );
  }

  if (perfil === "PROF_SAUDE") {
    return (
      `Obrigado, ${nome}.\n\n` +
      "Informe, sem identificar o paciente:\n" +
      "• Motivo principal\n" +
      "• Exame cogitado\n" +
      "• Situações importantes (prótese, gestação, alergia, risco clínico)."
    );
  }

  return (
    `Obrigado, ${nome}.\n\n` +
    "Para tentar ajudar, informe:\n" +
    "• Idade aproximada\n" +
    "• Motivo (ex.: dor lombar, cefaleia)\n" +
    "• Exame cogitado\n" +
    "• Se há gestação, alergia importante ou implantes."
  );
}

// -----------------------------------------------------------------------------
// 3. Perguntas adicionais obrigatórias de segurança
// -----------------------------------------------------------------------------
function mensagemPerguntasAdicionais() {
  return (
    "Antes de analisar, poderia informar se existe alguma dessas condições?\n\n" +
    "Alergia importante?\n" +
    "Insuficiência renal?\n" +
    "Marca-passo cardíaco?\n" +
    "Materiais metálicos no corpo?\n" +
    "Claustrofobia?\n" +
    "Gestante?\n" +
    "Criança ou idoso com dificuldade de permanecer parado?\n" +
    "Aparelho dentário fixo?\n\n" +
    "Responda em um único parágrafo."
  );
}

// -----------------------------------------------------------------------------
// 4. Mensagens de continuidade
// -----------------------------------------------------------------------------
function mensagemPosPerguntaMaisDuvida() {
  return (
    "\n\nPosso ajudar com mais alguma dúvida?\n" +
    "1 – Sim\n" +
    "2 – Não, pode finalizar"
  );
}

function mensagemSolicitarNovaPergunta(nome) {
  return (
    `Perfeito, ${nome}.\n` +
    "Pode enviar sua próxima dúvida (sem dados pessoais)."
  );
}

// -----------------------------------------------------------------------------
// 5. Encerramento e Feedback
// -----------------------------------------------------------------------------
function mensagemEncerramento(nome) {
  return (
    `Agradeço o contato, ${nome}.\n\n` +
    "Antes de encerrar, poderia avaliar o atendimento?\n" +
    "1 – Não foi útil\n" +
    "2 – Ajudou pouco\n" +
    "3 – Ajudou\n" +
    "4 – Ajudou muito"
  );
}

function mensagemAgradecerFeedback() {
  return "Obrigado pelo feedback. Ele ajuda a melhorar continuamente o SAFEX.";
}

// -----------------------------------------------------------------------------
// 6. Tratamento de erros / entradas inválidas
// -----------------------------------------------------------------------------
function mensagemNaoEntendiOpcao12() {
  return "Não entendi. Por favor, responda com 1 ou 2.";
}

function mensagemNaoEntendiOpcao14() {
  return "Não entendi. Responda com um número de 1 a 4.";
}

function mensagemSomenteTexto() {
  return (
    "O SAFEX não processa arquivos, imagens ou documentos, " +
    "para evitar compartilhamento de dados pessoais.\n" +
    "Por favor, envie apenas texto descrevendo a situação."
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------
module.exports = {
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
};
