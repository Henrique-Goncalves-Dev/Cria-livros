# ADR 0001 — Arquitetura inicial do Cria Livros

- **Status:** Aceita
- **Data:** 25/11/2026

## Contexto

O produto precisa receber cadastros, confirmar pagamentos Pix, liberar um
mapeamento de perfil leitor, gerar relatórios exportáveis e permitir que a
administração atualize o convite da comunidade.

## Decisão

- Interface em Angular, com autenticação por e-mail e senha via Supabase Auth.
- Persistência no projeto Supabase brasileiro já existente.
- O pagamento inicial é R$ 20 por Pix. Como o QR não envia confirmação ao
  sistema, o participante envia comprovante e uma administradora aprova o
  acesso no painel.
- O questionário registra as 12 respostas de pontuação e as 9 complementares.
- Os relatórios são PDFs gerados no servidor Node a partir das respostas e das
  descrições editoriais dos quatro perfis.
- Row Level Security protege os dados dos participantes; o papel de
  administradora é uma associação no banco vinculada à conta verificada.

## Consequências

- O acesso ao questionário depende da aprovação manual do pagamento.
- O segredo `service_role` não é necessário no navegador nem no servidor da
  aplicação; a autorização de leitura e atualização permanece nas políticas
  RLS.
- A conta mestre é ativada quando `orange.goncalves@gmail.com` cria uma conta
  e confirma o endereço de e-mail.
