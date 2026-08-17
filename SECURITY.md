# Segurança — Modelo de Ameaça e Decisões

App **individual, offline, sem servidor**. Toda proteção é local.

## O que protegemos
- **Confidencialidade dos dados em repouso** no aparelho.
- **Acesso casual** ao app por quem pega o telefone desbloqueado.
- **Confidencialidade dos backups** exportados.

## Como
| Camada | Mecanismo |
|---|---|
| Dados em repouso | SQLite **cifrado com SQLCipher** (AES-256). |
| Chave do banco | Gerada uma vez (256 bits, `Crypto.getRandomBytes`), guardada no **SecureStore** (Keychain iOS / Keystore Android), acessível só neste aparelho e só com o SO desbloqueado (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Nunca sai do dispositivo, nunca é logada. |
| Acesso ao app | **PIN** (SHA-256 + salt aleatório, ambos no SecureStore) e **biometria**. Comparação de PIN em **tempo constante**. |
| Força-bruta de PIN | **Lockout progressivo PERSISTENTE**: após 5 erros, espera 30s dobrando a cada novo erro (máx. 5 min). As tentativas/bloqueio são gravados no **SecureStore** e re-hidratados no boot — o lockout **resiste a fechar o app** (não é mais só em memória). |
| Bloqueio automático | Trava após inatividade em background (configurável: imediato/30s/1min/5min). Ver "Auto-lock" abaixo. |
| Captura de tela | Com PIN ativo, **FLAG_SECURE** via `expo-screen-capture`: bloqueia screenshots e oculta o preview na tela de "recentes". Não afeta exportar/compartilhar. |
| Backup exportado | **Cifrado** com **AES-256-GCM**, chave derivada da **senha do usuário** via **scrypt** (`@noble/ciphers` + `@noble/hashes`, auditados). Formato versionado e autenticado (à prova de adulteração). |
| Restauração | **Validada** campo a campo (UUID, datas reais, faixa de duração, categoria conhecida, integridade referencial) **antes** de tocar o banco; **transacional**; contadores honestos (recebidos/válidos/inseridos/ignorados/rejeitados). |
| SQL injection | Todas as queries são **parametrizadas** (`?`). O único trecho interpolado é `PRAGMA user_version = <n>`, com inteiro controlado internamente. |
| Backup automático do Android | **Desligado** (`android.allowBackup: false`): o banco cifrado não é enviado à nuvem do Google sem a chave (que fica no Keystore e não é exportável), evitando restauração inconsistente. |
| Permissões | Mínimas: apenas `USE_BIOMETRIC`/`USE_FINGERPRINT`. `READ/WRITE_EXTERNAL_STORAGE` **bloqueadas** no manifesto (least privilege). |
| Arquivos temporários | Backups/CSV são escritos no cache apenas para compartilhar e **removidos em seguida**. |

## Formato do backup cifrado (v1)
```json
{
  "format": "horas-pioneiro-backup",
  "version": 1,
  "createdAt": "ISO-8601",
  "encryption": {
    "algorithm": "AES-256-GCM",
    "kdf": "scrypt",
    "kdfParams": { "N": 16384, "r": 8, "p": 1, "dkLen": 32 },
    "salt": "hex",
    "iv": "hex"
  },
  "payload": "hex(ciphertext||tag)"
}
```
O cabeçalho `encryption` é usado como **AAD** do GCM: qualquer adulteração dos
parâmetros invalida a decifragem. Senha errada ou arquivo corrompido/truncado
falham de forma segura, **sem alterar o banco**.

## Auto-lock (comportamento definido)
- O bloqueio automático é medido pelo **tempo em background/inativo**: ao voltar
  ao primeiro plano, se o tempo fora ≥ timeout configurado, o app trava.
- **Limite conhecido:** o app **não** trava por inatividade enquanto permanece
  em primeiro plano (ex.: tela ligada e parada). Isso é uma escolha de UX para
  não interromper o uso ativo; a proteção principal é o lockout ao sair do app.

## Soft delete — política de retenção
- Exclusão de atividade/ano é **lógica** (`is_deleted = 1`), nunca física.
- Registros com `is_deleted = 1` **não entram** em listagens, cálculos ou
  estatísticas (a camada de repositório filtra `is_deleted = 0`).
- O backup **preserva** o flag `is_deleted` (fidelidade); a restauração o mantém.
- **Não há expurgo automático** (evita perda de dados silenciosa). Um expurgo
  manual/explícito pode ser adicionado no futuro, com confirmação do usuário.

## Decisões conscientes (e por quê)
- **A chave do banco NÃO é derivada do PIN.** Ela é aleatória e guardada no SecureStore.
  - *Vantagem:* biometria e troca de PIN não exigem re-cifrar o banco; UX simples.
  - *Implicação:* o PIN é uma **barreira de UI**, não a proteção criptográfica do banco.
    Um atacante com acesso físico + capacidade de extrair o SecureStore (aparelho com
    root/jailbreak ou exploit) poderia obter a chave — cenário fora do escopo de um app
    individual. A proteção efetiva do dado em repouso é **SecureStore + cifragem do SO**.
- **PIN com hash simples (sem KDF lento):** como o PIN não protege a chave do banco, um
  KDF pesado não agregaria segurança real e adicionaria latência. O controle relevante
  contra adivinhação é o **lockout progressivo persistente** acima.
- **Senha do backup é independente do PIN e da chave do banco.** Informada na
  hora de exportar/restaurar e **nunca persistida**. Sem a senha, o backup não é
  recuperável — o usuário é avisado a guardá-la.

## Fora de escopo (v1)
- Sincronização/nuvem, contas, multiusuário.
- Proteção contra aparelho comprometido (root/jailcheck), MDM, ataques de hardware.
