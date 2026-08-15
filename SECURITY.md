# Segurança — Modelo de Ameaça e Decisões

App **individual, offline, sem servidor**. Toda proteção é local.

## O que protegemos
- **Confidencialidade dos dados em repouso** no aparelho.
- **Acesso casual** ao app por quem pega o telefone desbloqueado.

## Como
| Camada | Mecanismo |
|---|---|
| Dados em repouso | SQLite **cifrado com SQLCipher** (AES-256). |
| Chave do banco | Gerada uma vez (256 bits, `Crypto.getRandomBytes`), guardada no **SecureStore** (Keychain iOS / Keystore Android), acessível só neste aparelho e só com o SO desbloqueado (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Nunca sai do dispositivo, nunca é logada. |
| Acesso ao app | **PIN** (SHA-256 + salt aleatório, ambos no SecureStore) e **biometria**. Comparação de PIN em **tempo constante**. |
| Força-bruta de PIN | **Lockout progressivo**: após 5 erros, espera 30s dobrando a cada novo erro (máx. 5 min). Biometria também bloqueada no período. |
| Bloqueio automático | Trava após inatividade (configurável: imediato/30s/1min/5min). |
| SQL injection | Todas as queries são **parametrizadas** (`?`). O único trecho interpolado é `PRAGMA user_version = <n>`, com inteiro controlado internamente. |
| Import de backup | Valida o arquivo e **ignora linhas inválidas** (não confia cegamente no JSON). |

## Decisões conscientes (e por quê)
- **A chave do banco NÃO é derivada do PIN.** Ela é aleatória e guardada no SecureStore.
  - *Vantagem:* biometria e troca de PIN não exigem re-cifrar o banco; UX simples.
  - *Implicação:* o PIN é uma **barreira de UI**, não a proteção criptográfica do banco.
    Um atacante com acesso físico + capacidade de extrair o SecureStore (aparelho com
    root/jailbreak ou exploit) poderia obter a chave — cenário fora do escopo de um app
    individual. A proteção efetiva do dado em repouso é **SecureStore + cifragem do SO**.
  - *Evolução possível:* modo "alta segurança" derivando a chave de `PIN + segredo do
    SecureStore` (PBKDF2/Argon2), ao custo de re-cifrar ao trocar o PIN.
- **PIN com hash simples (sem KDF lento):** como o PIN não protege a chave do banco, um
  KDF pesado não agregaria segurança real e adicionaria latência. O controle relevante
  contra adivinhação é o **lockout progressivo** acima.
- **Backup exportado NÃO é criptografado.** É um arquivo que o usuário compartilha
  deliberadamente; deve guardá-lo em local seguro. Cifragem opcional do backup é uma
  evolução prevista.

## Fora de escopo (v1)
- Sincronização/nuvem, contas, multiusuário.
- Proteção contra aparelho comprometido (root/jailcheck), MDM, ataques de hardware.
