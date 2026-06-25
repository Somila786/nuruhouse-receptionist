const axios = require('axios')

/**
 * Log Lead to Make.com
 *
 * Fires ONLY after the client's 3 capture turns are complete (Gap 4) — never on
 * intent classification. POSTs the captured lead to the Make.com webhook, which
 * logs it to Google Sheets and sends the WhatsApp notification to 072 620 3038.
 *
 * The WhatsApp notification is handled inside the Make.com scenario; per Gap 5 the
 * Sheets row is written regardless of whether the notification token is live yet.
 *
 * @title Log Lead to Make.com
 * @category Nuru House
 * @author Catalyst 7
 * @param {string} name The client's name (capture turn 1)
 * @param {string} interest The product/service of interest (capture turn 2)
 * @param {string} preference The preferred time / delivery option (capture turn 3)
 */
const logLead = async () => {
  const webhookUrl =
    process.env.MAKE_WEBHOOK_URL ||
    'https://hook.eu2.make.com/m1sw6oe65lj7wp75b99a6t2s9jjucff9'

  // event.target is the customer's WhatsApp number on the WhatsApp Cloud API channel.
  const phone = (event && event.target) || (user && user.phone) || 'unknown'

  const payload = {
    name: (args.name || session.leadName || '').toString().trim() || 'unknown',
    phone: phone,
    interest: (args.interest || session.leadInterest || '').toString().trim() || 'unknown',
    preference: (args.preference || session.leadPreference || '').toString().trim() || 'unknown',
    source: 'WhatsApp - Nuru House',
    timestamp: new Date().toISOString()
  }

  try {
    await axios.post(webhookUrl, payload, {
      headers: { 'content-type': 'application/json' },
      timeout: 8000
    })
    temp.leadLogged = true
    bp.logger.forBot(event.botId).info('logLead: lead sent to Make.com for ' + payload.name)
  } catch (err) {
    // Do not break the conversation if the webhook is unreachable — log and continue.
    temp.leadLogged = false
    bp.logger.forBot(event.botId).error('logLead failed: ' + err.message)
  }
}

return logLead()
