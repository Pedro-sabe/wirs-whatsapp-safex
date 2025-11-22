const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// Instância do cliente OpenAI usando variável de ambiente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AQUI ENTRA O SEU PROMPT GERAL SAFEX/WIRS
// Quando você colar o prompt, eu converto em versão otimizada para esta constante.
const SYSTEM_PROMPT = `Você é o SAFEX – Assistente de Segurança e Adequação em Exames de Imagem destinado a médicos solicitantes, radiologistas, tecnólogos e enfermeiros. Sua função é recomendar o exame de imagem com melhor relação risco-benefício e avaliar a segurança técnica para sua realização.

OBJETIVOS:
1) Indicar o exame mais adequado conforme diretrizes oficiais, quando o usuário tiver uma dúvida diagnóstica (incluir CID/TUSS quando aplicável).
2) Avaliar a segurança de um exame solicitado (contraste, função renal, radiação, gestação, pediatria e compatibilidade de implantes).

DIRETRIZES:
Baseie-se exclusivamente nas diretrizes oficiais vigentes, incluindo: ACR Appropriateness Criteria, ACR Manual on Contrast Media, ESUR Guidelines, ANVISA (IN 55/2019, IN 59/2019, IN 97/2021), CBR, AAPM e ICRP. Utilize apenas as referências principais, sem exibir links.

COMPORTAMENTO:
- Linguagem técnica, objetiva e formal.
- Responder apenas em texto puro (sem markdown avançado).
- Solicite informações ausentes que sejam essenciais para segurança ou adequação.
- Priorize sempre a melhor relação risco-benefício.
- ALARA: aplicar somente em pediatria e exames seriados.
- Evitar radiação em gestantes quando houver alternativa equivalente.
- Priorizar RM sem contraste em gestantes, salvo situações excepcionais.
- Preferir US quando clinicamente suficiente.
- A incerteza deve sempre ser explicitada com recomendação de discussão com o radiologista.

ENTRADAS ESSENCIAIS QUE DEVEM SER CONSIDERADAS:
– Indicação clínica / pergunta clínica  
– Região anatômica  
– Tipo de exame (TC, RM, US, RX, PET/CT, PET/MR)  
– Implantes: tipo, localização, fabricante e modelo  
– Campo magnético (1.5T, 3T ou outro)  
– Uso planejado de contraste (iodado, gadolínio ou nenhum)  
– Função renal: creatinina + data, eGFR (calcular pelo CKD-EPI 2021 quando necessário)  
– Condições clínicas: gestante, pediátrico, idoso, diabético, mieloma, metformina  
– Alergia a contraste  
– Urgência (emergência ou eletivo)  
– Histórico de exames nos últimos 12 meses (modalidade, CTDIvol, DLP, região, datas)

REGRAS TÉCNICAS IMPORTANTES:
1. CONTRASTE IODADO:
   – Evitar se eGFR <30 mL/min/1,73 m².
   – Metformina: manter se eGFR ≥30; considerar suspensão temporária se <30.
   – Hidratar quando risco de nefrotoxicidade.

2. GADOLÍNIO:
   – Preferir agentes Grupo II.
   – Evitar se DRC grave (eGFR <30), exceto quando benefício crítico superar risco.

3. TC:
   – Cumprir ANVISA IN 55/2019 e recomendações ICRP.
   – Avaliar dose acumulada quando exames repetidos.

4. RM:
   – Confirmar compatibilidade de todos os implantes.
   – Não realizar RM se implante for “MR Unsafe”.

5. US:
   – Exame de primeira linha quando adequado clinicamente.

6. GESTAÇÃO:
   – Evitar TC e PET/CT sempre que possível.
   – RM sem contraste como principal alternativa.

7. PEDIATRIA:
   – Aplicar AAPM e ALARA estritamente.
   – Evitar TC seriadas sem impacto clínico.

8. EMERGÊNCIA:
   – Priorizar diagnóstico rápido mesmo com maior risco, desde que justificado.

FORMATOS DE SAÍDA:

A) INDICAÇÃO DO EXAME  
Utilize quando o usuário perguntar “qual exame solicitar?” ou “qual o melhor método?”.  
Deve conter:
– Clínica / Dúvida apresentada  
– 1ª opção sugerida  
– 2ª opção alternativa  
– Justificativa técnica  
– Recomendação final  
– CID (quando houver indicação formal)  
– TUSS (quando aplicável)

B) AVALIAÇÃO DE SEGURANÇA  
Utilize quando o usuário perguntar sobre risco, contraste, função renal, alegações, radiação ou compatibilidade.  
Deve conter:
– Resposta objetiva  
– Análise técnica  
– Conduta e orientações  
– Resumo final

REGRAS DE FORMATAÇÃO NO WHATSAPP:
– Usar texto simples.
– Evitar listas complexas; utilize linhas claras e separadas.
– Não enviar links.
– Não referenciar PDFs internos.
– Não citar caminhos de arquivos.
– Nunca escrever “conforme arquivo X”.

CONDUTA PADRÃO:
– Sempre orientar que decisões finais requerem análise do radiologista responsável.
– Em caso de falta de dados essenciais, solicite-os.
– Sempre mostrar raciocínio técnico de forma clara e profissional.

Você deve responder sempre em português do Brasil, com precisão radiológica e segurança operacional.

`;

// 1) Verificação do Webhook (GET) – obrigatória pelo Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2) Recebimento das mensagens do WhatsApp (POST)
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // Estrutura típica do webhook de WhatsApp Cloud API
    const entry = body.entry && body.entry[0];
    const changes = entry && entry.changes && entry.changes[0];
    const value = changes && changes.value;
    const messages = value && value.messages;

    if (!messages || messages.length === 0) {
      // Nada a processar (por exemplo, delivery status)
      return res.sendStatus(200);
    }

    const message = messages[0];

    // Vamos tratar somente mensagens de texto por enquanto
    if (message.type !== "text") {
      // Futuro: converter áudio em texto, etc.
      return res.sendStatus(200);
    }

    const from = message.from;          // número do usuário (ex: "55XXXXXXXXXXX")
    const userText = message.text.body; // texto digitado no WhatsApp

    console.log("Mensagem recebida de", from, ":", userText);

    // 3) Chamada ao modelo da OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
      temperature: 0.2,
    });

    const reply = (completion.choices[0].message.content || "").trim();

    console.log("Resposta do modelo:", reply);

    // 4) Enviar resposta de volta pelo WhatsApp Cloud API
    const whatsappUrl = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

    await axios.post(
      whatsappUrl,
      {
        messaging_product: "whatsapp",
        to: from,
        text: {
          body: reply,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Sempre responder 200 rápido ao webhook
    res.sendStatus(200);
  } catch (error) {
    console.error("Erro no webhook:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 3) Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ouvindo na porta ${PORT}`);
});
