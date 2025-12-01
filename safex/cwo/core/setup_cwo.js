// cwo/core/setup_cwo.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

console.log("🚀 Iniciando setup CWO com metadados e registro central...");

// Diretório base
const baseDir = path.join(__dirname, "..");
const registryPath = path.join(__dirname, "registry.json");

// Lista de domínios ativos do ecossistema
const domains = [
  "imaging",             // Imagem médica (SAFEX)
  "analises_clinicas",   // Exames laboratoriais
  "pronto_atendimento",  // Emergência e triagem
  "endoscopia",          // Procedimentos endoscópicos
  "clinica"              // Avaliações clínicas gerais
];

// Estrutura interna padrão
const coreDirs = ["config", "core", "data"];

// Função: criar diretório se não existir
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log("📁 Criado:", dir);
  }
}

// Função: criar arquivo se não existir
function createFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content.trimStart(), "utf8");
    console.log("📝 Criado:", filePath);
  }
}

// Templates básicos
const templates = {
  index: (domain) => `// ${domain}/core/index.js
module.exports = {
  name: "${domain}",
  description: "Módulo base ${domain} do ecossistema CWO",
  version: "1.0.0"
};
`,

  systemPrompt: (domain) => `// ${domain}/config/systemPrompt.js
module.exports = {
  systemPrompt: "Você está atuando no domínio ${domain.toUpperCase()} dentro do ecossistema CWO. Utilize diretrizes clínicas e fluxos seguros específicos desta área."
};
`,

  diretrizes: (domain) => `# Diretrizes Base - ${domain.toUpperCase()}
Este arquivo contém diretrizes iniciais de configuração do domínio **${domain}**.
Atualize com protocolos e normas específicas de cada setor.
`
};

// Função: gerar metadados JSON com UUID
function createMetadata(domain) {
  const uuid = crypto.randomUUID();
  const metadata = {
    domain,
    uuid,
    created_at: new Date().toISOString(),
    version: "1.0.0",
    author: "Sistema CWO Setup",
    description: `Domínio ${domain} criado automaticamente pelo setup CWO.`,
    status: "ativo"
  };
  return metadata;
}

// Inicializa registro global
let registry = {
  cwo_version: "1.0.0",
  generated_at: new Date().toISOString(),
  domains: []
};

// Garante que a pasta domains exista
ensureDir(path.join(baseDir, "domains"));
console.log("\n🧩 Criando domínios com metadados...\n");

// Loop principal
for (const domain of domains) {
  const domainPath = path.join(baseDir, "domains", domain);
  ensureDir(domainPath);

  // Criação das subpastas padrão
  for (const sub of coreDirs) {
    ensureDir(path.join(domainPath, sub));
  }

  // Criação dos arquivos básicos
  createFile(path.join(domainPath, "core", "index.js"), templates.index(domain));
  createFile(path.join(domainPath, "config", "systemPrompt.js"), templates.systemPrompt(domain));
  createFile(path.join(domainPath, "data", "diretrizes_base.txt"), templates.diretrizes(domain));

  // Metadados e inclusão no registro
  const metadata = createMetadata(domain);
  const metadataPath = path.join(domainPath, "metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf8");

  registry.domains.push({
    ...metadata,
    path: path.resolve(domainPath)
  });

  console.log(`✅ Domínio configurado: ${domain}`);
}

// Criação/atualização do registro global
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8");
console.log("\n📚 Registro global atualizado em:", registryPath);

console.log("\n✨ Setup CWO concluído com sucesso.");
