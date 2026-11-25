# Supabase

A aplicação usa o projeto **Cria-livros**, referência
`titzczvktgvntqvcbglb` (`us-east-2`). O schema público e o bucket privado de
comprovantes são definidos pelas dez migrações deste diretório. Elas foram
aplicadas ao projeto em 25/11/2026; tabelas, políticas RLS, triggers e limites
estão disponíveis no Supabase Dashboard.

O acesso mestre é concedido pelo trigger das migrações somente à conta
`orange.goncalves@gmail.com`. Essa conta já está confirmada e com o papel
administrativo ativo no projeto `Cria-livros`. A senha fica no Supabase Auth e
nunca é armazenada neste repositório.

As migrações recalculam os perfis no banco, exigem conferência humana do
valor/destinatário/liquidação antes da aprovação e limitam uploads e tentativas
por conta. O schema `app_private` contém funções de trigger e política;
mantenha-o fora das schemas expostas na Data API.
