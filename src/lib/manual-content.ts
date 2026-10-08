import torre from "@/assets/manual/torre.jpg.asset.json";
import clientes from "@/assets/manual/clientes.jpg.asset.json";
import coletas from "@/assets/manual/coletas.jpg.asset.json";
import monitoramento from "@/assets/manual/monitoramento.jpg.asset.json";
import financeiro from "@/assets/manual/financeiro.jpg.asset.json";
import configuracoes from "@/assets/manual/configuracoes.jpg.asset.json";
import usuarios from "@/assets/manual/usuarios.jpg.asset.json";
import tv from "@/assets/manual/tv.jpg.asset.json";

export type ManualPath = "/" | "/clientes" | "/importacao" | "/rotas" | "/ordens-coleta" | "/locais-operacionais" | "/monitoramento" | "/financeiro" | "/configuracoes" | "/usuarios" | "/tv";
export type Lesson = { title: string; steps: string[]; note?: string };
export type ManualChapter = { id: string; title: string; category: string; description: string; path: ManualPath; image: string; caption: string; lessons: Lesson[]; checklist: string[] };

export const MANUAL_CHAPTERS: ManualChapter[] = [
  {
    id: "torre", title: "Torre de controle", category: "Visão geral", path: "/", image: torre.url,
    description: "Comece o dia conferindo as ordens ativas, o mapa e as prioridades da operação.",
    caption: "Visão inicial da torre de controle. Os números dependem das ordens cadastradas.",
    lessons: [
      { title: "Conferir a operação", steps: ["Abra Torre de controle no menu lateral.", "Confira os indicadores de ordens, receita e ocorrências.", "Use o mapa para localizar entregas com posição disponível e confira a lista de ocorrências.", "Abra Ordens de coleta, Rotas ou Monitoramento para tratar o registro que precisa de atenção. Os contadores separam OCs (documentos) de NFs (notas)."], note: "O mapa não é um rastreador em tempo real. As posições refletem os dados disponíveis nas ordens." },
      { title: "Entender a sequência do transporte", steps: ["Cadastre o cliente e suas condições comerciais em Clientes & CRM.", "Importe a NF-e na aba Importação (manual ou pela busca automática no e-mail, a cada 5 minutos).", "Em Rotas, selecione as notas e crie a ordem de coleta; programe e emita a OC em Ordens de coleta.", "Marque a OC como Coletada: as notas vão para Rotas aguardando CT-e. Quando o CT-e é emitido, a OC volta ao Monitoramento.", "Registre o custo, acompanhe a entrega e faça a baixa financeira."], note: "NF-e é a nota da mercadoria; CT-e é o documento de transporte. A sugestão de valor não emite um CT-e fiscal." },
    ], checklist: ["Identificar as ordens que precisam de tratamento", "Localizar o módulo responsável pela próxima ação"],
  },
  {
    id: "clientes", title: "Clientes & CRM", category: "Comercial", path: "/clientes", image: clientes.url,
    description: "Organize os CNPJs, as rotas, as tabelas de frete e as negociações de cada cliente.",
    caption: "Cadastro de clientes e acesso às rotas padrão, simulador e pipeline comercial.",
    lessons: [
      { title: "Cadastrar clientes e conglomerados", steps: ["Na aba Clientes, clique em Novo cliente e preencha os dados solicitados.", "Inclua os CNPJs das empresas atendidas. Revise os números para que a importação encontre o remetente correto.", "Na aba Conglomerados, crie o grupo e vincule os clientes que pertencem a ele.", "Abra o cliente para conferir seus dados, CNPJs, rotas, tabelas e cotações."], note: "O CNPJ é importante para identificar o cliente na NF-e; nomes parecidos não substituem um CNPJ correto." },
      { title: "Preparar tabelas e rotas", steps: ["Abra Tabela padrão (rotas) para cadastrar as condições gerais de origem, destino, peso, valor da nota, frete e veículo.", "Selecione as cidades na pesquisa de municípios do IBGE, em vez de digitar nomes livres.", "No cadastro do cliente, use as rotas do cliente para copiar e ajustar condições específicas.", "Na área de tabelas do cliente, cadastre a modalidade e as faixas ou importe um Excel. Confira as linhas e a vigência antes de usar."], note: "Não basta cadastrar uma tabela: a origem, o destino e as faixas precisam corresponder à carga. Confira também a cotação aprovada." },
      { title: "Simular e salvar um preço de frete", steps: ["Abra Simulador de frete e selecione origem, destino, veículo, peso e valor da NF.", "Informe contratação, mão de obra, despesas administrativas, impostos, seguro e margem desejada.", "Confira o preço final e os custos considerados.", "Use a opção de salvar na tabela padrão quando quiser reutilizar esse roteiro; confira os dados salvos na aba de rotas."], note: "A margem desejada e os impostos participam da formação do preço. O resultado depende dos custos e percentuais informados." },
    ], checklist: ["Cadastrar todos os CNPJs do cliente", "Selecionar cidades do IBGE", "Conferir uma rota ou cotação antes de importar NF-e"],
  },
  {
    id: "importacao", title: "Importação de XML", category: "Operação", path: "/importacao", image: coletas.url,
    description: "Central de entrada de documentos: importação manual, conexão com o e-mail, busca automática e logs de integração.",
    caption: "Comandos de integração, busca de XML e registros de leitura do e-mail.",
    lessons: [
      { title: "Importar XML manualmente", steps: ["Abra a aba Importação.", "Clique em Importar XML NF-e e selecione o arquivo da nota, ou Importar XML CT-e para o conhecimento de transporte.", "Confira o resultado da leitura: a NF-e entra na fila de Rotas; o CT-e é vinculado às notas referenciadas.", "Arquivos já recebidos são ignorados pela chave de acesso, sem duplicar."], note: "A captação lê anexos .xml; não extrai arquivos ZIP." },
      { title: "Busca automática no e-mail", steps: ["Com a conexão Microsoft configurada em Configurações, a busca automática roda no servidor a cada 5 minutos, mesmo com o sistema fechado.", "Use Buscar XML agora para forçar uma leitura imediata.", "Acompanhe os logs de integração para conferir o que foi lido, importado ou ignorado.", "Defina em Configurações quantos dias para trás pesquisar e o filtro de remetente opcional."], note: "Uma nota pode levar até 5 minutos para aparecer após chegar no e-mail. Se a busca automática for desligada, só a importação manual funciona." },
      { title: "Tratar notas sem correspondência", steps: ["Uma NF-e sem cliente correspondente entra para tratamento: cadastre ou confira o CNPJ do remetente.", "Se o CT-e chegou antes da NF-e, importe a nota correspondente e reprocesse os XML pendentes.", "Compare o valor da ordem com o valor do CT-e; diferenças acima da tolerância geram alerta de divergência."], note: "O sistema sugere e confronta valores, mas não emite o CT-e na SEFAZ." },
    ], checklist: ["Conferir os logs de integração", "Reprocessar XML pendentes", "Validar divergências de valor"],
  },
  {
    id: "rotas", title: "Rotas · fila de NF-e", category: "Operação", path: "/rotas", image: coletas.url,
    description: "Fila das notas importadas: trate o valor do frete, monte ordens de coleta e acompanhe as coletadas aguardando CT-e.",
    caption: "Lista de NF-e com peso, valor, situação do frete e do CT-e.",
    lessons: [
      { title: "Tratar o valor do frete", steps: ["Confira a NF na fila: cliente, número, origem, destino, peso total e valor da nota.", "Se aparecer Aguarda vinculação, abra a nota e vincule uma condição comercial ou informe um valor manual.", "Ao cadastrar uma tabela, escolha adicionar uma rota a uma tabela existente do cliente ou criar uma tabela do zero.", "Revise as sugestões e confirme antes de seguir."], note: "A verificação de tabela de frete acontece na geração da coleta: sem tabela, o frete manual é obrigatório." },
      { title: "Montar a ordem de coleta", steps: ["Use os filtros (Somente sem OC, Agrupar por remetente → destinatário) para encontrar as notas.", "Marque uma ou mais NFs e clique em Criar OC. Cada linha mostra peso e valor da nota.", "Ao remover uma NF de uma sugestão, ela gera uma nova sugestão separada com o que foi retirado.", "Informe o cliente da coleta (dono da carga), o cliente da descarga e o contratante do frete; clique em Criar rascunho."], note: "Uma NF só pode estar em uma OC ativa. Para mudar, cancele a OC: as notas voltam para a fila com histórico." },
      { title: "Acompanhar coletadas aguardando CT-e", steps: ["Quando a OC é marcada como Coletada, suas notas aparecem em Rotas com a situação aguardando emissão de CT-e.", "Importe o CT-e (na aba Importação) quando ele for emitido.", "Com o CT-e vinculado, as notas saem de Rotas e a OC volta a aparecer no Monitoramento.", "Confira divergências de valor entre o frete da ordem e o CT-e."], note: "Rotas mostra notas pendentes de OC e notas coletadas aguardando CT-e. O acompanhamento da viagem é feito no Monitoramento." },
    ], checklist: ["Conferir NF-e e cliente", "Definir o frete (tabela ou manual)", "Selecionar notas e criar o rascunho da OC"],
  },
  {
    id: "ordens", title: "Ordens de coleta", category: "Operação", path: "/ordens-coleta", image: coletas.url,
    description: "Programe o rascunho, defina o local de coleta de cada nota, emita o PDF e acompanhe os envios aos armazéns e ao motorista.",
    caption: "Rascunhos e OCs emitidas com documento versionado, envio por e-mail e WhatsApp.",
    lessons: [
      { title: "Programar e emitir", steps: ["Clique na OC para abrir a edição logo abaixo dela na lista.", "Defina motorista, veículo, data e hora da coleta e instruções. O local de coleta é escolhido nota a nota: cada NF pode ser coletada em um armazém diferente.", "O local de entrega é opcional; se ficar em branco, o PDF mostra A definir.", "Clique em Salvar, confira os destinatários e clique em Emitir OC. O PDF é gravado e os e-mails entram na fila."], note: "Rascunho não envia e-mail. Abrir ou salvar nunca envia. Local sem e-mail gera pendência, sem bloquear a emissão." },
      { title: "Envios: e-mail aos armazéns e WhatsApp ao motorista", steps: ["Na emissão, cada armazém de coleta recebe um e-mail próprio, somente com as notas coletadas nele, em tabela no corpo da mensagem, sem anexo.", "Use o botão WhatsApp do motorista para abrir a conversa com a mensagem e o link do PDF; baixe o PDF e anexe na conversa.", "Se o navegador bloquear a abertura, use o link alternativo exibido ao lado do botão.", "Em Envios, veja cada destinatário: pendente, aceito, falha ou incerto. Use Reenfileirar falhas e Enviar agora sem recriar a OC."], note: "Aceito pelo provedor não confirma entrega na caixa do destinatário. O envio automático de WhatsApp exige conta WhatsApp Business conectada." },
      { title: "Reimprimir, revisar ou cancelar", steps: ["Use Reimprimir OC para abrir o PDF da versão emitida a qualquer momento.", "Para mudar uma OC emitida, altere e salve: o documento antigo continua válido até você clicar em Gerar nova versão.", "Marque enviar a revisão somente se quiser enviar a nova versão aos destinatários.", "Cancelar OC exige motivo e libera as NFs para reprogramação. OC emitida não pode ser excluída."], note: "PDFs de versões anteriores ficam preservados. Alteração em cadastro não modifica documentos já emitidos." },
      { title: "Atualizar o status da OC", steps: ["Dentro da OC emitida, use o campo Status com as mesmas etapas do Monitoramento: Programada, Em coleta, Coletada, Em viagem, Entregue e Ocorrência.", "Ao marcar Coletada, a OC sai da lista principal e as notas vão para Rotas aguardando CT-e.", "Com o CT-e emitido, a OC volta ao Monitoramento para o acompanhamento da viagem.", "Use o filtro Todas para ver também as OCs coletadas."], note: "Todas as NFs da OC compartilham o mesmo andamento operacional." },
    ], checklist: ["Local de coleta definido em cada nota", "Motorista, veículo e horário definidos", "Conferir destinatários antes de emitir"],
  },
  {
    id: "locais", title: "Locais operacionais", category: "Operação", path: "/locais-operacionais", image: clientes.url,
    description: "Cadastre armazéns e estabelecimentos de coleta e descarga com endereço, contatos e e-mails.",
    caption: "Cadastro de locais físicos usados nas ordens de coleta.",
    lessons: [
      { title: "Cadastrar um local", steps: ["Clique em Novo local e informe nome, endereço, número, bairro, CEP e cidade do IBGE.", "Informe contatos e os e-mails que recebem a OC, separados por ponto e vírgula.", "Marque os donos de carga atendidos para que o local seja sugerido primeiro.", "Salve e confira na lista."], note: "O local físico (ex.: ALILOG) é diferente do cliente dono da carga (ex.: EIXO). Como cada nota da OC pode ter seu local de coleta, cadastre todos os armazéns usados. Mudanças no cadastro não alteram PDFs já emitidos." },
    ], checklist: ["Endereço completo", "E-mails de recebimento da OC"],
  },
  {
    id: "monitoramento", title: "Monitoramento", category: "Operação", path: "/monitoramento", image: monitoramento.url,
    description: "Acompanhe as OCs em operação: coleta, viagem, entrega e ocorrências, com filtros e envio da posição das notas aos clientes.",
    caption: "Lista de entregas, filtros por status, CT-e, ocorrências e cliente.",
    lessons: [
      { title: "Filtrar e salvar seu filtro padrão", steps: ["Use os filtros de status da OC, situação do CT-e (com, sem ou divergente), ocorrências, situação das NFs e cliente.", "Combine com a busca por número, motorista, placa, local ou NF.", "Clique em Salvar como padrão para que a tela abra sempre com o seu filtro; cada usuário tem o seu.", "Use Remover padrão para voltar à visão completa."], note: "OCs coletadas aguardando CT-e ficam em Rotas e não aparecem aqui até o CT-e ser emitido." },
      { title: "Registrar o andamento da OC", steps: ["Localize a OC e abra o detalhe; as NFs aparecem no detalhe da ordem.", "Escolha o novo status e clique em Registrar, ou adicione observação/ocorrência. Todas as NFs da OC recebem o mesmo andamento.", "No rastreio manual, informe situação, local e previsão disponíveis.", "Registre atrasos, avarias ou outras ocorrências; confira se a informação aparece no histórico."], note: "Sem integração de rastreio ativa, a atualização depende do registro manual do time." },
      { title: "Atualizar todas as notas de um cliente", steps: ["Clique em Atualizar cliente.", "Selecione o cliente e confira o grupo de e-mails cadastrado.", "Use Marcar todas ou selecione somente as notas desejadas. Desmarque Só notas não entregues se precisar incluir entregas finalizadas.", "Confira a tabela (NF, destinatário, cidades, previsão e status) e clique em Enviar atualização para enviar pelo sistema, sem abrir o Outlook."], note: "O envio usa a conta Microsoft conectada. Configure a frequência no grupo para envios automáticos; a aceitação pela Microsoft não confirma a entrega ao destinatário." },
    ], checklist: ["Salvar o filtro padrão", "Atualizar posição e previsão", "Conferir destinatários antes de enviar"],
  },
  {
    id: "financeiro", title: "Financeiro", category: "Gestão financeira", path: "/financeiro", image: financeiro.url,
    description: "Controle despesas e recebimentos, faça as baixas e revise o resultado mensal da operação.",
    caption: "Indicadores financeiros e abas de receitas, despesas, conciliação e relatórios.",
    lessons: [
      { title: "Organizar receitas e despesas", steps: ["Na aba Receitas, confira os documentos e valores vindos dos CT-e importados.", "Em Despesas, clique em Nova despesa e preencha descrição, fornecedor, valor e vencimento.", "Cadastre e utilize grupos como Marketing e TI para separar os gastos.", "Confira os custos das ordens e os lançamentos para evitar registrar o mesmo frete duas vezes."], note: "Vincule a despesa à ordem para evitar dupla contagem. Custos não informados deixam o resultado provisório." },
      { title: "Informar recebimentos e pagamentos", steps: ["Abra Conciliação e escolha A receber (clientes) ou A pagar (despesas).", "Localize o documento e clique em Informar recebimento ou Informar pagamento.", "Preencha Data, Valor efetivo (R$) e Conta / banco; clique em Confirmar.", "Desmarque Só em aberto para conferir a baixa. Use Estornar se precisar corrigir um lançamento."], note: "A conciliação é manual; não importa extrato bancário nem confirma pagamento no banco. Baixas parciais mantêm saldo em aberto; estornos preservam a baixa original e exigem motivo." },
      { title: "Fechar o mês: Balancete & DRE", steps: ["Antes do fechamento, confira CT-e, custos de transporte, despesas e baixas do mês.", "Abra Balancete & DRE e selecione a Competência.", "Revise a DRE: receitas pela emissão, custos pela data da ordem e despesas pelo vencimento.", "Revise o balancete: saldo inicial, recebimentos, pagamentos, saldo final, valores a receber e a pagar."], note: "São relatórios gerenciais baseados nos registros do TMS, não uma escrituração contábil completa." },
    ], checklist: ["Registrar despesas sem duplicidade", "Confirmar datas e valores das baixas", "Conferir custos antes de fechar o mês"],
  },
  {
    id: "configuracoes", title: "Configurações", category: "Administração", path: "/configuracoes", image: configuracoes.url,
    description: "Ajuste tolerância, custos de frota, captação de XML, backup e a limpeza geral do sistema.",
    caption: "Parâmetros de divergência, custos de frota, e-mail, backup e zeramento.",
    lessons: [
      { title: "Definir tolerância e custos da frota", steps: ["Em Divergência CT-e, informe a tolerância percentual usada para comparar CT-e e ordem.", "Em Custos de frota própria, confira diesel, consumo, Arla, pedágio, comissão, depreciação e outros custos.", "Revise os parâmetros antes de calcular uma entrega de frota.", "Na ordem, ajuste o custo específico quando a operação diferir do padrão."], note: "Os parâmetros geram estimativas. Revise valores e distância para refletir o custo real de cada transporte." },
      { title: "Captar XML por e-mail", steps: ["Um administrador configura a conexão com a conta Microsoft (Outlook) em Configurações.", "Defina quantos dias para trás pesquisar e o filtro de remetente opcional.", "A busca automática roda no servidor a cada 5 minutos, mesmo com o sistema fechado; a aba Importação mostra os logs.", "Use Buscar XML agora na aba Importação para forçar uma leitura imediata."], note: "XML recebidos são deduplicados pela chave de acesso. Antes de zerar o sistema, desligue a busca automática para não reimportar o que ainda está na caixa." },
      { title: "Fazer backup e evitar perda de dados", steps: ["Em Backup dos dados, clique em Baixar backup e guarde o arquivo JSON em local seguro.", "Use Restaurar backup somente após conferir o arquivo e proteger os registros atuais.", "Faça backup antes de trocar de computador, navegador ou limpar dados de navegação.", "Confira a prévia com registros novos e existentes; confirme somente após revisar o impacto."], note: "A restauração exige prévia e confirmação, não exclui registros e não transfere contas ou credenciais." },
      { title: "Zerar todo o sistema (somente administrador master)", steps: ["A ação Zerar todo o sistema aparece apenas para o administrador master.", "Ela apaga notas, CT-e, ordens de coleta, rotas, PDFs, envios, financeiro, clientes, tabelas, cotações, motoristas, veículos e locais.", "Permanecem apenas os usuários e as configurações do sistema, como a conexão de e-mail.", "Digite a confirmação solicitada e aguarde a conclusão. A operação não tem volta."], note: "Desligue a busca automática de XML antes de zerar; caso contrário, os arquivos que ainda estão na caixa de e-mail voltam a ser importados." },
    ], checklist: ["Testar a captação de XML", "Revisar custos e tolerância", "Guardar um backup atualizado"],
  },
  {
    id: "usuarios", title: "Usuários & acessos", category: "Administração", path: "/usuarios", image: usuarios.url,
    description: "Convide a equipe e combine perfis com liberações adicionais de módulos.",
    caption: "Área de usuários e convites. Os dados das contas foram ocultados nesta imagem.",
    lessons: [
      { title: "Convidar um usuário", steps: ["Abra Usuários & acessos com uma conta autorizada.", "Preencha nome e e-mail, selecione o perfil e clique em Convidar.", "Oriente o usuário a abrir o convite recebido e concluir seu acesso.", "Confira se a conta aparece na lista e se os módulos necessários estão disponíveis."], note: "O manual é acessível a todos os usuários conectados. As demais páginas continuam respeitando as permissões da conta." },
      { title: "Ajustar perfil e módulos extras", steps: ["Localize a conta na lista de usuários.", "Selecione o perfil adequado: Administrador, Comercial, Operação ou Financeiro.", "Marque os módulos extras que a pessoa também precisa acessar, além do perfil.", "Peça para atualizar a sessão e confira o menu. Libere apenas o necessário para o trabalho."], note: "O administrador master é um perfil único, definido no servidor, com acesso exclusivo ao zeramento do sistema. Uma liberação extra permite abrir o módulo, mas ações administrativas específicas podem continuar restritas." },
    ], checklist: ["Conferir o e-mail do convite", "Revisar perfil e módulos liberados", "Validar o acesso da equipe"],
  },
  {
    id: "tv", title: "Indicadores (TV)", category: "Visão geral", path: "/tv", image: tv.url,
    description: "Acompanhe pontualidade, trânsito, custos, margem e ocorrências em uma tela dedicada.",
    caption: "Painel de indicadores com gráficos e mapa para acompanhamento da operação.",
    lessons: [
      { title: "Abrir o painel na televisão", steps: ["Abra Indicadores (TV) no menu.", "Use o endereço terminado em /tv no navegador da televisão ou do computador conectado à tela.", "Confira os gráficos, mapa, etapas e alertas de CT-e.", "Mantenha as ordens, as previsões e os custos atualizados para alimentar os indicadores."], note: "O painel exige uma sessão autorizada na televisão. Os dados são compartilhados no Lovable Cloud, e valores financeiros ficam restritos às permissões da conta." },
      { title: "Interpretar os indicadores", steps: ["Confira entregas no prazo junto com atrasos e ordens em trânsito.", "Compare faturamento, custo e margem para avaliar o resultado operacional.", "Use alertas de CT-e pendentes e divergentes para priorizar tratamentos.", "Revise registros sem previsão ou sem custo antes de tomar decisões pelos gráficos."], note: "Os números refletem a base compartilhada autorizada para a conta. Um mapa sem marcadores ou um indicador zerado pode significar ausência de dados, não falha do painel." },
    ], checklist: ["Entrar com conta autorizada na TV", "Revisar atrasos e divergências", "Validar custos antes de interpretar a margem"],
  },
];

