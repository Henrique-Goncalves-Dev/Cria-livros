# Cria Livros

Experiência literária que reúne cadastro, confirmação de pagamento, mapeamento
do perfil leitor e acesso à comunidade Cria Livros.

## Fluxo da pessoa leitora

1. **Cadastro:** nome completo, telefone, e-mail, senha e confirmação de que
   tem 18 anos completos ou mais.
2. **Pagamento:** Pix de **R$ 20,00** pelo QR Code Santander em
   `web/public/pix-qr.png`. A pessoa envia o comprovante pelo próprio site.
   Uma administradora confere o pagamento no painel `/admin`; a aprovação
   libera o mapeamento.
3. **Mapeamento:** 12 respostas que pontuam os quatro perfis literários e 9
   perguntas complementares para orientar a experiência. Empates são
   preservados.
4. **Resultado:** exibição do(s) perfil(is), texto interpretativo e convite
   para a comunidade no WhatsApp. A pessoa também pode exportar o relatório
   em PDF.

O QR Pix não confirma transações para o sistema. Por isso, a aplicação não
libera o mapeamento só com o pagamento iniciado: exige o envio e a aprovação
manual do comprovante. O painel da equipe também permite atualizar o link da
comunidade, aplicado a todos os perfis.

## Tecnologias

- Angular 22 com TypeScript, standalone components e Vitest.
- Node.js 22, Express e PDFKit.
- Supabase Auth, Postgres, Row Level Security e Storage privado.
- Supabase `Cria-livros` (`titzczvktgvntqvcbglb`), na região `us-east-2`.
  O nome interno do projeto Supabase não altera a marca Cria Livros na aplicação.

## Requisitos

- Node.js 22.22.3 ou superior dentro da linha 22.
- npm.
- Acesso ao projeto Supabase configurado para a aplicação.

## Executar localmente

Na raiz do repositório, instale cada pacote e inicie Angular e API:

```powershell
npm ci
npm ci --prefix server
npm ci --prefix web
npm run dev
```

- Interface: `http://localhost:4200`
- Painel mestre: `http://localhost:4200/admin`
- API: `http://localhost:3000`
- Verificação da API: `http://localhost:3000/api/health`

O servidor lê `server/.env`. Copie `server/.env.example` para esse caminho e
configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` se a cópia local não
estiver presente. A chave publishable também está no ambiente Angular e pode
ser usada no cliente; não coloque uma chave `service_role` no navegador nem
neste repositório.

## Conta mestre e autenticação

1. Abra `http://localhost:4200/admin`.
2. Entre com `orange.goncalves@gmail.com` e a senha cadastrada no Supabase Auth.

A conta mestre já está confirmada e com o papel administrativo ativo no
projeto Supabase `Cria-livros`. A senha fica somente no Supabase Auth e não é
armazenada neste projeto. Se não lembrar a senha, redefina-a pelo fluxo de
recuperação “Esqueci minha senha” na tela de login; o link chega ao e-mail
autorizado e permite cadastrar uma nova senha.

No Dashboard do Supabase, configure a URL do site e as URLs de redirecionamento
de confirmação para `http://localhost:4200` e, ao publicar, para o domínio
final da aplicação (incluindo `/admin` para o acesso mestre). A entrega de
e-mails depende das configurações de Auth/SMTP do projeto.

## Supabase e dados

O schema do banco é criado e atualizado pelas migrações versionadas em
`supabase/migrations/`. Ele inclui tabelas de leitores, pagamentos, perfis,
administração e configuração do convite. Políticas RLS e o bucket privado
`payment-proofs` protegem comprovantes e dados pessoais. Veja
[`supabase/README.md`](supabase/README.md) e
[`docs/adr/0001-arquitetura.md`](docs/adr/0001-arquitetura.md).

Os textos de interpretação dos perfis vieram do relatório de perfis anexado e
estão em `web/public/data/reader-profiles.json`. A mesma fonte alimenta o
resultado na interface e os textos do relatório em PDF. As perguntas e opções
do protótipo estão em `web/src/app/reader/questions.ts`.

## Verificações

```powershell
npm test
npm run build
```

`npm test` executa os testes unitários do Angular, o algoritmo compartilhado
de pontuação e a geração/conteúdo do PDF no Node. `npm run build` compila o
Angular em produção e verifica a sintaxe da API.

## Documentação do projeto

- [`atualizacao.md`](atualizacao.md): mudanças registradas por versão/data.
- [`SEGURANCA.md`](SEGURANCA.md): ameaças da captura, controles e limites.
- [`docs/glossario.md`](docs/glossario.md): termos de domínio.
- [`docs/adr/0001-arquitetura.md`](docs/adr/0001-arquitetura.md): decisões
  técnicas iniciais.
