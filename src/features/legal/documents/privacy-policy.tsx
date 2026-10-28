import {
  LegalList,
  LegalPage,
  LegalSection,
  SupportEmail,
} from "../components/legal-page";

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <LegalSection title="1. Introduction">
        <p>
          Switchblade (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) is
          committed to protecting your privacy. This Privacy Policy explains how
          we collect, use, store, and protect your personal information when you
          visit or make a purchase on our website.
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <p>We may collect the following types of information:</p>
        <LegalList
          items={[
            "Personal Information: Name, email address, phone number, shipping and billing address, date of birth (if provided)",
            "Payment Information: Processed securely through third-party payment gateways; we do not store full card details",
            "Account Information: Login credentials, order history, wishlist, saved addresses",
            "Usage Data: IP address, browser type, device information, pages visited, time spent on site, referring website",
            "Cookies and Tracking Data: See Section 6 below",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <LegalList
          items={[
            "Process and fulfill your orders",
            "Communicate with you about your orders, account, or customer support requests",
            "Send marketing communications (only if you've opted in)",
            "Improve our website, products, and user experience",
            "Detect and prevent fraud or unauthorized activity",
            "Comply with legal obligations",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Sharing Your Information">
        <p>
          We do not sell your personal information. We may share your
          information with:
        </p>
        <LegalList
          items={[
            "Service providers: Payment gateways, courier/logistics partners, IT and hosting providers, marketing platforms — only as necessary to provide our services",
            "Legal authorities: If required by law, regulation, or legal process",
            "Business transfers: In the event of a merger, acquisition, or sale of assets",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Data Security">
        <p>
          We implement reasonable technical and organizational measures to
          protect your personal information from unauthorized access, loss, or
          misuse. However, no method of transmission over the internet is 100%
          secure, and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies and Tracking Technologies">
        <p>We use cookies and similar technologies to:</p>
        <LegalList
          items={[
            "Remember your preferences and login sessions",
            "Analyze site traffic and usage patterns",
            "Personalize content and marketing",
          ]}
        />
        <p>
          You can control cookie preferences through your browser settings.
          Disabling cookies may affect website functionality.
        </p>
      </LegalSection>

      <LegalSection title="7. Your Rights">
        <p>Depending on applicable law, you may have the right to:</p>
        <LegalList
          items={[
            "Access the personal information we hold about you",
            "Request correction of inaccurate information",
            "Request deletion of your personal information",
            "Withdraw consent for marketing communications at any time",
            "Request a copy of your data",
          ]}
        />
        <p>
          To exercise these rights, contact us at <SupportEmail />.
        </p>
      </LegalSection>

      <LegalSection title="8. Data Retention">
        <p>
          We retain your personal information for as long as necessary to
          fulfill the purposes outlined in this policy, comply with legal
          obligations, resolve disputes, and enforce our agreements.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          Our website is not intended for individuals under 18 years of age. We
          do not knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection title="10. Third-Party Links">
        <p>
          Our website may contain links to third-party sites. We are not
          responsible for the privacy practices of those websites.
        </p>
      </LegalSection>

      <LegalSection title="11. International Data Transfers">
        <p>
          If you access our website from outside India, please note that your
          information may be transferred to and processed in India, where our
          servers and service providers are located.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Changes will be
          posted on this page with an updated &ldquo;Last updated&rdquo; date.
          Continued use of the website constitutes acceptance of the revised
          policy.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact Us">
        <p>
          For questions about this Privacy Policy or to exercise your data
          rights, contact us at <SupportEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
