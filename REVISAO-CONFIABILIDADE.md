# Revisão de confiabilidade — 07/10/2026

## Entregue
- Permissões por perfil e módulos, bloqueio de inativos nas funções e leitura de dados, valores financeiros ocultados na leitura autorizada.
- Gravação confirmada, aviso de falha, tentativa de recuperação na sessão e rejeição de versões concorrentes. Cache antigo não recria registros excluídos.
- Importação transacional de CT-e, documento único, múltiplas NFs/CT-es, receita única e rateio por base ou peso com centavos exatos. Sem base válida a conferência permanece pendente.
- NF-e, rota e OC gravadas juntas; programação e mudança de status da OC em transação; entrega registra data real.
- Regularização histórica com prévia, escolha de cliente, referência da tabela/cotação, valor atual/proposto e confirmação explícita.
- Baixas parciais, estornos, histórico protegido, saldos e relatórios gerenciais mensais. Custo ausente não é custo confirmado.
- Busca, sino com pendências, navegação móvel, estados de sincronização e mapas identificados como destinos, não GPS.
- Backup versão 2 de registros persistidos autorizados; validação de arquivo, prévia e merge confirmado sem exclusão.
- Processador sem navegador, segredo privado, responsável administrativo ativo, reserva de execução no banco e histórico. Temporizadores locais removidos. Produção permanece desativada.

## Testado
- 17 testes unitários em quatro arquivos: permissões, conferência, rateio, peso fora de faixa, cotação de cidade diferente, baixa/estorno e totais mensais.
- Validação SQL com reversão integral: CT-e multi-NF, receita única, reimportação, centavos, ausência de base, NF duplicada, baixa parcial, estorno, rejeição de remoção de histórico e conflito de versão.
- Matriz positiva/negativa comercial, operação e financeiro e bloqueio das quatro contas administrativas quando inativas; mudanças de teste revertidas.
- Importação headless de duas NFs em uma rota/OC, dedupe e merge de restauração com leitura posterior; transação revertida.
- Navegação autenticada, busca da NF 1764, sino com 24 pendências, backup com 66 registros, prévia de restauração, menu móvel e simulação do processador sem buscar XML nem enviar e-mail.
- Falha de rede simulada antes do envio: alteração não enviada, cache confirmado intacto, falha e pendência visíveis. Reabertura carregou os dados confirmados.
- Compilação automática sem erros. Nenhum erro de execução nas verificações de navegador finais.
- DNS/TLS de app.novarislog.com.br: HTTPS válido, certificado Google Trust Services vigente até 31/12/2026; erro de autoridade não reproduzido. Não foi desabilitada validação TLS.

## Não validado / limitações
- Nenhum envio real, captação real ou agendamento de produção executado nesta revisão. A simulação não prova entrega de e-mail.
- Restauração validada por merge em transação revertida, não pela confirmação de um backup histórico sobre produção.
- Não houve teste de duas importações simultâneas em browsers distintos nesta rodada; proteção de chave e conflito de versão foram testadas separadamente.
- Pendências de gravação permanecem na sessão; fechar/recarregar perde a proposta não confirmada, mas não altera os dados do servidor.
- Rateio sem base/peso permanece pendente; editor manual de rateio ainda não foi entregue. CT-e histórico previamente vinculado exige tratamento explícito, sem conversão fiscal automática.
- Relatórios são gerenciais, não substituem escrituração contábil; validação contábil de competências históricas permanece necessária.
- Há mudanças de autorização já aplicadas ao Cloud compartilhado. A versão publicada antiga pode ter gravações diretas negadas até receber a atualização; não relaxar segurança como solução.

## Regularização existente
Prévia apresentou 24 notas históricas sem cliente/base e central apresentou 24 pendências. O levantamento anterior de 17 CT-es sem correspondência não foi alterado. Nenhuma regularização em lote ou alteração de perfis foi confirmada.

## Ativação e publicação
1. Revisar a prévia e regularizar somente registros confirmados pelo responsável.
2. Publicar explicitamente a atualização quando autorizado; não houve publicação automática.
3. Configurar segredo privado INTERNAL_SCHEDULER_KEY (mínimo 32 caracteres) e SCHEDULER_ACTOR_ID de administrador ativo. Nunca usar chave pública para autenticar o agendador.
4. Validar chamada externa com dryRun=true. Após autorização, configurar ENABLE_SERVER_SCHEDULER=true e publicar para disponibilizar os segredos em produção.
5. Criar uma única chamada externa ao POST /api/public/automation com bearer privado e corpo {"dryRun":false}. Escolher frequência conforme os intervalos configurados e considerar custo recorrente; nenhum agendamento foi criado.
6. Conferir histórico em Configurações. Resultados incertos de envio ficam bloqueados para revisão manual em vez de repetição automática; aceito pela Microsoft não significa entregue.

## Recuperação
Guardar backup confirmado antes da publicação. Em falha de rede, manter a sessão aberta e usar nova tentativa. Em conflito, revisar versão atual: não forçar sobrescrita. Restaurar somente após prévia, preservando chaves fiscais e movimentos. Desativar ENABLE_SERVER_SCHEDULER se houver falha de automação e publicar; não redefinir contas nem limpar a base. As migrações são aditivas e não apagaram históricos.