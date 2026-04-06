"""
Tranchly Email Service — powered by Resend
Handles all 6 platform email notifications with branded HTML templates.
"""

import os
import logging
import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@tranchly.finance")
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "hello@tranchly.finance")
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "https://tranchly.finance")

# Set Resend key at module load
resend.api_key = RESEND_API_KEY
logger.info(f"[EMAIL-INIT] RESEND_API_KEY loaded: {'yes (' + RESEND_API_KEY[:8] + '...)' if RESEND_API_KEY else 'EMPTY'}")
logger.info(f"[EMAIL-INIT] FROM_EMAIL={FROM_EMAIL}")


# ─── HTML template wrapper ──────────────────────────────────────────

def _wrap_html(body_content: str, cta_text: str = "", cta_url: str = "") -> str:
    cta_block = ""
    if cta_text and cta_url:
        cta_block = f'''
        <table role="presentation" width="100%" style="margin:28px 0 12px 0;">
          <tr><td align="center">
            <a href="{cta_url}" style="background-color:#7c3aed;color:#ffffff;text-decoration:none;
              padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;
              display:inline-block;mso-padding-alt:0;text-align:center;">
              <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt">&nbsp;</i><![endif]-->
              <span style="mso-text-raise:11pt;">{cta_text}</span>
              <!--[if mso]><i style="mso-font-width:150%">&nbsp;</i><![endif]-->
            </a>
          </td></tr>
        </table>'''

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Tranchly</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- Header -->
      <tr><td style="background-color:#0f172a;padding:28px 32px;border-radius:12px 12px 0 0;">
        <table role="presentation" width="100%"><tr>
          <td>
            <span style="display:inline-block;width:28px;height:28px;background:linear-gradient(135deg,#7c3aed,#14b8a6);
              border-radius:6px;text-align:center;line-height:28px;color:#fff;font-weight:800;font-size:13px;
              vertical-align:middle;">T</span>
            <span style="color:#ffffff;font-size:20px;font-weight:800;vertical-align:middle;margin-left:8px;">Tranchly</span>
          </td>
          <td style="text-align:right;">
            <span style="color:#94a3b8;font-size:12px;">Private credit, tokenized.</span>
          </td>
        </tr></table>
      </td></tr>

      <!-- Body -->
      <tr><td style="background-color:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        {body_content}
        {cta_block}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background-color:#f8fafc;padding:20px 32px;border-radius:0 0 12px 12px;
          border:1px solid #e2e8f0;border-top:none;">
        <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
          &copy; 2026 Tranchly &middot;
          <a href="https://tranchly.finance" style="color:#94a3b8;text-decoration:underline;">tranchly.finance</a> &middot;
          <a href="mailto:{SUPPORT_EMAIL}" style="color:#94a3b8;text-decoration:underline;">{SUPPORT_EMAIL}</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>'''


def _info_row(label: str, value: str) -> str:
    return f'''<tr>
      <td style="padding:6px 0;font-size:14px;color:#64748b;width:180px;">{label}</td>
      <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">{value}</td>
    </tr>'''


def _send(to: str, subject: str, html: str, email_type: str, user_id: str = ""):
    """Send an email via Resend. Never raises — logs on failure."""
    try:
        # Re-read key at send time in case it was loaded late
        api_key = resend.api_key or os.environ.get("RESEND_API_KEY", "")
        if not api_key:
            logger.warning(f"[EMAIL-SKIP] {email_type} to {to} — no Resend API key")
            return None
        resend.api_key = api_key

        from_addr = os.environ.get("FROM_EMAIL", FROM_EMAIL)
        params = {
            "from": f"Tranchly <{from_addr}>",
            "to": [to],
            "subject": subject,
            "html": html,
        }
        logger.info(f"[EMAIL-SEND] Attempting {email_type} to {to} from {from_addr}")
        result = resend.Emails.send(params)
        logger.info(f"[EMAIL-OK] {email_type} sent to {to} — response: {result}")
        return result
    except Exception as e:
        logger.error(f"[EMAIL-FAIL] {email_type} to {to} user_id={user_id} error={type(e).__name__}: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════
# EMAIL 1 — LOAN APPLICATION RECEIVED
# ═══════════════════════════════════════════════════════════════════════

def send_loan_application_received(
    to_email: str,
    first_name: str,
    loan_amount: float,
    business_name: str,
    application_id: str,
    user_id: str = "",
):
    body = f'''
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi {first_name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      We've received your loan application for
      <strong>${loan_amount:,.0f}</strong> for <strong>{business_name}</strong>.
    </p>
    <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
      {_info_row("Application ID", application_id)}
    </table>
    <p style="margin:0 0 8px;font-size:15px;color:#334155;line-height:1.7;">
      We'll review your application and send your credit score result within 24 hours.
    </p>
    <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">
      In the meantime, you can track your application status in your dashboard.
    </p>
    <p style="margin:24px 0 0;font-size:14px;color:#64748b;">&mdash; The Tranchly Team</p>'''

    html = _wrap_html(body, "View Application Status", f"{DASHBOARD_URL}/borrower")
    _send(to_email, "Your loan application is being reviewed — Tranchly", html,
          "LOAN_APPLICATION_RECEIVED", user_id)


# ═══════════════════════════════════════════════════════════════════════
# EMAIL 2 — CREDIT SCORE READY
# ═══════════════════════════════════════════════════════════════════════

def send_credit_score_ready(
    to_email: str,
    first_name: str,
    business_name: str,
    grade: str,
    composite_score: float,
    suggested_apr: float,
    max_loan_amount: float,
    user_id: str = "",
):
    if grade == "Reject":
        outcome = f'''<p style="margin:0 0 16px;font-size:15px;color:#dc2626;line-height:1.7;">
          Unfortunately your application did not meet our current criteria.
          Contact <a href="mailto:{SUPPORT_EMAIL}" style="color:#7c3aed;">{SUPPORT_EMAIL}</a>
          for more information.
        </p>'''
        cta_text, cta_url = "", ""
    else:
        apr_ranges = {"A": "8–10%", "B": "11–14%", "C": "15–18%"}
        outcome = f'''<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
          Log in to your dashboard to review your full offer and next steps.
        </p>'''
        cta_text = "Review Your Offer"
        cta_url = f"{DASHBOARD_URL}/borrower"

    apr_ranges = {"A": "8–10%", "B": "11–14%", "C": "15–18%", "Reject": "N/A"}

    grade_colors = {"A": "#10b981", "B": "#14b8a6", "C": "#f59e0b", "Reject": "#ef4444"}
    gc = grade_colors.get(grade, "#64748b")

    body = f'''
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi {first_name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Your credit score for <strong>{business_name}</strong> is ready.
    </p>
    <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
      {_info_row("Grade", f'<span style="color:{gc};font-weight:800;">{grade}</span>')}
      {_info_row("Composite Score", f"{composite_score} / 100")}
      {_info_row("Suggested APR", apr_ranges.get(grade, "N/A"))}
      {_info_row("Maximum Loan Amount", f"${max_loan_amount:,.0f}")}
    </table>
    {outcome}
    <p style="margin:24px 0 0;font-size:14px;color:#64748b;">&mdash; The Tranchly Team</p>'''

    html = _wrap_html(body, cta_text, cta_url)
    _send(to_email, "Your Tranchly credit score result is ready", html,
          "CREDIT_SCORE_READY", user_id)


# ═══════════════════════════════════════════════════════════════════════
# EMAIL 3 — LOAN APPROVED & TOKENS MINTED
# ═══════════════════════════════════════════════════════════════════════

def send_loan_approved(
    to_email: str,
    first_name: str,
    loan_amount: float,
    apr: float,
    loan_id: str,
    token_address: str,
    tx_hash: str,
    first_payment_date: str,
    monthly_payment: float,
    user_id: str = "",
):
    body = f'''
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi {first_name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Great news &mdash; your loan of <strong>${loan_amount:,.0f}</strong> at
      <strong>{apr}% APR</strong> has been approved and is now live on the marketplace.
    </p>
    <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
      {_info_row("Loan ID", loan_id[:16] + "...")}
      {_info_row("Token Contract", token_address[:16] + "...")}
      {_info_row("Transaction Hash", tx_hash[:20] + "...")}
      {_info_row("First Payment Due", first_payment_date)}
      {_info_row("Monthly Payment", f"${monthly_payment:,.2f}")}
    </table>
    <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">
      View your full repayment schedule in your dashboard.
    </p>
    <p style="margin:24px 0 0;font-size:14px;color:#64748b;">&mdash; The Tranchly Team</p>'''

    html = _wrap_html(body, "View Repayment Schedule", f"{DASHBOARD_URL}/borrower")
    _send(to_email, "Your Tranchly loan is approved and live", html,
          "LOAN_APPROVED_TOKENS_MINTED", user_id)


# ═══════════════════════════════════════════════════════════════════════
# EMAIL 4 — REPAYMENT DUE REMINDER
# ═══════════════════════════════════════════════════════════════════════

def send_repayment_due_reminder(
    to_email: str,
    first_name: str,
    payment_amount: float,
    due_date: str,
    loan_id: str,
    user_id: str = "",
):
    body = f'''
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi {first_name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      This is a reminder that your next loan payment is due in <strong>3 days</strong>.
    </p>
    <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
      {_info_row("Amount Due", f"${payment_amount:,.2f}")}
      {_info_row("Due Date", due_date)}
      {_info_row("Loan ID", loan_id[:16] + "...")}
    </table>
    <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">
      Log in to your dashboard to make your payment or view your full repayment schedule.
    </p>
    <p style="margin:24px 0 0;font-size:14px;color:#64748b;">&mdash; The Tranchly Team</p>'''

    html = _wrap_html(body, "View Repayment Schedule", f"{DASHBOARD_URL}/borrower")
    _send(to_email, "Payment due in 3 days — Tranchly", html,
          "REPAYMENT_DUE_REMINDER", user_id)


# ═══════════════════════════════════════════════════════════════════════
# EMAIL 5 — INVESTMENT CONFIRMED
# ═══════════════════════════════════════════════════════════════════════

def send_investment_confirmed(
    to_email: str,
    first_name: str,
    token_count: int,
    amount_invested: float,
    grade: str,
    apr: float,
    projected_yield: float,
    tx_hash: str,
    user_id: str = "",
):
    grade_colors = {"A": "#10b981", "B": "#14b8a6", "C": "#f59e0b"}
    gc = grade_colors.get(grade, "#64748b")

    body = f'''
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi {first_name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Your investment has been confirmed.
    </p>
    <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
      {_info_row("Tokens Purchased", str(token_count))}
      {_info_row("Amount Invested", f"${amount_invested:,.2f} USDC")}
      {_info_row("Loan Grade", f'<span style="color:{gc};font-weight:800;">{grade}</span>')}
      {_info_row("APR", f"{apr}%")}
      {_info_row("Projected Annual Yield", f"${projected_yield:,.2f}")}
      {_info_row("Transaction Hash", tx_hash[:20] + "...")}
    </table>
    <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">
      You can track your investment and yield in your portfolio dashboard.
    </p>
    <p style="margin:24px 0 0;font-size:14px;color:#64748b;">&mdash; The Tranchly Team</p>'''

    html = _wrap_html(body, "View Portfolio", f"{DASHBOARD_URL}/investor")
    _send(to_email, f"Investment confirmed — Grade {grade} loan on Tranchly", html,
          "INVESTMENT_CONFIRMED", user_id)


# ═══════════════════════════════════════════════════════════════════════
# EMAIL 6 — YIELD DISTRIBUTED
# ═══════════════════════════════════════════════════════════════════════

def send_yield_distributed(
    to_email: str,
    first_name: str,
    yield_amount: float,
    loan_id: str,
    grade: str,
    tx_hash: str,
    total_yield_earned: float,
    user_id: str = "",
):
    body = f'''
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi {first_name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      You've received a yield payment from your Tranchly investment.
    </p>
    <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
      {_info_row("Amount Received", f"${yield_amount:,.2f} USDC")}
      {_info_row("From Loan", f"{loan_id[:16]}... (Grade {grade})")}
      {_info_row("Transaction Hash", tx_hash[:20] + "...")}
      {_info_row("Cumulative Yield to Date", f"${total_yield_earned:,.2f}")}
    </table>
    <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">
      View your full yield history in your portfolio dashboard.
    </p>
    <p style="margin:24px 0 0;font-size:14px;color:#64748b;">&mdash; The Tranchly Team</p>'''

    html = _wrap_html(body, "View Yield History", f"{DASHBOARD_URL}/investor/yield")
    _send(to_email, "You received a yield payment — Tranchly", html,
          "YIELD_DISTRIBUTED", user_id)
