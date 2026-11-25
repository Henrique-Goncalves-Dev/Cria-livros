# Atualizações

## 25/11/2026 — Correção do acesso mestre

- Angular 22 usa detecção de mudanças sem ZoneJS por padrão; o painel agora
  notifica a atualização após operações assíncronas para não deixar o botão
  preso em “Aguarde…”.
- A tela do admin abre em “Entrar”, pois a conta mestre já existe. Resposta de
  cadastro com `identities` vazio agora é tratada como conta já cadastrada, em
  vez de informar incorretamente que um e-mail de confirmação foi enviado.
- Adicionado o fluxo seguro de recuperação por e-mail, tela para cadastrar a
  nova senha e mensagem em português para credenciais incorretas.
- Adicionados seis testes unitários para cadastro, login, conta existente e
  recuperação de senha.

## 25/11/2026 — Banco Cria-livros e teste local

- Corrigida a divergência entre o projeto Supabase vazio `Cria-livros` e o
  projeto antigo `nomade-literario-br` que estava configurado no app.
- Reconstituído o histórico completo de dez migrações no repositório e
  aplicado ao projeto Supabase `Cria-livros`; tabelas e políticas RLS agora
  aparecem no Dashboard correto.
- Angular e Node configurados para o projeto `Cria-livros`.
- Confirmada a conta mestre `orange.goncalves@gmail.com` e o papel admin no
  projeto correto do Supabase.
- Inicializada a aplicação para teste local em `http://localhost:4200` e API
  em `http://localhost:3000`.

## 25/11/2026 — Primeira versão do Cria Livros

- Criado o fluxo Angular/Node de cadastro, pagamento Pix de R$ 20,00,
  aprovação manual do comprovante e mapeamento do perfil leitor.
- Adicionado cadastro por e-mail e senha, confirmação de maioridade e painel
  administrativo mestre protegido por e-mail confirmado.
- Reexigida a confirmação de maioridade para contas antigas sem registro do
  novo aceite; ajustado o layout para telas estreitas sem rolagem horizontal.
- Integrado o QR Code Santander recebido e o envio privado do comprovante.
- Preservadas as 12 perguntas pontuadas, as 9 complementares e os resultados
  empatados dos quatro perfis.
- Incorporadas as interpretações do relatório de perfis fornecido para a tela
  de resultados e para relatórios PDF exportáveis.
- Adicionado o convite da comunidade e a ferramenta administrativa para
  atualizar o link do WhatsApp.
- Aplicadas no Supabase as alterações de segurança e fluxo, incluindo RLS,
  validação da confirmação de maioridade e concessão restrita do papel mestre.
- Criados testes unitários no Angular e Node, documentação da arquitetura,
  glossário e instruções de execução.

## Verificação

- Testes: `npm test`.
- Build e checagem da API: `npm run build`.
- Supabase: lints de segurança e saúde sem apontamentos; avisos informativos
  de índices ainda sem uso, esperados antes de existir tráfego de produção.

## 25/11/2026 — Reforço contra abuso e adulteração

- Mantidos RLS e acesso administrativo por allowlist no banco; adicionada
  validação de respostas e recálculo dos perfis no Postgres para ignorar scores
  manipulados pelo navegador.
- Travada a tentativa de alterar usuário, comprovante ou preço depois do envio;
  aprovações agora registram revisor e exigem valor, destinatário e liquidação
  conferidos.
- Limitados comprovantes a cinco uploads e cinco envios por conta em 24 horas;
  o sistema valida a existência e a propriedade do arquivo e não confia no
  timestamp enviado pelo cliente.
- Restritos comprovantes à imagem JPG, PNG ou WebP de até 5 MB e permitido
  remover apenas uploads que não tenham registro de pagamento.
- Preparado Turnstile opcional nos formulários de cadastro e login; a ativação
  depende do site key público e do secret configurados pelo titular.
- Criado o mapa de ameaças e controles em `SEGURANCA.md`.
