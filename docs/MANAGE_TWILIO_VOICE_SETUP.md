# Costivra Manage browser phone setup

## Number provisioning and routing

Owner-only Manage Settings now includes **Phone numbers**. Search is read-only
until an owner types the exact E.164 number into the purchase confirmation. A
successful Twilio purchase is written to the server-only number inventory and
the internal voice side-effect ledger before it can be designated as the main
number. The public Contact page reads only an active, designated main row;
with no purchased main number, it renders no phone number.

After purchase, select **Make main number** and choose the operators whose
browser phones should ring. Each operator receives a stable, server-derived
Voice SDK identity. Twilio can ring the selected identities simultaneously and
the first accepted call wins. Operators still need to turn on the browser
phone, and a suspended mobile browser is not a guaranteed background receiver.

The purchased active main number in Costivra's inventory is the source of truth
for the public phone and outbound caller ID. `COSTIVRA_TWILIO_PHONE_NUMBER` is
an optional legacy fallback for an unavailable database, not a number you need
to maintain or add before buying through Manage Settings.

The purchase endpoint configures the number's Voice webhook to
`/api/manage/voice/twiml/incoming` and status callback to
`/api/manage/voice/twiml/events`. It does not release numbers, change billing,
or retry an ambiguous provider purchase automatically.

The Manage phone remains disconnected until a dedicated Costivra Twilio
project, API key, TwiML App, and a purchased main number are configured. Do not
reuse Luxor credentials.

## Required Twilio resources

1. Create a dedicated Twilio project for Costivra.
2. Create a standard Twilio API key and keep the SID and secret in the server
   environment only.
3. Create a TwiML App. Set its Voice request URL to:

   `https://costivra.ai/api/manage/voice/twiml/outbound`

   Use HTTP `POST`.
4. Use **Manage Settings → Phone numbers** to search the live inventory and
   purchase a number after the exact-number confirmation. Costivra configures
   the incoming Voice webhook automatically. Designate the purchased number as
   the main number and select the operators who should receive calls.
5. If a number was ported or already exists, set its incoming Voice webhook to:

   `https://costivra.ai/api/manage/voice/twiml/incoming`

   Use HTTP `POST`.
6. Add the required `COSTIVRA_TWILIO_*` values shown in `.env.example` to the
   local and Vercel environments. The TwiML App SID begins with `AP`; the API
   key SID begins with `SK`; the Account SID begins with `AC`.
7. Apply all reviewed migrations to the Costivra Supabase project before
   enabling calls:
   - `20260902145722_internal_manage_voice_call_ledger.sql`
   - `20260902162000_internal_manage_voice_numbers.sql`
   - `20260902170000_internal_voice_side_effects.sql`
8. Redeploy, open `/manage`, open the phone, and choose **Turn on phone**.

## Safe defaults and boundaries

- The browser phone is Manage-only and requires an authenticated internal
  operator session before a Voice access token is issued.
- Tokens last one hour and refresh before expiration. Twilio secrets never enter
  the browser bundle; only a short-lived Voice access token does.
- Incoming, outgoing, and lifecycle webhooks reject requests without a valid
  Twilio signature.
- Outbound destinations default to the `+1` calling region and reject emergency
  dialing. Change `COSTIVRA_TWILIO_ALLOWED_PREFIXES` only after reviewing the
  permitted regions and fraud exposure.
- Every call is written to the service-only internal call ledger before TwiML
  connects it. A ledger failure blocks the call.
- The in-app incoming-call alert works while the Manage tab and Twilio Device
  are active. Mobile browsers cannot reliably receive a Twilio browser call
  after the tab or installed web app has been suspended. A native app or a
  separately approved PSTN fallback is required for dependable closed-app
  ringing.
- Voice calls are not recorded. If an inbound call is not answered within 30
  seconds, Costivra gives the caller a short voicemail prompt and records only
  that message, for up to 120 seconds. The recording is stored by Twilio and
  streamed through an authenticated Manage-only route; no public recording URL
  is exposed and no transcription is requested.
- Review the voicemail retention period, deletion process, and any jurisdiction
  or customer disclosure requirements before using the feature with real callers.

## Acceptance check after credentials are added

1. Confirm the header indicator changes from disconnected to ready.
2. Place a test call to a controlled phone and verify ringing, answer, mute,
   DTMF keypad, duration, and hang-up.
3. Call the Twilio number from a controlled phone and verify the Manage alert,
   Answer, Decline, connected controls, and call lifecycle row.
4. Let a controlled inbound call ring out and leave a short voicemail. Confirm
   the voicemail row appears in Recent calls and playback requires Manage
   authentication.
5. Test desktop, tablet portrait, and mobile with the Manage tab foregrounded.
6. Confirm invalid webhook signatures return `403` and no call row is created.
7. Run Twilio Voice Insights and Supabase logs to confirm no secrets or full
   sensitive payloads were recorded.
