# SAFEX – Diretrizes Clínicas e Regras Técnicas
Versão: v202502  
Status: Ativa  
Última revisão: 22/11/2025  
Responsável: Dr. Pedro (WiHealth)  

---

## 1. Fontes Clínicas Integradas

As recomendações seguem, de forma consolidada, os fundamentos das seguintes instituições:
- ACR (American College of Radiology)
- ESUR (European Society of Urogenital Radiology)
- ANVISA (Instruções Normativas aplicáveis)
- CBR (Colégio Brasileiro de Radiologia)
- AAPM (American Association of Physicists in Medicine)
- ICRP (International Commission on Radiological Protection)

**Observação:**  
As diretrizes acima não são expostas diretamente ao usuário.  
Somente suas conclusões operacionais são incorporadas ao SAFEX.

---

## 2. Regras Técnicas Vigentes (Resumo)

### 2.1 Contraste Iodado
- Evitar se eGFR < **30** mL/min/1,73m².  
- Pacientes em metformina: manter uso se eGFR ≥ 30; reavaliar se < 30.  
- Hidratação recomendada em risco intermediário.

### 2.2 Gadolínio
- Preferir agentes **Grupo II**.  
- Evitar em DRC grave (eGFR < 30), salvo benefício crítico.

### 2.3 RM e Implantes
- *MR Safe*: permitido.  
- *MR Conditional*: seguir parâmetros.  
- *MR Unsafe*: contraindicar RM.

### 2.4 Gestação
- Evitar TC sempre que houver alternativa equivalente.  
- Preferir RM sem contraste.

### 2.5 Pediatria
- Aplicar rigorosamente ALARA (AAPM).  
- Evitar TC seriadas sem impacto clínico.

### 2.6 Controle de Radiação em TC
- Seguir limites e boas práticas da ANVISA / ICRP.

---

## 3. Estrutura e Atualização

### 3.1 Atualização Programada
- Revisão semestral (Janeiro e Julho de cada ano).
- Revisão adicional quando alguma diretriz majoritária é atualizada (ACR, ESUR etc.).

### 3.2 Procedimento de Atualização
Ao revisar diretrizes:
1. Avaliar mudanças oficiais.  
2. Registrar aqui quais itens foram alterados.  
3. Atualizar o SYSTEM_PROMPT no Node.js.  
4. Commit → push → deploy.  

---

## 4. Histórico de Alterações

### v202502 – versão inicial
- Compilação das diretrizes ACR/ESUR/ANVISA/CBR vigentes até 2025.
- Definição dos limiares de eGFR (iodado e gadolínio).
- Inclusão das regras de pediatria (AAPM) e gestação.
- Criação do fluxo de auditoria clínica.

---

## 5. Observações Finais
Este documento serve como base de auditoria, controle clínico e rastreabilidade técnica do SAFEX.  
Nenhum dado sensível ou identificável de usuários deve ser incluído aqui.