export const MANUAL_FAQ = [
  { question: "Como conferir se minha alteração foi salva?", answer: "Confira o estado no topo: salvando, dados sincronizados ou falha. Em falha, as alterações ficam preservadas na sessão para nova tentativa. Conflitos exigem revisar o registro atualizado; não há sobrescrita automática." },
  { question: "O XML chegou no e-mail. Preciso importar na mão?", answer: "Não. Com a conexão Microsoft configurada, a busca automática roda no servidor a cada 5 minutos, mesmo com o sistema fechado. A aba Importação mostra os logs e permite forçar uma leitura com Buscar XML agora." },
  { question: "Por que a NF-e ficou em Aguarda vinculação?", answer: "Não foi encontrada uma condição comercial correspondente. Confira o CNPJ do remetente, a rota, as faixas e a cotação aprovada. Abra a nota para vincular uma tabela, cadastrar uma rota ou definir o valor manualmente." },
  { question: "Recebi o CT-e, mas ele não apareceu na ordem. O que conferir?", answer: "Confira se o XML foi captado, se a NF-e já foi importada e se a chave dela consta nas referências do CT-e. Depois tente reprocessar os XML pendentes. Notas com chaves diferentes não são vinculadas apenas por nome ou número." },
  { question: "Uma OC pode coletar notas em armazéns diferentes?", answer: "Sim. O local de coleta é escolhido nota a nota dentro da OC. Cada armazém recebe um e-mail próprio, somente com as notas coletadas nele, e o motorista recebe o PDF completo pelo WhatsApp." },
  { question: "Como reimprimir uma OC já emitida?", answer: "Abra a OC em Ordens de coleta e clique em Reimprimir OC. O PDF da versão emitida é aberto novamente; versões anteriores ficam preservadas." },
  { question: "Quem pode zerar o sistema?", answer: "Somente o administrador master. A ação em Configurações apaga todos os dados operacionais e financeiros, preservando usuários e configurações. Não tem volta; desligue a busca automática de XML antes." },
  { question: "A atualização por cliente já envia o e-mail?", answer: "Sim. Enviar atualização envia a tabela pela conta Microsoft conectada, para todos os endereços do grupo, sem abrir outro aplicativo. A Microsoft confirma a aceitação, não a entrega." },
  { question: "Os cadastros aparecem automaticamente em outro computador?", answer: "Sim. Os registros confirmados são compartilhados no Lovable Cloud, conforme as permissões de cada usuário. Confira Dados sincronizados no topo." },
  { question: "O balancete substitui o relatório do contador?", answer: "Não. É um resumo gerencial dos registros do TMS. Valide o fechamento com o responsável financeiro e contábil, incluindo impostos e ajustes que não estão registrados no sistema." },
];
