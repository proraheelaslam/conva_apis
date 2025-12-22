const express = require('express');
const router = express.Router();

// GET /privacy-policy - Serve Privacy Policy as an HTML page
router.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Privacy Policy | Convo</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; margin: 0; padding: 0; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 24px; }
    header { margin-bottom: 16px; }
    h1, h2, h3 { line-height: 1.25; margin: 1.2em 0 0.5em; }
    h1 { font-size: 1.875rem; }
    h2 { font-size: 1.25rem; border-bottom: 1px solid currentColor; padding-bottom: 6px; }
    p { margin: 0.6em 0; }
    ul { margin: 0.4em 0 1em 1.2em; }
    li { margin: 0.35em 0; }
    .page { background: transparent; border: 1px solid rgba(127,127,127,.25); border-radius: 12px; padding: 16px 18px; }
    .muted { opacity: .8; font-size: .95rem; }
    .hr { height: 1px; background: rgba(127,127,127,.35); margin: 18px 0; }
    .note { font-style: italic; }
    .footer { margin-top: 24px; font-size: .9rem; opacity: .8; }
    a { color: inherit; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: .95em; }
  </style>
</head>
<body>
  <main class="container">
    <header>
      <h1>Privacy Policy</h1>
      <div class="muted">Last Updated: December 19, 2025</div>
    </header>

    <section class="page">
      <h2>1. Our Commitment</h2>
      <p>Convo, operated by Convo ("we," "us"), is a privacy-first platform. We act as a <span class="mono">Data Fiduciary</span> under the Digital Personal Data Protection (DPDP) Act, 2023. We only collect what is necessary to help you find connections.</p>

      <h2>2. Consent & Withdrawal</h2>
      <p>By using this App, you provide free, specific, informed, and unambiguous consent to our data practices. You can withdraw this consent at any time by deleting your account, which will trigger the erasure of your personal data from our active systems.</p>

      <h2>3. Data We Collect</h2>
      <ul>
        <li><strong>Identity:</strong> Name, Age (18+), and Gender.</li>
        <li><strong>Verification:</strong> Phone number/Email for OTP-based secure login.</li>
        <li><strong>Interaction Data:</strong> We record your "Swipes" to train our matching algorithm.</li>
        <li><strong>User Content:</strong> Text-only posts you choose to share publicly.</li>
        <li><strong>The Private Diary:</strong> Text entered here is End-to-End Encrypted (E2EE). We do not have the technical "key" to read this. It is your private vault.</li>
        <li><strong>Wallet Info:</strong> Transaction history and UPI/Payment identifiers (processed via RBI-authorized partners).</li>
      </ul>

      <h2>4. No Behavioral Profiling</h2>
      <p>We do not have "Likes," "Shares," or "Comments." Consequently, we do not track your social validation patterns or build behavioral profiles for third-party advertising.</p>

      <h2>5. Data Storage (India-Only)</h2>
      <p>All personal and financial data is stored on secure servers located within the territory of India.</p>

      <h2>6. Grievance Redressal</h2>
      <p>If you have concerns, contact our Grievance Officer:</p>
      <ul>
        <li><strong>Name:</strong> [Name]</li>
        <li><strong>Email:</strong> [Email Address]</li>
        <li><strong>Timeline:</strong> We resolve complaints within 15 days.</li>
      </ul>

      <div class="hr"></div>

      <h2>Terms & Conditions</h2>
      <h3>1. Usage & Eligibility</h3>
      <p>You must be 18 years or older. Providing false age information is a violation of these terms.</p>

      <h3>2. The Wallet Feature</h3>
      <ul>
        <li><strong>Authorized Use:</strong> The Wallet is for in-app services.</li>
        <li><strong>Security:</strong> You are responsible for any transactions made using your OTP/PIN.</li>
        <li><strong>Refunds:</strong> Unused balances are refundable upon account deletion, processed as per RBI guidelines to your original payment source.</li>
      </ul>

      <h3>3. Private Diary Disclaimer</h3>
      <p>The Private Diary is your personal space. Because it is encrypted, [APP NAME] cannot recover this data for you if you lose your account or delete the app. Use it responsibly.</p>

      <h3>4. User Conduct</h3>
      <ul>
        <li>Defamatory, obscene, or promotes hate/violence.</li>
        <li>Designed to scam or solicit money from other users.</li>
        <li>A threat to the security or sovereignty of India.</li>
      </ul>

      <h3>5. Termination</h3>
      <p>We reserve the right to ban users who violate our Community Guidelines. In cases of illegal activity or fraud, Wallet balances may be frozen pending investigation by authorities.</p>

      <div class="hr"></div>

      <h2>Community Guidelines</h2>
      <ul>
        <li><strong>Words Matter:</strong> Since there are no "Likes," focus on quality text posts. Avoid spamming or using abusive language.</li>
        <li><strong>Authenticity First:</strong> No catfishing. Use your real name and photos.</li>
        <li><strong>Respect the Match:</strong> If a connection request is ignored or a user unmatches you, respect their decision. Repeated unwanted contact will lead to a ban.</li>
        <li><strong>Financial Safety:</strong> Never share your Bank/UPI details or Wallet PINs with other users. [APP NAME] staff will never ask for these.</li>
        <li><strong>Report & Block:</strong> Use the in-app tools to report harassment immediately. Our moderation team reviews all reports within 24 hours.</li>
      </ul>

      <div class="hr"></div>

      <h2>Technical Implementation: The Sign-up Flow</h2>
      <p class="note">To make this "Airtight" under the DPDP Act, your developer should implement the following logic on the sign-up screen:</p>
      <h3>The Consent Architecture</h3>
      <ol>
        <li>Notice First: Display a short summary: "We collect your name, swipes, and text posts for matchmaking. Your Diary is private and encrypted."</li>
        <li>Mandatory Checkbox 1: "I am 18+ years of age."</li>
        <li>Mandatory Checkbox 2: "I agree to the [Privacy Policy] and [Terms of Service]."</li>
        <li>Mandatory Checkbox 3: "I consent to my swipe data being used for matching."</li>
        <li>Submit: The "Sign Up" button remains disabled until all three boxes are checked.</li>
      </ol>

      <h2>Quick Founder's Checklist</h2>
      <ul>
        <li>Grievance Officer: Ensure the email listed (e.g., grievance@yourapp.com) is monitored daily.</li>
        <li>Encryption: Confirm with your developers that the "Private Diary" database field is encrypted so even your DB admins cannot read it.</li>
        <li>Refund Flow: Ensure your payment partner (Razorpay/Cashfree) supports partial or full automated refunds for the Wallet.</li>
      </ul>
    </section>
  </main>
</body>
</html>`);
});

module.exports = router;
