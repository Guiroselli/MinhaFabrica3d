# Minha Fabrica3D

Landing page + fluxo de criacao para transformar fotos em miniaturas 3D personalizadas.

Hoje o projeto esta posicionado para apresentar a marca `Minha Fabrica3D` com foco em:

- `Kit Minha Arte`: boneco caricato com kit de tintas e pinceis para pintura em casa
- `Mini Realismo`: miniatura colorida e pronta, com foco em memoria afetiva, decoracao e formatos como ima de geladeira e quadro 3D
- `Pessoa`, `pet` e, futuramente, `casal` e `familia`
- `Eventos`: casamentos, nascimentos e brindes corporativos

## O que o projeto ja faz

- Landing comercial da marca com hero, produtos, destaque pet, eventos, FAQ e CTA
- Upload de foto e geracao de previa com Gemini / Imagen
- Fluxo de conta com login por e-mail e Google
- Persistencia de pedidos e imagens no Supabase
- Area "Minha Conta" para acompanhar sessao e pedidos salvos

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Google GenAI (`@google/genai`)
- Supabase Auth + Database + Storage
- Express para servir o build em producao

## Requisitos

- Node.js 20+ recomendado
- npm
- Projeto Supabase configurado
- Chave do Gemini / Imagen no Google AI Studio ou Google Cloud

## Variaveis de ambiente

Crie um arquivo `.env` na raiz do projeto com estas variaveis:

```env
VITE_GEMINI_API_KEY="SUA_CHAVE_GEMINI"
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_SUPABASE_ANON_KEY"
```

Observacao:

- nao use `service_role` no front-end
- o app le variaveis com prefixo `VITE_`

## Como rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Configure o `.env`

3. Rode o ambiente local:

```bash
npm run dev
```

4. Abra:

```text
http://localhost:3000
```

## Scripts disponiveis

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run clean
npm start
```

Descricao rapida:

- `npm run dev`: sobe o front-end em modo desenvolvimento
- `npm run build`: gera a pasta `dist`
- `npm start`: sobe o servidor Express para servir o build
- `npm run lint`: executa `tsc --noEmit`

## Configuracao do Supabase

1. Crie um projeto no Supabase
2. Rode o SQL em `supabase/setup.sql`
3. Configure as variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. Ative o provider Google em `Authentication > Providers > Google`
5. Em `Authentication > URL Configuration`, adicione:
   - `http://localhost:3000`
   - a URL final de producao

Documentacao auxiliar:

- `supabase/README.md`
- `supabase/setup.sql`

## Login com Google

Para o login com Google funcionar:

1. Crie um `OAuth Client ID` do tipo `Web application` no Google Cloud
2. Adicione `http://localhost:3000` em `Authorized JavaScript origins`
3. Adicione o callback do Supabase em `Authorized redirect URIs`
4. Cole `Client ID` e `Client Secret` no provider Google do Supabase

O callback do Supabase fica visivel no painel do provider Google dentro do proprio Supabase.

## Estrutura principal

```text
src/App.tsx          -> landing, fluxo de criacao, auth UI e conta
src/auth.ts          -> login, sessao e Google OAuth com Supabase
src/orders.ts        -> salvamento e leitura de pedidos
src/supabase.ts      -> cliente Supabase
src/constants.ts     -> estilos e cards da galeria
src/types.ts         -> tipos compartilhados
server.mjs           -> servidor Express para producao
supabase/setup.sql   -> schema, policies e storage
historico_ia.txt     -> log de alteracoes do projeto
```

## Fluxo atual do usuario

1. Acessa a landing
2. Escolhe pessoa ou pet
3. Envia uma foto de referencia
4. Escolhe um estilo visual
5. Recebe uma previa gerada por IA
6. Faz login para salvar o pedido
7. Finaliza e envia os dados para o Supabase

## Pontos importantes

- A home foi reposicionada para vender a marca `Minha Fabrica3D` como linha de miniaturas 3D personalizadas
- O produto principal ainda pode evoluir em modulos: pets, casal, familia, eventos e cenarios
- A galeria ainda pode ser melhorada com fotos reais do produto final
- O build atual funciona, mas o bundle ainda esta grande e pode ser otimizado depois

## Historico de alteracoes

As principais alteracoes de produto, auth, prompts e landing estao registradas em:

```text
historico_ia.txt
```
