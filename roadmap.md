# Roadmap

## Revisão de confiabilidade — anexo 07/10/2026
- [ ] Permissões efetivas, usuários inativos e proteção de valores financeiros
- [ ] Persistência confirmada, recuperação, conflitos e isolamento de sessão
- [ ] Importação fiscal deduplicada, CT-e multi-NF e conferência independente
- [ ] Prévia e confirmação de regularização dos registros históricos
- [ ] Baixas parciais, estornos e indicadores financeiros coerentes
- [ ] Navegação móvel, busca global e central de pendências
- [ ] Backup persistido e restauração validada com prévia
- [ ] Agendamento no servidor desativado e histórico de execuções
- [ ] Testes de regressão, permissões e fluxos; investigação do domínio
- [ ] Manual e relatório de entrega com limitações e recuperação

- [x] Grupos de e-mail por cliente e envio pelo sistema, manual ou com frequência configurável enquanto Monitoramento está aberto
- [ ] Envio automático com aplicativo fechado — depende de mover as ordens e grupos locais para dados compartilhados no Cloud

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
- [ ] Conexão Microsoft 365 (Outlook) por dentro do app em Configurações para captar XML

- [x] Estrutura Rota ≠ Ordem de Coleta: rota por remetente+destinatário com várias NFs, motorista e veículo
- [x] Cadastros de Motoristas e Veículos
- [x] Ordem de Coleta com local/horário de coleta e entrega, base do monitoramento
- [x] Espelho de coleta exportável (PDF/impressão) e envio ao motorista
- [x] Fluxo automático NF-e → rota → OC; coletada aguarda CT-e; vínculo manual de CT-e

## Pendente
- [x] Multi-NF e multi-CT-e: rota/OC já agrupam várias NFs; CT-e vincula por todas as chaves de NF referenciadas; mesmo veículo/motorista reutilizável em várias OCs
