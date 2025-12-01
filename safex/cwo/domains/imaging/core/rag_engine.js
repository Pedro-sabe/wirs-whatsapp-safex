// safex/core/rag_engine.js
const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Leitura recursiva de todos os .txt dentro de /safex/data/ e subpastas
// -----------------------------------------------------------------------------
function lerArquivosRecursivo(diretorio) {
  let arquivos = [];
  const itens = fs.readdirSync(diretorio);

  for (const item of itens) {
    const caminhoCompleto = path.join(diretorio, item);
    const stats = fs.statSync(caminhoCompleto);

    if (stats.isDirectory()) {
      // Subpasta → varre recursivamente
      arquivos = arquivos.concat(lerArquivosRecursivo(caminhoCompleto));
    } else if (item.endsWith(".txt")) {
      arquivos.push(caminhoCompleto);
    }
  }

  return arquivos;
}

// -----------------------------------------------------------------------------
// Montagem do banco de conhecimento dinâmico
// -----------------------------------------------------------------------------
function carregarDiretrizes() {
  const baseDir = path.join(__dirname, "../data");
  const arquivos = lerArquivosRecursivo(baseDir);
  const diretrizes = [];

  for (const arquivo of arquivos) {
    try {
      const conteudo = fs.readFileSync(arquivo, "utf8");
      diretrizes.push({ fonte: path.basename(arquivo), conteudo });
    } catch (err) {
      console.error("Erro ao ler arquivo:", arquivo, err.message);
    }
  }

  return diretrizes;
}

// -----------------------------------------------------------------------------
// Busca contextual simples (por similaridade textual básica)
// -----------------------------------------------------------------------------
function buscarContexto(texto, diretrizes) {
  const termo = texto.toLowerCase();
  const relevantes = [];

  for (const d of diretrizes) {
    if (d.conteudo.toLowerCase().includes(termo)) {
      relevantes.push(d);
    }
  }

  // fallback: se não achou correspondência exata, retorna as 3 primeiras
  return relevantes.length > 0 ? relevantes : diretrizes.slice(0, 3);
}

// -----------------------------------------------------------------------------
// Função principal — retorna blocos de diretrizes combinados
// -----------------------------------------------------------------------------
async function obterContextoRAG(pergunta) {
  const diretrizes = carregarDiretrizes();
  const relevantes = buscarContexto(pergunta, diretrizes);

  let resultado = "";
  for (const d of relevantes) {
    resultado += `Fonte: ${d.fonte}\n${d.conteudo}\n\n---\n`;
  }

  return resultado.trim() || "Nenhuma diretriz relevante encontrada.";
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------
module.exports = { obterContextoRAG };
