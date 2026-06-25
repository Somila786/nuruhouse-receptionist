# Nuru House — WhatsApp AI Receptionist

Botpress v12 bot for **Nuru House** (hair & beauty salon, 247 Burger Street, Pretoria North).
Receives WhatsApp messages via the Meta Cloud API, classifies intent with **Claude Haiku**,
and logs captured leads to Google Sheets via a **Make.com** webhook. Built by Catalyst 7.

## Repo layout

These files mirror their target paths inside the Botpress data volume on the VPS:

| File | Deploys to |
|------|------------|
| `actions/classifyIntent.js` | `…/bots/nuruhouse-receptionist/actions/classifyIntent.js` |
| `actions/logLead.js` | `…/bots/nuruhouse-receptionist/actions/logLead.js` |
| `flows/main.flow.json` | `…/bots/nuruhouse-receptionist/flows/main.flow.json` |
| `content-elements/text.json` | `…/bots/nuruhouse-receptionist/content-elements/text.json` |
| `docker-compose.yml` | `/opt/botpress/docker-compose.yml` |

Base path on VPS: `/var/lib/docker/volumes/botpress_botpress_data/_data/`

## How it works

1. **Greet** — welcome message on first contact (return greeting if last message < 30 min ago).
2. **Classify** — `classifyIntent.js` sends the message to Claude Haiku → one of 7 intents
   (`PRODUCT_ENQUIRY`, `PREORDER`, `BOOKING`, `ORDER`, `CARE_TIPS`, `LEAD`, `ESCALATE`).
3. **Route** — vague messages (`LEAD`) show a menu, then re-classify the pick.
4. **Capture** — 3 guided turns: name → interest → preferred time/delivery.
5. **Log** — after the 3rd reply, `logLead.js` POSTs the lead to Make.com (Sheets + WhatsApp notify).
6. **Confirm** — confirmation message, conversation ends.

`CARE_TIPS` and `ESCALATE` skip capture. Non-text messages get a soft redirect, not a hard escalate.

## Configuration

Set these as environment variables on the `botpress` service (see `docker-compose.yml`):

| Var | Purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | Claude Haiku intent classification |
| `MAKE_WEBHOOK_URL` | Make.com webhook → Google Sheets + WhatsApp notify |
| `BP_WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API token (pending Meta verification) |
| `BP_WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID (pending new SIM registration) |

Keep real secret values in a local `.env` file (gitignored) — see `.env.example`.

## Deploy

After editing any file, on the VPS run:

```bash
docker restart botpress
```

## Pending

- Wig inventory lookup table in `classifyIntent.js` uses placeholder prices — confirm with hairdresser.
- WhatsApp access token + phone number ID — add once Meta business verification completes.
