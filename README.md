# Dia da Segurança Ativa · CGB Energia

PWA (React 19 + Bun + Vite + Tailwind 4) para registrar as ações do Dia da Segurança Ativa
(Blitz, DDS/DSS, Inspeção de Ferramentas, Inspeção EPI/EPC, Inspeção Veicular e Treinamento) e acompanhar tudo num painel.

## Regras de negócio
- Lançamentos **só às quartas-feiras** (fuso America/Fortaleza). Grupo SEGURANÇA pode liberar exceções em *Ajustes*.
- **Ação** = 1 registro por tipo marcado. **Visita** = observador × equipe × quarta-feira
  (3 ações na mesma equipe = 1 visita e 3 ações; 3 equipes = 3 visitas).
- Lançamento lançado na quinta/sexta conta na quarta-feira anterior.
- Meta: 1 ação por observador por quarta; *aderência* = quartas com ao menos 1 ação ÷ quartas do período.
- Foto feita dentro do app, carimbada com data, hora, localidade (GPS) e observador; download após salvar.
- Offline: lançamento + foto ficam no IndexedDB e a fila é enviada ao voltar a rede.

## Rodar
```bash
bun install
bun run seed:demo          # dados fictícios  (ou: bun run seed:real "C:\pasta\das\planilhas")
bun run dev
```
`seed:real` lê `DIA DSA - 24.xlsx` e `DIA DSA - 26.xlsx` e gera `public/seed/*.json`
(**ignorado pelo git**: contém nomes e matrículas).

## Backend (centralizar os lançamentos)
1. Crie um projeto no Supabase e rode `supabase/schema.sql`.
2. Copie `.env.example` para `.env` e preencha URL e chave anon.
3. `bun run build` — o app passa a enviar registros/fotos e o painel lê os lançamentos de todos.

## Deploy (GitHub Pages)
```bash
bun run deploy   # gera seed demo, build com base /dia-da-seguranca-ativa/ e publica em gh-pages
```
