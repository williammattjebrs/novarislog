import torre from "@/assets/manual/torre.jpg.asset.json";
import clientes from "@/assets/manual/clientes.jpg.asset.json";
import coletas from "@/assets/manual/coletas.jpg.asset.json";
import monitoramento from "@/assets/manual/monitoramento.jpg.asset.json";
import financeiro from "@/assets/manual/financeiro.jpg.asset.json";
import configuracoes from "@/assets/manual/configuracoes.jpg.asset.json";
import usuarios from "@/assets/manual/usuarios.jpg.asset.json";
import tv from "@/assets/manual/tv.jpg.asset.json";

export type ManualPath = "/" | "/clientes" | "/coletas" | "/monitoramento" | "/financeiro" | "/configuracoes" | "/usuarios" | "/tv";
export type Lesson = { title: string; steps: string[]; note?: string };
export type ManualChapter = { id: string; title: string; category: string; description: string; path: ManualPath; image: string; caption: string; lessons: Lesson[]; checklist: string[] };

export const MANUAL_CHAPTERS: ManualChapter[] = [
  {
    id: "torre", title: "Torre de controle", category: "Visão geral", path: "/", image: torre.url,
    description: "Comece o dia conferindo as ordens ativas, o mapa e as prioridades da operação.",
    caption: "Visão inicial da torre de controle. Os números dependem das ordens cadastradas.",
    lessons: [
      { title: "Conferir a operação", steps: ["Abra Torre de controle no menu lateral.", "Confira os indicadores de ordens, receita e ocorrências.", "Use o mapa para localizar entregas com posição disponível e confira a lista de ocorrências.", "Abra Coletas & Ordens ou Monitoramento para tratar o registro que precisa de atenção."], note: "O mapa não é um rastreador em tempo real. As posições refletem os dados disponíveis nas ordens." },
      { title: "Entender a sequência do transporte", steps: ["Cadastre o cliente e suas condições comerciais em Clientes & CRM.", "Importe a NF-e e confira a valorização da ordem em Coletas & Ordens.", "Agende e acompanhe a coleta; importe o CT-e quando disponível.", "Registre o custo, acompanhe a entrega e faça a baixa financeira."], note: "NF-e é a nota da mercadoria; CT-e é o documento de transporte. A sugestão de valor não emite um CT-e fiscal." },
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
    id: "coletas", title: "Coletas & Ordens", category: "Operação", path: "/coletas", image: coletas.url,
    description: "Da entrada do XML à entrega: valorize a ordem, confira o CT-e e registre o custo do transporte.",
    caption: "Captação por e-mail, triagem de valores, etapas e lista de ordens.",
    lessons: [
      { title: "Importar NF-e e tratar o valor", steps: ["Clique em Importar XML NF-e e selecione o arquivo da nota, ou use Buscar XML agora para captar anexos do e-mail configurado.", "Confira a ordem gerada: cliente, número da NF-e, origem, destino, peso e valor de frete.", "Se aparecer Aguarda vinculação, abra a ordem e vincule uma condição comercial ou informe um valor manual.", "Ao cadastrar uma tabela, escolha adicionar uma rota a uma tabela do cliente ou criar uma tabela do zero. Revise as sugestões e confirme."], note: "Uma NF-e sem cliente correspondente entra para tratamento. Cadastre ou confira o CNPJ e as condições comerciais antes de validar o frete." },
      { title: "Vincular o CT-e e conferir divergências", steps: ["Clique em Importar XML CT-e para ler o conhecimento de transporte.", "O vínculo usa as chaves das NF-e referenciadas pelo CT-e. Confira se a NF-e já está na lista de ordens.", "Se o CT-e chegou antes da NF-e, importe a nota correspondente e tente reprocessar os XML pendentes.", "Compare o valor da ordem com o valor do CT-e. Quando a diferença superar a tolerância, trate o alerta de CT-e divergente."], note: "O sistema sugere e confronta valores, mas não emite o CT-e na SEFAZ. A captação ignora arquivos já recebidos pela chave de acesso." },
      { title: "Atualizar etapas e adicionar custo rápido", steps: ["Abra a ordem e atualize a etapa conforme a operação: agendada, em coleta, coletada, aguardando CT-e, em viagem e entregue.", "Registre previsão, observação ou ocorrência nas ações do registro.", "Use o custo rápido na lista ou no detalhe, mesmo depois de vincular o CT-e.", "Para terceiro, informe o valor contratado. Para frota, confira a distância e os parâmetros de custo; salve e revise a margem."], note: "Custos em branco deixam a rentabilidade incompleta. Um CT-e divergente precisa de conferência mesmo que o transporte continue." },
    ], checklist: ["Conferir NF-e e cliente", "Vincular e confrontar o CT-e", "Registrar custo e previsão", "Atualizar o estágio após cada evento"],
  },
  {
    id: "monitoramento", title: "Monitoramento", category: "Operação", path: "/monitoramento", image: monitoramento.url,
    description: "Mantenha a posição das entregas atualizada e prepare o acompanhamento para cada cliente.",
    caption: "Lista de entregas, filtros e acesso ao acompanhamento detalhado.",
    lessons: [
      { title: "Registrar uma posição manual", steps: ["Localize a ordem usando a busca e os filtros de Monitoramento.", "Abra o registro para consultar a timeline, a previsão e o custo.", "No rastreio manual, informe situação, local e previsão disponíveis.", "Registre atrasos, avarias ou outras ocorrências; confira se a informação aparece no histórico."], note: "Sem integração de rastreio ativa, a atualização depende do registro manual do time." },
      { title: "Atualizar todas as notas de um cliente", steps: ["Clique em Atualizar cliente.", "Selecione o cliente e confira o e-mail de destino.", "Use Marcar todas ou selecione somente as notas desejadas. Desmarque Só notas não entregues se precisar incluir entregas finalizadas.", "Clique em Enviar atualização, revise a mensagem no seu programa de e-mail e confirme o envio nele."], note: "O envio consolidado abre seu programa de e-mail. O histórico no TMS não comprova que a mensagem foi entregue; finalize o envio no programa de e-mail." },
      { title: "Preparar o modelo de acompanhamento", steps: ["Em Configurações, localize o modelo de e-mail de rastreio.", "Ajuste assunto e mensagem usando os campos disponíveis no modelo.", "Confira as etapas selecionadas para acompanhamento.", "Antes de considerar um envio automático concluído, verifique o serviço de envio e a confirmação de entrega."], note: "Configurar um modelo ou etapas não garante disparo automático de mensagens. Não há confirmação de entrega do e-mail no acompanhamento atual." },
    ], checklist: ["Atualizar posição e previsão", "Selecionar as notas corretas", "Conferir destinatário e concluir o envio no e-mail"],
  },
  {
    id: "financeiro", title: "Financeiro", category: "Gestão financeira", path: "/financeiro", image: financeiro.url,
    description: "Controle despesas e recebimentos, faça as baixas e revise o resultado mensal da operação.",
    caption: "Indicadores financeiros e abas de receitas, despesas, conciliação e relatórios.",
    lessons: [
      { title: "Organizar receitas e despesas", steps: ["Na aba Receitas, confira os documentos e valores vindos dos CT-e importados.", "Em Despesas, clique em Nova despesa e preencha descrição, fornecedor, valor e vencimento.", "Cadastre e utilize grupos como Marketing e TI para separar os gastos.", "Confira os custos das ordens e os lançamentos para evitar registrar o mesmo frete duas vezes."], note: "O custo de terceiro na ordem e uma despesa de frete de terceiro entram no resultado. Não lance ambos para o mesmo gasto sem conferir o efeito no relatório." },
      { title: "Informar recebimentos e pagamentos", steps: ["Abra Conciliação e escolha A receber (clientes) ou A pagar (despesas).", "Localize o documento e clique em Informar recebimento ou Informar pagamento.", "Preencha Data, Valor efetivo (R$) e Conta / banco; clique em Confirmar.", "Desmarque Só em aberto para conferir a baixa. Use Estornar se precisar corrigir um lançamento."], note: "A conciliação é manual; não importa extrato bancário nem confirma pagamento no banco. Uma baixa marca o documento inteiro como pago, mesmo que o valor informado seja menor." },
      { title: "Fechar o mês: Balancete & DRE", steps: ["Antes do fechamento, confira CT-e, custos de transporte, despesas e baixas do mês.", "Abra Balancete & DRE e selecione a Competência.", "Revise a DRE: receitas pela emissão, custos pela data da ordem e despesas pelo vencimento.", "Revise o balancete: saldo inicial, recebimentos, pagamentos, saldo final, valores a receber e a pagar."], note: "São relatórios gerenciais baseados nos registros do TMS, não uma escrituração contábil completa. Impostos, patrimônio e ajustes contábeis precisam de validação do responsável financeiro." },
    ], checklist: ["Registrar despesas sem duplicidade", "Confirmar datas e valores das baixas", "Conferir custos antes de fechar o mês"],
  },
  {
    id: "configuracoes", title: "Configurações", category: "Administração", path: "/configuracoes", image: configuracoes.url,
    description: "Ajuste tolerância, custos de frota, captação de XML e proteção dos dados.",
    caption: "Parâmetros de divergência e custos de frota; as opções de e-mail e backup ficam abaixo.",
    lessons: [
      { title: "Definir tolerância e custos da frota", steps: ["Em Divergência CT-e, informe a tolerância percentual usada para comparar CT-e e ordem.", "Em Custos de frota própria, confira diesel, consumo, Arla, pedágio, comissão, depreciação e outros custos.", "Revise os parâmetros antes de calcular uma entrega de frota.", "Na ordem, ajuste o custo específico quando a operação diferir do padrão."], note: "Os parâmetros geram estimativas. Revise valores e distância para refletir o custo real de cada transporte." },
      { title: "Captar XML por e-mail", steps: ["Um administrador configura servidor, porta, conexão segura, usuário e pasta na captação de XML.", "Defina quantos dias para trás pesquisar, o filtro de remetente opcional e o intervalo de verificação.", "Salve e teste a conexão. Para Microsoft 365 conectado, a leitura usa o login oficial da Microsoft, não a senha IMAP.", "Abra Coletas & Ordens e use Buscar XML agora para lançar os XML novos e conferir a triagem."], note: "A leitura periódica depende de Coletas aberta e da opção ativa. A captação lê anexos .xml; não extrai arquivos ZIP. XML recebidos são deduplicados pela chave de acesso." },
      { title: "Fazer backup e evitar perda de dados", steps: ["Em Backup dos dados, clique em Baixar backup e guarde o arquivo JSON em local seguro.", "Use Restaurar backup somente após conferir o arquivo e proteger os registros atuais.", "Faça backup antes de trocar de computador, navegador ou limpar dados de navegação.", "Evite Apagar todos os dados: essa ação remove os cadastros e os registros operacionais locais."], note: "Clientes, tabelas, ordens e financeiro ainda ficam no navegador. Usuários e captação de e-mail usam o Lovable Cloud. O backup operacional não transfere contas ou credenciais." },
    ], checklist: ["Testar a captação de XML", "Revisar custos e tolerância", "Guardar um backup atualizado"],
  },
  {
    id: "usuarios", title: "Usuários & acessos", category: "Administração", path: "/usuarios", image: usuarios.url,
    description: "Convide a equipe e combine perfis com liberações adicionais de módulos.",
    caption: "Área de usuários e convites. Os dados das contas foram ocultados nesta imagem.",
    lessons: [
      { title: "Convidar um usuário", steps: ["Abra Usuários & acessos com uma conta autorizada.", "Preencha nome e e-mail, selecione o perfil e clique em Convidar.", "Oriente o usuário a abrir o convite recebido e concluir seu acesso.", "Confira se a conta aparece na lista e se os módulos necessários estão disponíveis."], note: "O manual é acessível a todos os usuários conectados. As demais páginas continuam respeitando as permissões da conta." },
      { title: "Ajustar perfil e módulos extras", steps: ["Localize a conta na lista de usuários.", "Selecione o perfil adequado: Administrador, Comercial, Operação ou Financeiro.", "Marque os módulos extras que a pessoa também precisa acessar, além do perfil.", "Peça para atualizar a sessão e confira o menu. Libere apenas o necessário para o trabalho."], note: "Uma liberação extra permite abrir o módulo, mas ações administrativas específicas podem continuar restritas a administradores." },
    ], checklist: ["Conferir o e-mail do convite", "Revisar perfil e módulos liberados", "Validar o acesso da equipe"],
  },
  {
    id: "tv", title: "Indicadores (TV)", category: "Visão geral", path: "/tv", image: tv.url,
    description: "Acompanhe pontualidade, trânsito, custos, margem e ocorrências em uma tela dedicada.",
    caption: "Painel de indicadores com gráficos e mapa para acompanhamento da operação.",
    lessons: [
      { title: "Abrir o painel na televisão", steps: ["Abra Indicadores (TV) no menu.", "Use o endereço terminado em /tv no navegador da televisão ou do computador conectado à tela.", "Confira os gráficos, mapa, etapas e alertas de CT-e.", "Mantenha as ordens, as previsões e os custos atualizados para alimentar os indicadores."], note: "O painel não exige login. Os dados operacionais ainda são locais: compartilhar o endereço não sincroniza os registros com outra televisão ou computador. Para transferir os dados, use um backup no navegador de destino." },
      { title: "Interpretar os indicadores", steps: ["Confira entregas no prazo junto com atrasos e ordens em trânsito.", "Compare faturamento, custo e margem para avaliar o resultado operacional.", "Use alertas de CT-e pendentes e divergentes para priorizar tratamentos.", "Revise registros sem previsão ou sem custo antes de tomar decisões pelos gráficos."], note: "Os números refletem a base disponível naquele navegador. Um mapa sem marcadores ou um indicador zerado pode significar ausência de dados, não falha do painel." },
    ], checklist: ["Conferir a base do navegador da TV", "Revisar atrasos e divergências", "Validar custos antes de interpretar a margem"],
  },
];

export const MANUAL_FAQ = [
  { question: "Por que a NF-e ficou em Aguarda vinculação?", answer: "Não foi encontrada uma condição comercial correspondente. Confira o CNPJ do remetente, a rota, as faixas e a cotação aprovada. Abra a ordem para vincular uma tabela, cadastrar uma rota ou definir o valor manualmente." },
  { question: "Recebi o CT-e, mas ele não apareceu na ordem. O que conferir?", answer: "Confira se o XML foi captado, se a NF-e já foi importada e se a chave dela consta nas referências do CT-e. Depois tente reprocessar os XML pendentes. Notas com chaves diferentes não são vinculadas apenas por nome ou número." },
  { question: "Posso lançar o custo depois de importar o CT-e?", answer: "Sim. Abra o custo rápido em Coletas & Ordens, selecione terceiro ou frota, preencha os valores e salve. Revise a margem após o lançamento." },
  { question: "A atualização por cliente já envia o e-mail?", answer: "A opção consolidada abre seu programa de e-mail com destinatário e mensagem preparados. Você precisa concluir o envio nele. A anotação no histórico não comprova a entrega." },
  { question: "Os cadastros aparecem automaticamente em outro computador?", answer: "Ainda não. Os registros operacionais ficam no navegador. Use Baixar backup e Restaurar backup para transferir a base; contas de acesso e captação de e-mail são mantidas no Lovable Cloud." },
  { question: "O balancete substitui o relatório do contador?", answer: "Não. É um resumo gerencial dos registros do TMS. Valide o fechamento com o responsável financeiro e contábil, incluindo impostos e ajustes que não estão registrados no sistema." },
];