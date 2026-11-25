# Segurança do Cria Livros

Este documento associa cada tentativa da captura às proteções implementadas e
explica o que ainda depende de configuração externa.

## Controles por ameaça

| Tentativa | Proteção aplicada | Limite atual |
| --- | --- | --- |
| Abrir `/admin` diretamente | A rota mostra apenas a tela de acesso. O painel só consulta dados quando a sessão está autenticada e a linha de `platform_admins` autoriza o usuário. O papel mestre é concedido pelo banco apenas ao e-mail autorizado depois da confirmação do e-mail. | O endereço `/admin` não é secreto; a segurança vem do Auth e das políticas do banco. |
| Trocar IDs para ler dados de outra pessoa | As tabelas exigem `auth.uid() = user_id`; as consultas do relatório usam o usuário do token; Storage limita comprovantes à pasta do dono ou à equipe administradora. | Uma interface alterada pode tentar qualquer ID, mas as políticas do banco continuam valendo. |
| Reutilizar a chave do navegador | O navegador usa somente a chave publishable. As chaves `service_role`/`sb_secret` não são necessárias no cliente nem estão no projeto. | A chave publishable é pública por desenho; ela depende de RLS e grants mínimos. |
| Alterar preço ou pontuação | O valor é fixado em 2.000 centavos por constraint no banco. Um trigger recalcula as quatro pontuações e os perfis predominantes a partir de q1–q12. O mapeamento rejeita perguntas e opções desconhecidas. | O QR Pix é estático; o banco não recebe confirmação automática do valor pago. |
| Enviar quantidade negativa ou reordenar itens | Não há carrinho, quantidade ou endpoint de pedido. O formulário salva apenas as 12 respostas de pontuação e as 9 complementares aceitas pelo esquema. | — |
| Enviar comprovante falso | Aprovar exige que a equipe confirme valor de R$ 20, destinatário e liquidação no extrato. O banco exige os três registros, o usuário que revisou e que o pagamento original esteja pendente; valor e arquivo não podem ser trocados depois do envio. | O QR não consulta o banco. Uma administradora ainda precisa conferir o extrato real; um comprovante falso pode enganar uma aprovação humana. |
| Repetir o pagamento muitas vezes | Uma conta não pode manter mais de um pagamento pendente/aprovado. O banco limita a cinco tentativas e cinco uploads por conta em 24 horas, serializando envios simultâneos. | O limite é por conta, não por pessoa; várias contas podem contornar limites por usuário. Auth também aplica limites por IP. |
| Adivinhar código de login | O acesso usa senha por e-mail, sem código numérico de login. O Supabase Auth aplica limites de requisição por IP. A integração opcional com Cloudflare Turnstile está pronta na interface. | Turnstile ainda não está ativo: falta configurar o site key público e o secret do provedor. A chave secreta deve ser configurada diretamente no Dashboard do Supabase, nunca no código ou no chat. |
| Injetar instruções em texto para uma IA | O projeto não chama nenhum modelo de IA. Respostas abertas são dados limitados em tamanho; não são executadas como SQL nem enviadas a um modelo. | Se futuramente houver IA, respostas e nomes devem continuar tratados como conteúdo não confiável. |
| Executar script no nome | Angular renderiza nome com interpolação escapada, sem `innerHTML`. O banco limita o nome a 120 caracteres e o PDFKit o escreve como texto. | Scripts arbitrários podem aparecer como caracteres no nome, mas não são executados pela interface. |
| Enviar arquivo que não é imagem | A tela aceita JPG, PNG e WebP até 5 MB, confere assinaturas JPEG/PNG/WebP e usa nomes gerados pelo sistema. O bucket privado e a política Storage restringem pasta, extensão, MIME declarado e tamanho. | Um cliente deliberadamente modificado pode forjar MIME/cabeçalhos. Para validar bytes contra um cliente hostil, será preciso receber arquivos por um serviço confiável de upload com inspeção no servidor. |
| Comitar `.env` | `.env`, variações locais e arquivos `*.env` estão no `.gitignore`; apenas exemplos `.env.example` ficam permitidos. | Antes de publicar, revisar o diff/`git status` e nunca incluir chaves secretas em exemplos. |
| Consultar o banco diretamente | RLS permanece ativo nas tabelas pessoais e no Storage. As grants autenticadas são filtradas por políticas; a tabela de administradores é somente leitura para clientes e não aceita autoatribuição. | A chave publishable não substitui RLS; toda tabela nova precisa de políticas e grants revisados. |

## Configuração anti-robô antes da publicação

1. Crie um widget Cloudflare Turnstile e inclua o domínio de produção (e
   `localhost` para teste) na lista permitida.
2. Coloque o **site key público** em `turnstileSiteKey` nos ambientes Angular.
3. No Dashboard Supabase, ative Auth CAPTCHA com o Turnstile e configure o
   **secret** diretamente no Dashboard.
4. Revise os limites de Auth em `Authentication → Rate Limits`. O Supabase
   documenta limites padrão por IP e permite ajustar o endpoint de token.

O formulário envia o token de CAPTCHA a Supabase em cadastro e login quando o
site key está configurado. Sem site key, o componente não aparece e ficam
ativos somente os limites nativos do Auth.

## Migrações de segurança

- `20261125130509_harden_cria_livros_abuse_controls.sql`
- `20261125130623_index_payment_review_audit.sql`
- `20261125131048_limit_payment_proof_storage.sql`

As três migrações estão aplicadas no projeto Supabase conectado. O `app_private`
não deve ser adicionado às schemas expostas pela Data API.

## Referências

- [Supabase: proteger os dados e usar chaves publishable](https://supabase.com/docs/guides/database/secure-data)
- [Supabase: limites do Auth](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase: CAPTCHA para Auth](https://supabase.com/docs/guides/auth/auth-captcha)
- [Supabase: políticas de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control)
