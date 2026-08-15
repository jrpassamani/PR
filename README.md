# Horas do Pioneiro

Aplicativo mobile **individual e offline-first** para o Pioneiro Regular controlar as
**600 horas** do Ano de Serviço. Foco em **acumulado + projeção** (não em punir o mês
isolado), cálculos precisos (armazenados em minutos) e arquitetura preparada para
backup/sincronização futura.

- **Stack:** Expo (React Native) + TypeScript + expo-router
- **Dados:** SQLite cifrado (SQLCipher via `op-sqlite`), 100% local
- **Segurança:** PIN (hash + salt) e biometria; chave do banco no Keychain/Keystore
- **Gráficos:** `react-native-gifted-charts`

---

## Regras de negócio (consolidadas e validadas)

| # | Regra |
|---|-------|
| Ano de Serviço | 01/09 → 31/08. Dias totais reais (365/366). |
| Meta | 600h padrão, **configurável**. Régua 50h/mês é apenas referência de ritmo. |
| Proração (DD-2) | Início após 01/09 → meta = `600 × (dias de serviço ÷ dias do ano)`. |
| Linha ideal | **Contínua diária**: `Ideal(hoje) = metaEfetiva × (diasDecorridos ÷ diasDoServiço)`. Marcos mensais 50/100…600 como referência visual. |
| Status | `R = realizado ÷ ideal` → 🟢 R≥0,95 · 🟡 0,85≤R<0,95 · 🔴 R<0,85. Por ser sobre o **acumulado**, um mês fraco não derruba quem está saudável. |
| Ritmo necessário | `horasRestantes ÷ (diasRestantes ÷ 30,4375)` h/mês. |
| Ritmo atual (híbrido) | <30 dias: média desde o início; ≥30 dias: janela dos últimos 30 dias. |
| Projeção | `realizado + ritmoDiárioAtual × diasRestantes`. |
| Categorias | Pregação, Estudo Bíblico, TPE, TPL, Cartas, **Crédito de Horas**. Peso igual (1h = 1h); separadas só para análise. |
| Duração | Entrada H:MM; **armazenada em minutos**. Máx. 16:00 por lançamento. |
| Datas | `activityDate` (contabiliza) ≠ `createdAt` (lançamento). Retroativo permitido; **futuro bloqueado**. |
| Virada de ano (DD-3) | Em 01/09 o app **pergunta** antes de iniciar o novo ano e arquivar o anterior. |

> Todas essas regras têm **testes automatizados** provando os números — ver abaixo.

---

## Estrutura

```
app/                     Rotas (expo-router)
  _layout.tsx            Bootstrap, onboarding-gate, lock, auto-lock
  onboarding.tsx         1ª execução (início, meta, PIN/biometria)
  (tabs)/                Início · Registrar · Histórico · Análises · Config
  activity/[id].tsx      Edição de atividade (modal)
src/
  domain/                MOTOR DE CÁLCULO puro (engine, analytics, types)
  utils/                 datas, duração, formatação, ids
  db/                    schema, migrações, cliente SQLCipher
  data/                  repositórios (interfaces + SQLite) + backup
  security/              chave do banco, PIN, biometria
  state/                 stores Zustand
  hooks/                 useMetrics (liga dados ao motor)
  ui/                    tema, componentes, LockScreen
scripts/                 resolver p/ rodar os testes no Node
```

### Camadas (sync-ready)
`UI → hooks/state → repositories (interfaces) → SQLite`. A UI nunca fala com o banco
direto. Todas as tabelas têm `id (uuid)`, `updated_at` e `is_deleted` — base pronta
para um `RemoteRepository`/sync **sem alterar o schema**.

---

## Rodar os testes do motor de cálculo (sem instalar nada)

Usa o suporte nativo a TypeScript do Node 22 + um resolver de imports (`scripts/`).

```bash
npm test          # todos os *.test.ts
npm run test:engine
```

Cobre: parsing de duração, limites do Ano de Serviço, linha ideal contínua,
bandas de status, proração, ritmo necessário (exemplo 327h30 → 272h30),
ritmo híbrido, projeção e análises.

---

## Rodar o app

Requer **dev build** (não roda no Expo Go, por causa do SQLCipher/biometria).

```bash
npm install
npm run assets                    # (re)gera ícone/splash em assets/
npx expo prebuild                 # gera android/ e ios/
npx expo run:android              # Android local (precisa do Android SDK)
```

> Este ambiente de desenvolvimento **não** tinha Android SDK/NDK nem `eas-cli`, então o
> APK não pôde ser compilado aqui (o SQLCipher exige compilação nativa). Abaixo, o
> caminho pronto para você gerar o binário.

### APK de teste (recomendado — nuvem, funciona no Windows)
```bash
npm i -g eas-cli
eas login                         # sua conta Expo (gratuita)
npm run build:apk                 # perfil "preview" -> APK instalável (eas.json)
```
Ao final, o EAS entrega um link para baixar/instalar o `.apk` no aparelho.

### iOS
Sem Mac, use EAS: `eas build --platform ios --profile development` (ou `production`).

### Publicação (lojas)
```bash
npm run build:android             # AAB de produção (Play Store)
npm run build:ios                 # iOS de produção (App Store)
```

Perfis de build em [`eas.json`](./eas.json). Assets gerados por
[`scripts/generate-assets.mjs`](./scripts/generate-assets.mjs) (encoder PNG puro, sem libs).
Modelo de ameaça e decisões de segurança em [`SECURITY.md`](./SECURITY.md).

---

## Notas de segurança
- Banco cifrado com SQLCipher; chave AES-256 gerada uma vez e guardada no SecureStore.
- PIN nunca em texto puro (SHA-256 + salt).
- Bloqueio automático por inatividade (configurável).
- **Backup exportado NÃO é criptografado** — orientar o usuário. Criptografia de
  backup e sincronização em nuvem são evoluções previstas pela arquitetura.

## Próximos passos sugeridos
- Assets (ícone/splash) definitivos.
- Criptografia opcional do arquivo de backup.
- Sincronização/backup em nuvem (Google Drive) via `RemoteRepository`.
- Categorias editáveis pelo usuário (schema já suporta).
