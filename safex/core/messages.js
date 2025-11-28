// safex/core/messages.js

function mensagemInicialConsentimento(session) {
  const saudacaoNome = session.primeiroNome ? `Olá, ${session.primeiroNome}. ` : "Olá, ";
  const introCadastro = session.primeiroNome
    ? ""
    : "\n\nVou fazer poucas perguntas e depois te dou um auxílio orientativo sobre o exame.\n";

  return (
    `${saudacaoNome}eu sou o SAFEX, assistente para segurança e adequação de exames de imagem.\n` +
    introCadastro +
    "\nImportante:\n" +
    "• Não substitui consulta médica presencial.\n" +
    "• Não deve ser usado em casos de urgência ou emergência.\n" +
    "• Em situações graves, procure imediatamente um serviço de emergência.\n\n" +
    "Privacidade:\n" +
    "• Não envie documentos, fotos ou arquivos.\n" +
    "• Não envie nome completo, CPF, RG, endereço ou número de prontuário.\n\n" +
    "Você concorda em seguir com o atendimento pelo SAFEX?\n" +
    "1 – Sim, concordo\n" +
    "2 – Não concordo"
  );
}

function mensagemRecusaConsentimento() {
  return (
    "Entendido. Sem o seu consentimento não posso seguir com o atendimento pelo SAFEX.\n" +
    "Em caso de dúvida específica, procure o serviço de imagem ou o médico assistente."
  );
}

function mensagemPedirPrimeiroNome() {
  return "Para personalizar o atendimento, informe apenas o seu primeiro nome (sem sobrenome).";
}

function mensagemPedirEmail(nome) {
  return (
    `Obrigado, ${nome}.\n\n` +
    "Informe um e-mail de contato. Ele será usado apenas para confirmar seu cadastro e reconhecer você nas próximas vezes."
  );
}

function mensagemConfirmarIdentidade(session) {
  return (
    "Confira seus dados:\n" +
    `Nome: ${session.primeiroNome}\n` +
    `E-mail: ${session.email}\n\n` +
    "Está correto? (Responda SIM ou NÃO)"
  );
}

function mensagemPerguntarPerfil(nome) {
  return (
    `Obrigado, ${nome}.\n\n` +
    "Selecione a opção que melhor descreve você:\n" +
    "1 – Médico(a)\n" +
    "2 – Profissional em Saúde\n" +
    "3 – Paciente ou Acompanhante\n\n" +
    "Responda apenas com o número."
  );
}

function mensagemColetaDuvida(nome, perfil, recorrente = false) {
  const prefixo = recorrente
    ? `Olá novamente, ${nome}.\n\n`
    : `Obrigado, ${nome}.\n\n`;

  if (perfil === "MEDICO") {
    return (
      prefixo +
      "Em poucas palavras, escreva:\n" +
      "• Situação clínica principal ou hipótese diagnóstica.\n" +
      "• Exame(s) de imagem cogitado(s) ou solicitado(s).\n\n" +
      "Não inclua nome completo, CPF ou dados que identifiquem o paciente."
    );
  } else if (perfil === "PROF_SAUDE") {
    return (
      prefixo +
      "Em poucas palavras, escreva:\n" +
      "• Motivo clínico principal do exame.\n" +
      "• Exame de imagem cogitado (RM, TC, RX, USG etc.).\n\n" +
      "Não inclua dados pessoais identificáveis."
    );
  } else {
    return (
      prefixo +
      "Em poucas palavras, escreva:\n" +
      "• Idade aproximada (ex.: 40 anos).\n" +
      "• Motivo do exame (ex.: dor lombar, cefaleia, trauma).\n" +
      "• Exame cogitado (se souber).\n\n" +
      "Não envie nome completo, CPF ou dados pessoais."
    );
  }
}

function mensagemChecklistRisco() {
  return (
    "Há mais alguma informação importante para acrescentar?\n" +
    "Em especial, informe se existir:\n" +
    "• Alergia importante a medicamentos ou contrastes\n" +
    "• Insuficiência renal conhecida\n" +
    "• Marcapasso cardíaco ou desfibrilador implantável\n" +
    "• Materiais metálicos no corpo (clipes, próteses, fragmentos)\n" +
    "• Claustrofobia importante\n" +
    "• Gestante ou suspeita de gestação\n" +
    "• Criança ou idoso com dificuldade de permanecer parado\n" +
    "• Aparelho dentário fixo\n\n" +
    "Responda em poucas linhas. Se nada disso se aplicar, escreva apenas: 'Sem fatores adicionais relevantes'."
  );
}

function mensagemConfirmacaoDadosClinicos() {
  return (
    "Recebi as informações.\n\n" +
    "Se alguma coisa estiver incorreta ou faltando, você pode corrigir ou acrescentar agora.\n" +
    "Se estiver tudo certo, responda apenas: OK."
  );
}

function mensagemPosPerguntaMaisDuvida() {
  return (
    "\n\nPosso ajudar com mais alguma dúvida sobre este ou outro exame de imagem?\n" +
    "1 – Sim, tenho outra dúvida\n" +
    "2 – Não, pode finalizar o atendimento"
  );
}

function mensagemSolicitarNovaPergunta(nome) {
  return (
    `Perfeito, ${nome}.\n\n` +
    "Pode enviar sua próxima dúvida sobre exame de imagem, em texto."
  );
}

function mensagemEncerramento(nome) {
  return (
    `Agradeço o seu contato, ${nome}.\n\n` +
    "O SAFEX permanece disponível para dúvidas gerais sobre escolha de exames de imagem e segurança.\n\n" +
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
  return (
    "Por segurança, o SAFEX não processa documentos, imagens ou arquivos enviados.\n" +
    "Copie e cole apenas o texto essencial do pedido médico ou resultado, sem nome completo, CPF, telefone ou outros dados pessoais."
  );
}

// MVP: não expõe WhatsApp/agenda do serviço
function montarBlocoServico(session) {
  return "";
}

module.exports = {
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
};
