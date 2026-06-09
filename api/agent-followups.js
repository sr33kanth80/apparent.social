// Off-hours autonomous follow-up sweep — the server-side counterpart to the
// in-app sweep, meant to be triggered on a schedule by a Claude Code Routine
// (cron) so warm outreach gets nudged even when the investor isn't in the app.
//
// For every investor in 'autonomous' mode, it finds agent outreach that went
// unanswered for 3+ days (and hasn't been followed up yet) and sends one
// in-app follow-up DM as that investor.
//
// SAFETY: disabled by default. It only runs when AGENT_CRON_SECRET (caller must
// present it) AND SUPABASE_SERVICE_ROLE_KEY are set — the service role is what
// lets the sweep insert messages on behalf of each investor (bypassing RLS).
// Wire a Routine to: POST /api/agent-followups  with header
//   x-agent-cron-secret: <AGENT_CRON_SECRET>

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.AGENT_CRON_SECRET || '';

const FOLLOWUP_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_PER_INVESTOR = 10;

const ms = (v) => new Date(v).getTime();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!CRON_SECRET || !SERVICE_KEY || !SUPABASE_URL) {
    return res.status(200).json({
      skipped: 'agent-followups not configured — set AGENT_CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_URL to enable.',
    });
  }

  if (req.headers['x-agent-cron-secret'] !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const now = Date.now();

  try {
    const { data: settingsRows, error: settingsErr } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('agent_autonomy', 'autonomous');
    if (settingsErr) return res.status(500).json({ error: settingsErr.message });

    const investorIds = (settingsRows || []).map((row) => String(row.user_id)).filter(Boolean);
    let totalSent = 0;

    for (const investorId of investorIds) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email, username')
        .eq('id', investorId)
        .maybeSingle();
      const senderName =
        String(profile?.display_name ?? '').trim() ||
        String(profile?.username ?? '') ||
        String(profile?.email ?? '').split('@')[0] ||
        'Investor';

      const [{ data: outRows }, { data: inRows }] = await Promise.all([
        supabase
          .from('user_messages')
          .select('recipient, recipient_id, context, updated_at')
          .eq('owner_id', investorId)
          .in('context', ['agent-outreach', 'agent-followup']),
        supabase.from('user_messages').select('owner_id, updated_at').eq('recipient_id', investorId),
      ]);

      const track = new Map();
      for (const row of outRows || []) {
        const fid = String(row.recipient_id ?? '');
        if (!fid) continue;
        const cur = track.get(fid) || { lastOut: 0, lastIn: 0, followups: 0, name: '' };
        cur.lastOut = Math.max(cur.lastOut, ms(row.updated_at));
        if (row.context === 'agent-followup') cur.followups += 1;
        if (!cur.name) cur.name = String(row.recipient ?? '');
        track.set(fid, cur);
      }
      for (const row of inRows || []) {
        const fid = String(row.owner_id ?? '');
        const cur = track.get(fid);
        if (cur) cur.lastIn = Math.max(cur.lastIn, ms(row.updated_at));
      }

      let sent = 0;
      for (const [fid, cur] of track) {
        if (sent >= MAX_PER_INVESTOR) break;
        if (cur.lastIn > cur.lastOut) continue; // replied
        if (cur.followups >= 1) continue; // already nudged
        if (now - cur.lastOut < FOLLOWUP_DELAY_MS) continue; // not stale yet

        const { data: fp } = await supabase
          .from('founder_profiles')
          .select('open_to_contact, profile_name')
          .eq('user_id', fid)
          .maybeSingle();
        if (fp && fp.open_to_contact === false) continue;

        const company = '';
        const body = `Following up on my earlier note${company ? ` about ${company}` : ''} — still keen to learn more about what you're building. Open to a quick chat this week?`;

        const { error: insErr } = await supabase.from('user_messages').insert({
          owner_id: investorId,
          recipient: cur.name || String(fp?.profile_name ?? '') || 'Founder',
          recipient_id: fid,
          sender_name: senderName,
          subject: 'Following up',
          body,
          status: 'sent',
          context: 'agent-followup',
        });
        if (!insErr) {
          sent += 1;
          totalSent += 1;
        }
      }
    }

    return res.status(200).json({ ok: true, investors: investorIds.length, followups_sent: totalSent });
  } catch (err) {
    return res.status(500).json({ error: `agent-followups failed: ${err?.message ?? 'unknown'}` });
  }
}
