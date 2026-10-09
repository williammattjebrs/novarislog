# Roadmap

## Revisão de confiabilidade — anexo 07/10/2026
- [x] Permissões efetivas, usuários inativos e proteção de valores financeiros; matriz comercial/operação/financeiro validada em transação revertida
- [x] Persistência confirmada, recuperação de falha de rede, conflitos por versão e isolamento de sessão
- [x] Importação fiscal deduplicada, CT-e multi-NF, receita única, rateio exato e conferência independente
- [x] Prévia e confirmação de regularização dos registros históricos; nenhuma correção em lote executada
- [x] Baixas parciais, estornos e totais financeiros mensais; testes de centavos e dupla contagem
- [x] Navegação móvel, busca global e central de pendências; verificadas na sessão administrativa
- [x] Backup persistido versão 2 e restauração com prévia; merge/readback validado em transação revertida
- [x] Processador no servidor desativado, proteção por segredo e histórico de execuções; simulação sem importar/enviar validada
- [x] 17 testes de regressão, validações SQL revertidas e investigação TLS do domínio
- [x] Manual atualizado e relatório em REVISAO-CONFIABILIDADE.md

- [x] Grupos de e-mail compartilhados por cliente e envio manual pelo sistema
- [ ] Ativação de produção do envio/captação com aplicativo fechado — aguarda autorização, segredo, responsável ativo, agendamento externo e publicação; sem envios reais nesta revisão

- [x] Atualização de rastreio: tabela por nota, previsão com data/hora e e-mail UTF-8 sem acentos corrompidos

- [x] Manual de uso: treinamento por módulo com telas reais, busca e navegação no app

- [x] Exportação: PDF/Excel de listas (coletas, financeiro) + backup dos dados
- [x] Ajustes menores: alertas de divergência de CT-e no painel da TV e no financeiro
- [x] Ajustes menores: busca e filtros rápidos nas listas com muitos registros
- [ ] Acesso por e-mail: login real de usuários (Cloud) + área de configuração de usuários
  - [x] Cloud ativado, e-mail/senha habilitado, banco (profiles/user_roles) migrado
  - [x] Login real (entrar, criar acesso, recuperar senha) + nova tela de login
  - [x] Área "Usuários & acessos" (convidar por e-mail, alterar perfil, excluir)
  - [ ] Testar fluxo completo (convite → confirmação de e-mail → primeiro login) — depende do e-mail real ser confirmado
- [x] Conexão Microsoft 365 existente preservada; sem busca real durante a revisão

- [x] Estrutura Rota ≠ Ordem de Coleta: rota por remetente+destinatário com várias NFs, motorista e veículo
- [x] Cadastros de Motoristas e Veículos
- [x] Ordem de Coleta com local/horário de coleta e entrega, base do monitoramento
- [x] Espelho de coleta exportável (PDF/impressão) e envio ao motorista
- [x] Separação Rotas (fila NF) / Ordens de coleta (rascunho→emissão PDF) / Monitoramento (só OCs emitidas); locais operacionais; fila de e-mail durável

## Pendente
- [ ] Ativar envio real das OCs: depende de ligar o agendador do servidor (desligado na validação)
- [ ] Confirmar conversão das OCs legadas pela prévia (ação do administrador)
- [ ] Teste de emissão simultânea em dois dispositivos reais (garantido por bloqueio/versão no banco, validado em transação)
- [ ] Rateio manual sem base/peso e regularização fiscal de CT-e histórico — não implementados nesta revisão; exigem fluxo autorizado e confirmação operacional
- [ ] Teste de importação simultânea em dois dispositivos e confirmação de restauração pela tela em ambiente isolado — validações transacionais já passaram, testes completos não executados
- [x] Multi-NF e multi-CT-e: rota/OC já agrupam várias NFs; CT-e vincula por todas as chaves de NF referenciadas; mesmo veículo/motorista reutilizável em várias OCs
- [ ] Envio automático do PDF da OC pelo WhatsApp Business (aguarda conectar conta WhatsApp Business e aprovação do modelo pela Meta); hoje abre o WhatsApp com link do PDF.
- [x] Local de entrega (descarga) opcional na OC

## OC automática, empresas e relatórios (08/10/2026)
- [x] Importação de NF-e cria/atualiza rascunho de OC (mesmo remetente+destinatário)
- [x] Empresa emissora, contratação e custo do motorista obrigatórios na emissão; custo vira despesa prevista
- [x] Rotas renomeada para Acompanhamento de Coleta, com follow-up das OCs emitidas
- [x] Financeiro: clicar na receita/despesa para marcar recebido/pago/parcial/estorno
- [x] Cadastro de empresas do grupo com logo; filtro global por empresa
- [x] Relatórios gerenciais com exportação

## Listas detalhadas nos relatórios
- [x] Substituir resumos por listas de NFs, OCs e títulos; manter filtros e exportar detalhes
- [x] Verificar listas na sessão administrativa, filtro por veículo, CSV e impressão; 16 testes existentes aprovados

## Follow-up e apontamentos de monitoramento
- [x] Atualizar tabela de follow-up manual e automático com coleta e última observação
- [x] Anexar e consultar comprovantes de entrega vinculados à NF de OC emitida
- [x] Registrar observação ou ocorrência diretamente na lista de monitoramento
- [x] Validar gravação, anexos e prévia sem enviar e-mails reais; 18 testes aprovados e fluxo autenticado com dados descartáveis

## WhatsApp Business (preparação)
- [ ] Usuário colar credenciais da API WhatsApp Business (ID do número, WABA, token) em Configurações e ativar; tela com salvar/testar já pronta, falta ligar envio de PDF e recebimento de comprovantes às credenciais

## Custo obrigatório e status de viagem (09/10/2026)
- [x] Emissão de OC travada sem custo da operação (tela + servidor, migração 0025)
- [x] CT-e vinculado: NF vira "CT-e emitido" e OC vira "Aguardando início de viagem" (migração 0026); monitoramento destaca o número do CT-e
