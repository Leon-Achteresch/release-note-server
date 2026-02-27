# Release Note Server

REST-API-Server, der aus **Conventional Commits** fertige Markdown-Release-Notes generiert. Optional: KI-gestützte Ausgabe via OpenRouter.

**Live-Server:** https://rl-server.leon-achteresch.de

---

## Inhaltsverzeichnis

- [Schnellstart](#schnellstart)
- [Voraussetzung: Conventional Commits](#voraussetzung-conventional-commits)
- [API-Referenz](#api-referenz)
- [Verwendung](#verwendung)
  - [curl / Bash](#curl--bash)
  - [CLI (lokal)](#cli-lokal)
  - [GitHub Actions](#github-actions)
  - [GitLab CI](#gitlab-ci)
  - [Bitbucket Pipelines](#bitbucket-pipelines)
- [Self-Hosting](#self-hosting)

---

## Schnellstart

Minimalbeispiel mit dem öffentlichen Server:

```bash
# Commits als String (z.B. aus git log)
COMMITS="feat: Login hinzugefuegt
fix(auth): Passwort-Reset behoben"

curl -X POST https://rl-server.leon-achteresch.de/api/release-notes \
  -H "Content-Type: application/json" \
  -d "{\"commits\": \"$COMMITS\", \"version\": \"1.0.0\"}"
```

Response:
```json
{
  "markdown": "# Release Notes v1.0.0 (2026-02-28)\n\n## Neue Features\n\n- **auth:** Login hinzugefuegt\n\n## Fehlerbehebungen\n\n- **auth:** Passwort-Reset behoben\n",
  "meta": {
    "total": 2,
    "duplicatesRemoved": 0,
    "unparseable": 0
  }
}
```

---

## Voraussetzung: Conventional Commits

Damit der Server sinnvolle Release Notes erzeugen kann, müssen die Commits dem [Conventional Commits](https://www.conventionalcommits.org/)-Format folgen:

| Typ | Bedeutung |
|-----|-----------|
| `feat` | Neues Feature |
| `fix` | Bugfix |
| `docs` | Dokumentation |
| `style` | Code-Stil |
| `refactor` | Refactoring |
| `perf` | Performance |
| `test` | Tests |
| `build` | Build-System |
| `ci` | CI/CD |
| `chore` | Wartung |
| `revert` | Revert |

**Beispiele:**
```
feat: Nutzerprofil hinzugefuegt
fix(auth): Session-Cookie Ablauf
feat(api)!: Endpoint /v2 breaking
docs: README erweitert
```

---

## API-Referenz

### `GET /health`

Health-Check und Konfigurationsstatus.

**Request:**
```bash
curl https://rl-server.leon-achteresch.de/health
```

**Response:**
```json
{
  "status": "ok",
  "ai": {
    "configured": true,
    "model": "openai/gpt-4o-mini"
  }
}
```

---

### `POST /api/release-notes`

Generiert Release Notes deterministisch (ohne KI).

**Request-Body:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `commits` | string | ja | Rohe Commit-Nachrichten (ein Commit pro Zeile) |
| `version` | string | nein | Version (z.B. `1.0.0`) |
| `date` | string | nein | Datum im Format `YYYY-MM-DD` (Standard: heute) |

**Beispiel:**
```bash
curl -X POST https://rl-server.leon-achteresch.de/api/release-notes \
  -H "Content-Type: application/json" \
  -d '{
    "commits": "feat: Feature X\nfix: Bug Y",
    "version": "2.1.0",
    "date": "2026-02-28"
  }'
```

**Response:**
```json
{
  "markdown": "# Release Notes v2.1.0 (2026-02-28)\n\n...",
  "meta": {
    "total": 2,
    "duplicatesRemoved": 0,
    "unparseable": 0
  }
}
```

---

### `POST /api/release-notes/ai`

KI-generierte Release Notes via OpenRouter (fluessigerer Text, Gruppierung nach Kontext).

**Hinweis:** Der öffentliche Server unterstützt diesen Endpoint nur mit gültigem `Authorization: Bearer <OPENROUTER_API_KEY>`. Ohne API-Key: `401`.

**Request-Body:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `commits` | string | ja | Rohe Commit-Nachrichten |
| `version` | string | nein | Version |
| `date` | string | nein | Datum |
| `model` | string | nein | OpenRouter-Modell (z.B. `anthropic/claude-3.5-sonnet`) |
| `language` | string | nein | Ausgabesprache (z.B. `de`, `en`), Standard: `de` |
| `extraInstructions` | string | nein | Zusaetzliche Anweisungen fuer die KI |

**Beispiel:**
```bash
curl -X POST https://rl-server.leon-achteresch.de/api/release-notes/ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OPENROUTER_API_KEY" \
  -d '{
    "commits": "feat: Feature X\nfix: Bug Y",
    "version": "2.1.0",
    "language": "de"
  }'
```

**Response:**
```json
{
  "markdown": "# Release Notes\n\n...",
  "meta": {
    "total": 2,
    "duplicatesRemoved": 0,
    "unparseable": 0,
    "model": "openai/gpt-4o-mini",
    "promptTokens": 123,
    "completionTokens": 456
  }
}
```

---

## Verwendung

### curl / Bash

**Automatisch aus Git-Tags** (mit `examples/curl-example.sh`):

```bash
# Ohne Argumente: letzter Tag vs. vorheriger Tag
./examples/curl-example.sh

# Manuelle Range
./examples/curl-example.sh v1.0.0 v1.1.0
```

Voraussetzungen: `curl`, `jq`, `git`.

**Manuell:**
```bash
COMMITS=$(git log v1.0.0..v1.1.0 --format=%B)
VERSION="1.1.0"
curl -sf -X POST \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg c "$COMMITS" --arg v "$VERSION" '{commits: $c, version: $v}')" \
  https://rl-server.leon-achteresch.de/api/release-notes | jq -r '.markdown'
```

---

### CLI (lokal)

Nach `npm install` kannst du Release Notes lokal generieren:

```bash
# Auto-Detection aus Git-Tags
npm run cli

# Manuelle Commit-Range
npm run cli -- --from v1.0.0 --to v1.1.0

# Stdin
echo "feat: test" | npm run cli -- --stdin

# In Datei schreiben
npm run cli -- --output RELEASE.md

# KI-Modus (erfordert OPENROUTER_API_KEY)
npm run cli -- --ai

# KI mit Modell-Override
npm run cli -- --ai --model anthropic/claude-3.5-sonnet --language en
```

**Optionen:**
| Option | Beschreibung |
|--------|--------------|
| `--from <ref>` | Start-Ref (Tag/Commit) |
| `--to <ref>` | End-Ref (Standard: aktueller Tag oder HEAD) |
| `--version <v>` | Version ueberschreiben |
| `--date <YYYY-MM-DD>` | Datum ueberschreiben |
| `--output <datei>` | Ausgabe in Datei |
| `--stdin` | Commits von stdin lesen |
| `--ai` | KI-Modus (OpenRouter) |
| `--model <id>` | OpenRouter-Modell (nur mit `--ai`) |
| `--language <lang>` | Sprache der KI-Ausgabe (de, en, ...) |
| `--ai-instructions <txt>` | Zusaetzliche Anweisungen fuer die KI |
| `--help` | Hilfe anzeigen |

---

### GitHub Actions

**Variante A: Reusable Action** (empfohlen)

```yaml
# .github/workflows/release-notes.yml
name: Release Notes

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags: true

      - name: Release Notes generieren
        id: notes
        uses: LeonAchtworworter/release-note-server@main
        # Optionale Inputs:
        # with:
        #   server-url: 'https://rl-server.leon-achteresch.de'
        #   from: 'v1.0.0'
        #   to: 'v1.1.0'
        #   version: '1.1.0'
        #   date: '2026-02-28'
        #   output: 'RELEASE_NOTES.md'

      - uses: softprops/action-gh-release@v2
        with:
          body: ${{ steps.notes.outputs.markdown }}
          tag_name: ${{ github.ref_name }}
```

**Variante B: Direkt per curl** (ohne externe Action)

```yaml
# Siehe examples/github-workflow-curl.yml
```

Ablauf: Push eines Tags `v*` → Workflow laeuft → Release Notes werden generiert → GitHub Release wird erstellt.

---

### GitLab CI

```yaml
# .gitlab-ci.yml (oder Inklusion)
release-notes:
  stage: deploy
  image: alpine:latest
  rules:
    - if: $CI_COMMIT_TAG =~ /^v/
  before_script:
    - apk add --no-cache curl jq git
  script:
    - CURRENT_TAG="$CI_COMMIT_TAG"
    - PREVIOUS_TAG=$(git tag --sort=-v:refname | grep -v "^${CURRENT_TAG}$" | head -n 1)
    - VERSION="${CURRENT_TAG#v}"
    - |
      if [ -n "$PREVIOUS_TAG" ]; then
        COMMITS=$(git log "${PREVIOUS_TAG}..${CURRENT_TAG}" --format=%B)
      else
        COMMITS=$(git log "${CURRENT_TAG}" --format=%B)
      fi
    - |
      RESPONSE=$(curl -sf -X POST -H "Content-Type: application/json" \
        -d "$(jq -n --arg c "$COMMITS" --arg v "$VERSION" '{commits: $c, version: $v}')" \
        "https://rl-server.leon-achteresch.de/api/release-notes")
    - MARKDOWN=$(echo "$RESPONSE" | jq -r '.markdown')
    - |
      curl -sf -X POST -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" -H "Content-Type: application/json" \
        -d "$(jq -n --arg tag "$CURRENT_TAG" --arg desc "$MARKDOWN" '{tag_name: $tag, description: $desc}')" \
        "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases"
```

Fuer GitLab-Releases: `GITLAB_TOKEN` (Project Access Token mit `api`-Scope) als CI/CD-Variable setzen.

---

### Bitbucket Pipelines

```yaml
pipelines:
  tags:
    'v*':
      - step:
          name: Release Notes generieren
          script:
            - apk add --no-cache curl jq git
            - CURRENT_TAG=$(git describe --tags --exact-match HEAD)
            - PREVIOUS_TAG=$(git tag --sort=-v:refname | grep -v "^${CURRENT_TAG}$" | head -n 1)
            - VERSION="${CURRENT_TAG#v}"
            - |
              if [ -n "$PREVIOUS_TAG" ]; then
                COMMITS=$(git log "${PREVIOUS_TAG}..${CURRENT_TAG}" --format=%B)
              else
                COMMITS=$(git log "${CURRENT_TAG}" --format=%B)
              fi
            - |
              RESPONSE=$(curl -sf -X POST -H "Content-Type: application/json" \
                -d "$(jq -n --arg c "$COMMITS" --arg v "$VERSION" '{commits: $c, version: $v}')" \
                "https://rl-server.leon-achteresch.de/api/release-notes")
            - echo "$RESPONSE" | jq -r '.markdown' > RELEASE_NOTES.md
          artifacts:
            - RELEASE_NOTES.md
```

Vollstaendiges Beispiel: `examples/bitbucket-pipelines.yml`.

---

## Self-Hosting

### Docker

```bash
docker build -t release-note-server .
docker run -p 3000:3000 release-note-server
```

### Docker Compose

```bash
docker-compose up -d
```

### Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `PORT` | HTTP-Port | `3000` |
| `HOST` | Bind-Adresse | `0.0.0.0` |
| `OPENROUTER_API_KEY` | API-Key fuer `/api/release-notes/ai` | – |
| `OPENROUTER_MODEL` | Standard-Modell | `openai/gpt-4o-mini` |

Ohne `OPENROUTER_API_KEY` gibt `/api/release-notes/ai` `401` zurueck; `/api/release-notes` und `/health` funktionieren weiterhin.

### Lokal starten

```bash
cp .env.example .env
# .env bearbeiten (z.B. OPENROUTER_API_KEY)
npm install
npm run dev
```

---

## Lizenz

ISC
