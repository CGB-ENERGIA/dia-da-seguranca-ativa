# Dia da Segurança Ativa · CGB Energia

**Desenvolvedor:** Marcus Vinicius Silva Queiros

PWA (React 19 + Bun + Vite + Tailwind 4) para registrar as ações do Dia da Segurança Ativa
(Blitz, DDS/DSS, Inspeção de Ferramentas, Inspeção EPI/EPC, Inspeção Veicular e Treinamento) e acompanhar tudo num painel.

## Regras de negócio
- Login por nome (autocomplete); só lideranças (Supervisor, Coordenador, Engenheiro e Técnico de Segurança, Téc. de Planejamento) entram, lançam e aparecem na meta.
- Lançamentos **só às quartas-feiras** (fuso America/Fortaleza). Grupo SEGURANÇA pode liberar exceções em *Ajustes*.
- **Ação** = 1 registro por tipo marcado. **Visita** = observador × equipe × quarta-feira
  (3 ações na mesma equipe = 1 visita e 3 ações; 3 equipes = 3 visitas).
- Lançamento lançado na quinta/sexta conta na quarta-feira anterior.
- Meta: 1 ação por observador por quarta; *aderência* = quartas com ao menos 1 ação ÷ quartas do período.
- Foto feita dentro do app, carimbada com data, hora, localidade (GPS) e observador; download após salvar.
- Offline: lançamento + foto ficam no IndexedDB e a fila é enviada ao voltar a rede.

## Rodar localmente
```bash
bun install
cp .env.example .env        # URL e chave anon do Supabase
bun run seed:real "C:\pasta\DSA" "C:\...\10 - Out.26.xlsx"   # opcional: dados locais para desenvolvimento
bun run dev
```

## Produção (Vercel + Supabase)
- O projeto da Vercel está ligado a este repositório: cada `git push` na `main` publica sozinho.
- O build (`bun run build`) gera um seed vazio de pessoas (`scripts/prebuild.ts`); cadastro e histórico vêm do Supabase.
- Variáveis na Vercel: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Banco: rode `supabase/setup.sql`; carregue colaboradores (`bun run sql:colabs`) e histórico (`bun scripts/carregar-historico.ts`).

## Dois links
- `/#/registrar` — observadores: login por nome, lançar ação com foto, meus lançamentos.
- `/#/relatorio` — painel, colaboradores, equipes e **Configurações** (usuário e senha).

## Antifraude do registro
- Foto **somente pela câmera ao vivo** (sem galeria/arquivo); carimbo com data/hora, local e observador.
- **Só em quarta-feira**, pela hora do **servidor** (o relógio do aparelho não vale quando há internet); sem liberação manual.
- Localização obrigatória; equipe só do cadastro (sem digitar prefixo livre).
- O banco repete as regras (`supabase/regras-quarta.sql`): quarta-feira, sem data futura, no máximo 4 dias de atraso, foto e local obrigatórios, e a chave pública só insere com `origem = 'app'`.

## Usuários e níveis de acesso
Login conferido no servidor (senha só como hash bcrypt): `supabase/usuarios.sql` (tabelas e funções) e `bun run sql:usuarios "planilha.xlsx" "@Admin"` (gera `supabase/usuarios-seed.sql`, ignorado pelo git).
Níveis: **admin** (tudo + usuários + exclusão), **gestor** (relatório, configurações, banco de dados em leitura), **consulta** (relatório), **observador** (só registro). Gerenciados na aba *Usuários* do relatório.
