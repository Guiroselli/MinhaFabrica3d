# Supabase Setup

1. Crie um projeto no Supabase.
2. Em `SQL Editor`, rode o arquivo `supabase/setup.sql`.
3. Em `Authentication > Providers > Google`, habilite o provider do Google.
4. Em `Authentication > URL Configuration`, adicione:
   - `Site URL`: URL final do seu site
   - `Redirect URLs`: a URL final do site e `http://localhost:3000`
5. Copie `Project URL` e `anon public key` para o `.env` usando o formato do `.env.example`.
6. Rode o projeto com `npm run dev`.

Observacoes:
- O bucket `bonecos` foi configurado como privado. As imagens podem ser lidas pelo proprio usuario autenticado e tambem por contas marcadas como admin.
- Os pedidos salvos vao para a tabela `public.orders`.
- Os perfis dos clientes vao para a tabela `public.profiles`.
- O `supabase/setup.sql` tambem libera que admins atualizem o campo `status` dos pedidos.
- Para promover alguem a admin depois que a conta for criada, rode:

```sql
update public.profiles
set is_admin = true
where email = 'minhafabrica3d@truesmarthome';
```

Depois de alterar o SQL do projeto, rode novamente o `supabase/setup.sql` no painel do Supabase para aplicar a policy que libera a atualizacao de status pelos admins.
