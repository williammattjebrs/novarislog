# Comprovantes de entrega recebidos pelo WhatsApp

## Como vai funcionar para o motorista
1. O motorista tira uma foto do canhoto ou da NF assinada e manda para o número WhatsApp Business da Novaris.
2. O sistema lê a foto, encontra o número da NF (ou a chave de acesso) e anexa a foto ao comprovante dessa NF, como já acontece hoje no Monitoramento.
3. O motorista recebe uma resposta automática, por exemplo: "Comprovante da NF 12345 recebido. Obrigado!". Se a NF não for identificada, a mensagem pede uma foto mais nítida ou que ele digite o número.

## Regras de segurança da identificação
- Uma foto só é anexada sozinha quando a NF lida existe, pertence a uma OC emitida e essa OC é do motorista que enviou, identificado pelo telefone cadastrado.
- Se faltar alguma dessas condições (NF desconhecida, motorista diferente, leitura duvidosa ou várias NFs na mesma foto), a foto vai para uma nova fila **"Comprovantes a conferir"** no Monitoramento. Lá, o operador confirma a NF ou a corrige com um clique.
- Nada é apagado. A foto original fica guardada no mesmo local privado dos comprovantes, com o registro de quem enviou, quando e o que foi lido.
- Os comprovantes recebidos aparecem na NF com a etiqueta "via WhatsApp". O status da entrega **não** muda sozinho: o operador continua decidindo quando marcar como entregue.

## O que você precisa providenciar
- **Um número WhatsApp Business conectado ao sistema.** Durante a conexão, aparece uma tela do WhatsApp/Meta, e o processo pode levar alguns minutos. Esse número também permitirá, no futuro, enviar a OC ao motorista automaticamente.
- Se o motorista mandar a mensagem primeiro, as respostas do sistema não têm custo.
- Para usar este fluxo, é preciso escolher este projeto como destino das mensagens recebidas do WhatsApp.

## Fora do escopo desta etapa
- O envio automático da OC para o motorista pelo WhatsApp. Ele pode ser feito depois com o mesmo número.
- A baixa automática da entrega.

## Detalhes técnicos
- Conector WhatsApp: rota `POST /api/public/whatsapp/webhook`, com verificação de assinatura via `@lovable.dev/webhooks-js` e caixa de entrada durável `whatsapp_webhook_events`, com processamento idempotente e recuperação de pendentes.
- Download da mídia pelo gateway (`/media/<id>` → `/media_download`), com limite de 10 MB lido em stream e gravação no bucket privado dos comprovantes.
- Leitura por IA com Lovable AI (modelo padrão, entrada de imagem). A saída segue um esquema JSON estrito: `numerosNf[]`, `chaves[]` e `confianca`. A NF é localizada pela chave de 44 dígitos ou pelo número, e o resultado é cruzado com o telefone do motorista na OC emitida.
- Nova tabela `tms_delivery_proof_inbox` com os estados `anexado`, `a_conferir` e `descartado`, mais RLS pelas permissões atuais de monitoramento. Os anexos aprovados reutilizam os metadados append-only dos comprovantes já existentes.
- Resposta ao motorista em texto livre dentro da janela de 24 h, com registro da tentativa de envio.
- Testes: assinatura inválida, entrega duplicada, NF não encontrada, motorista divergente e imagem sem NF, com dados descartáveis e sem enviar mensagens reais.
