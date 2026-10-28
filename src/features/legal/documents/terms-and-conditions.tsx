import {
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection,
  SupportEmail,
} from "../components/legal-page";
import { JURISDICTION } from "../policy";

export function TermsAndConditions() {
  return (
    <LegalPage title="Terms & Conditions">
      <LegalSection title="1. Introduction">
        <p>
          Welcome to Switchblade (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
          &ldquo;our&rdquo;). These Terms and Conditions govern your use of our
          website and any purchases made through it. By accessing or using our
          website, you agree to be bound by these Terms. If you do not agree,
          please do not use our website.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          By using this website, you confirm that you are at least 18 years of
          age or are using the site under the supervision of a parent or legal
          guardian.
        </p>
      </LegalSection>

      <LegalSection title="3. Use of Website">
        <p>
          You agree to use this website only for lawful purposes. You may not
          use this site to:
        </p>
        <LegalList
          items={[
            "Violate any applicable local, national, or international law",
            "Transmit any harmful, offensive, or unlawful content",
            "Attempt to gain unauthorized access to any part of the website or its systems",
            "Engage in any activity that disrupts or interferes with the website's functioning",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Account Registration">
        <p>
          Some features of this website may require you to create an account.
          You are responsible for maintaining the confidentiality of your
          account credentials and for all activities that occur under your
          account. Please notify us immediately of any unauthorized use of your
          account.
        </p>
      </LegalSection>

      <LegalSection title="5. Products and Pricing">
        <LegalList
          items={[
            "All products displayed on this website are subject to availability.",
            "We reserve the right to limit quantities, discontinue products, or modify product descriptions and pricing at any time without prior notice.",
            "Prices are listed and charged in Indian Rupees (INR) and are inclusive of applicable taxes. Prices shown in other currencies are estimates for reference only.",
            "While we strive for accuracy, we do not warrant that product descriptions, images, or pricing are error-free. In the event of an error, we reserve the right to correct it and, where necessary, cancel the order.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Orders and Payment">
        <LegalList
          items={[
            "By placing an order, you are making an offer to purchase the product(s), which we may accept or decline at our discretion.",
            "Payment must be made in full at the time of order through the payment methods available on our website.",
            "We use third-party payment gateways to process transactions; we do not store your full payment card details.",
            "Order confirmation does not guarantee product availability; in rare cases, we may cancel an order and issue a full refund.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Shipping and Delivery">
        <LegalList
          items={[
            "Estimated delivery timelines will be provided at checkout and are approximate, not guaranteed.",
            "We are not liable for delays caused by courier partners, customs, or circumstances beyond our control.",
            "Risk of loss and title for products pass to you upon delivery to the shipping address provided.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Returns, Exchanges, and Refunds">
        <p>
          Please refer to our separate{" "}
          <LegalLink href="/returns-policy">
            Returns &amp; Refund Policy
          </LegalLink>{" "}
          for detailed terms on returns, exchanges, and refund eligibility,
          timelines, and conditions.
        </p>
      </LegalSection>

      <LegalSection title="9. Intellectual Property">
        <p>
          All content on this website — including but not limited to logos,
          text, graphics, images, product designs, and layout — is the property
          of Switchblade or its licensors and is protected by applicable
          intellectual property laws. You may not reproduce, distribute, or use
          any content without our prior written consent.
        </p>
      </LegalSection>

      <LegalSection title="10. User-Generated Content">
        <p>
          If you submit reviews, comments, or other content to our website, you
          grant us a non-exclusive, royalty-free, worldwide license to use,
          reproduce, and display that content in connection with our business.
        </p>
      </LegalSection>

      <LegalSection title="11. Prohibited Conduct">
        <p>You agree not to:</p>
        <LegalList
          items={[
            "Resell products purchased from this website for commercial purposes without authorization",
            "Use any automated system (bots, scrapers) to access the website",
            "Impersonate any person or entity or misrepresent your affiliation",
          ]}
        />
      </LegalSection>

      <LegalSection title="12. Limitation of Liability">
        <p>
          To the fullest extent permitted by law, Switchblade shall not be
          liable for any indirect, incidental, special, or consequential damages
          arising from your use of this website or products purchased through
          it. Our total liability for any claim shall not exceed the amount paid
          for the relevant product.
        </p>
      </LegalSection>

      <LegalSection title="13. Indemnification">
        <p>
          You agree to indemnify and hold harmless Switchblade, its affiliates,
          and employees from any claims, damages, or expenses arising from your
          violation of these Terms or misuse of the website.
        </p>
      </LegalSection>

      <LegalSection title="14. Third-Party Links">
        <p>
          Our website may contain links to third-party websites. We are not
          responsible for the content, privacy practices, or terms of any
          third-party sites.
        </p>
      </LegalSection>

      <LegalSection title="15. Privacy">
        <p>
          Your use of this website is also governed by our{" "}
          <LegalLink href="/privacy-policy">Privacy Policy</LegalLink>, which
          explains how we collect, use, and protect your personal information.
        </p>
      </LegalSection>

      <LegalSection title="16. Changes to These Terms">
        <p>
          We reserve the right to update or modify these Terms at any time.
          Changes will be effective immediately upon posting to this page.
          Continued use of the website after changes constitutes acceptance of
          the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="17. Governing Law and Jurisdiction">
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of India. Any disputes arising under these Terms shall be subject
          to the exclusive jurisdiction of the courts of {JURISDICTION}.
        </p>
      </LegalSection>

      <LegalSection title="18. Contact Us">
        <p>
          If you have any questions about these Terms and Conditions, please
          contact us at <SupportEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
