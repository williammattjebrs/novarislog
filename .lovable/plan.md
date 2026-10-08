# Plano — OC automática, custo do motorista, Acompanhamento de Coleta, empresas do grupo e relatórios

## 1. Importou XML, já vira OC rascunho
- Toda NF-e importada (manual, e-mail ou automação de 5 em 5 min) entra direto em um rascunho de OC.
- Regra de agrupamento: mesmo remetente + mesmo destinatário + mesma empresa do grupo, e o rascunho ainda não emitido. Se existir, a NF é acrescentada (com registro no histórico); se não existir, um novo rascunho é criado.
- Reimportar a mesma NF não duplica nada. NF já em OC emitida nunca é movida.
- Rascunho nunca envia e-mail. Só a emissão envia, como hoje.
- Substitui a regra atual "importação nunca cria OC" (registro técnico e manual atualizados).

## 2. Custo do motorista na OC
- Campo "Tipo de contratação": Terceiro ou Frota própria.
- Terceiro: "Valor fechado com o motorista (R$)" obrigatório para emitir.
- Frota: custo informado manualmente (diesel, pedágio, comissão etc. ou total), também obrigatório para emitir.
- O custo vai para o financeiro da OC (despesa a pagar) e para a margem.

## 3. Emitiu, vai para "Acompanhamento de Coleta"
- A aba "Rotas – NF-e" passa a se chamar **Acompanhamento de Coleta**.
- OCs emitidas aparecem ali imediatamente para o follow-up (agendada, em coleta, coletada, ocorrência, previsão, observação).
- Ordens de coleta passa a mostrar só rascunhos e OCs em preparação.
- Depois do CT-e, segue para Monitoramento como hoje.

## 4. Financeiro: marcar pago/recebido
- Clicar numa receita ou despesa abre ação rápida: Recebido / Pago / Parcial / Em aberto / Cancelado, com data e valor.
- Segue a regra atual de histórico de pagamentos (não apaga, só acrescenta e estorna).

## 5. Empresas do grupo
- Nova página **Empresas** (admin): nome, razão social, CNPJ, endereço, telefone, e-mail, logo (upload), ativa.
- Na OC: escolher a empresa emissora (obrigatório para emitir). O PDF, o e-mail aos armazéns e o WhatsApp usam o nome, logo e contatos dessa empresa.
- Filtro "Empresa: Todas / X" no topo do sistema, valendo para todas as páginas (OCs, Acompanhamento, Monitoramento, Financeiro, Torre, Relatórios). A escolha fica salva por usuário.
- Registros antigos ficam como "sem empresa" até serem vinculados.

## 6. Relatórios gerenciais
Nova aba **Relatórios**, com filtro de empresa e período, e exportação Excel/PDF:
- Faturamento x custo x margem por empresa, cliente, rota e mês.
- OCs emitidas, coletadas, entregues; prazo cumprido.
- Custo por tipo (terceiro x frota), por motorista e por veículo.
- Recebimentos e pagamentos em aberto/vencidos.
- Ocorrências por tipo e cliente.

## Detalhes técnicos
- Nova coleção `companies` em app_records (logo no armazenamento de arquivos); campo `empresaId` em OCs, NFs, receitas e despesas.
- Agrupamento automático no caminho único de importação (manual e headless), dentro da transação de importação para não duplicar sob concorrência; o vínculo NF–OC ativo continua garantido no servidor.
- Snapshot/PDF da OC passa a guardar os dados da empresa emissora (imutável por versão).
- Validação de emissão: empresa, tipo de contratação e custo.
- Filtro global de empresa via contexto compartilhado + preferência por usuário.
- Rota nova `/relatorios` e `/empresas`; `/rotas` renomeada no menu, links antigos preservados.
- Atualizar AGENTS.md, manual, roadmap e testes do modelo de OC.
