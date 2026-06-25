const axios = require('axios')

/**
 * Classify Intent (Claude Haiku)
 *
 * Sends the incoming user message to Claude Haiku and returns exactly one of the
 * 7 Nuru House intents. Also runs a static wig price lookup (Gap 2) and stamps the
 * session "last active" time used by the Gap 7 return-greeting logic.
 *
 * Results are written to memory (read by main.flow.json):
 *   temp.intent      -> one of the 7 intents (or 'NON_TEXT' for non-text messages)
 *   temp.nonText     -> true when the inbound message was not text (Gap 6 soft redirect)
 *   temp.priceMatch  -> exact price string if the wig is in the lookup table, else null
 *   temp.priceRange  -> the fallback wig price range (Gap 2)
 *   session.lastActive -> epoch ms of this message (Gap 7 session timer)
 *
 * @title Classify Intent (Claude Haiku)
 * @category Nuru House
 * @author Catalyst 7
 * @param {string} text The raw user message to classify. Defaults to event.preview.
 */
const classifyIntent = async () => {
  const VALID_INTENTS = [
    'PRODUCT_ENQUIRY',
    'PREORDER',
    'BOOKING',
    'ORDER',
    'CARE_TIPS',
    'LEAD',
    'ESCALATE'
  ]

  // Stamp activity time for the Gap 7 return-greeting timer.
  session.lastActive = Date.now()

  // ---- Gap 6: non-text messages -> soft redirect, NOT a hard escalate ----
  const isText = !event.type || event.type === 'text'
  const messageText = (args.text || event.preview || '').toString().trim()

  if (!isText || !messageText) {
    temp.intent = 'NON_TEXT'
    temp.nonText = true
    return
  }
  temp.nonText = false

  // ---- Gap 2: static wig price lookup table ----
  // PLACEHOLDER DATA. Exact names + prices to be confirmed with the hairdresser.
  // Fill `price` values in after the hairdresser session; leave structure as-is.
  const WIG_PRICE_TABLE = [
    { match: ['bob', 'bob wig'], price: null },
    { match: ['straight', 'straight wig'], price: null },
    { match: ['body wave', 'bodywave'], price: null },
    { match: ['deep wave', 'deepwave'], price: null },
    { match: ['curly', 'curly wig'], price: null },
    { match: ['pixie', 'pixie cut'], price: null },
    { match: ['frontal wig', 'lace frontal wig'], price: null },
    { match: ['closure wig', '4x4 closure wig'], price: null }
  ]

  temp.priceRange = 'R1,100–R8,800'
  temp.priceMatch = null

  const lower = messageText.toLowerCase()
  for (const entry of WIG_PRICE_TABLE) {
    if (entry.match.some(name => lower.includes(name))) {
      // Only return an exact price once placeholder is filled in; null -> fall back to range.
      temp.priceMatch = entry.price || null
      break
    }
  }

  // ---- Step 2: classify intent with Claude Haiku ----
  const SYSTEM_PROMPT = [
    'You are an intent classifier for Nuru House, a hair and beauty salon in Pretoria North, South Africa.',
    'Read the customer WhatsApp message and reply with EXACTLY ONE of these labels and nothing else:',
    '',
    'PRODUCT_ENQUIRY - asking about wigs, bundles, closures, frontals, prices, or stock.',
    'PREORDER - wants to reserve a product not yet in stock, or asks about arrivals.',
    'BOOKING - wants to book a salon service (install, braids, wash, nails, haircut).',
    'ORDER - wants to buy, or asks about delivery / courier.',
    'CARE_TIPS - hair maintenance, how-to, or aftercare questions.',
    'LEAD - general interest, browsing, or undecided.',
    'ESCALATE - a complaint, something urgent, or explicitly wants to speak to a human.',
    '',
    'Output only the label in uppercase. No punctuation, no explanation.'
  ].join('\n')

  const apiKey = process.env.ANTHROPIC_API_KEY

  try {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5',
        max_tokens: 16,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageText }]
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 8000
      }
    )

    const raw = ((response.data &&
      response.data.content &&
      response.data.content[0] &&
      response.data.content[0].text) || '')
      .toString()
      .trim()
      .toUpperCase()

    // Take the first valid label found in the model output, else fall back to LEAD.
    const found = VALID_INTENTS.find(intent => raw.includes(intent))
    temp.intent = found || 'LEAD'
  } catch (err) {
    bp.logger.forBot(event.botId).error('classifyIntent failed: ' + err.message)
    // Safe default: treat as a LEAD so the flow shows the menu rather than dead-ending.
    temp.intent = 'LEAD'
  }
}

return classifyIntent()
