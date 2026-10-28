import {
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection,
  SupportEmail,
} from "../components/legal-page";
import {
  DAMAGE_REPORT_HOURS,
  REFUND_TIME,
  RETURN_WINDOW_DAYS,
} from "../policy";

export function ReturnsPolicy() {
  return (
    <LegalPage title="Returns & Refund Policy">
      <LegalSection title="1. Overview">
        <p>
          At Switchblade, we want you to love what you wear. If something
          isn&apos;t right, we&apos;re happy to help with a return or exchange,
          subject to the conditions below.
        </p>
      </LegalSection>

      <LegalSection title="2. Return Window">
        <LegalList
          items={[
            `You may request a return or exchange within ${RETURN_WINDOW_DAYS} days of the delivery date.`,
            "Requests made after this window will not be accepted.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Eligibility for Returns">
        <p>To be eligible for a return, items must be:</p>
        <LegalList
          items={[
            "Unworn, unwashed, and unused",
            "In original condition with all tags attached",
            "In original packaging, where applicable",
            "Free from stains, odor, alterations, or damage not caused by us",
          ]}
        />
        <p>
          Certain items may be marked as final sale / non-returnable at the time
          of purchase — these will not be eligible for return or exchange.
        </p>
      </LegalSection>

      <LegalSection title="4. Items Not Eligible for Return">
        <LegalList
          items={[
            "Items purchased on final sale or clearance",
            "Items without original tags or packaging",
            "Items showing signs of wear or use",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. How to Initiate a Return">
        <LegalList
          items={[
            <>
              Log into your account and go to{" "}
              <LegalLink href="/account/orders">Order History</LegalLink>, or
              contact us at <SupportEmail />
            </>,
            "Select the item(s) you wish to return and the reason for return",
            "Once approved, you'll receive instructions for shipping the item back (or, if applicable, a reverse pickup will be scheduled)",
            "Pack the item securely with tags and original packaging intact",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Return Shipping">
        <LegalList
          items={[
            "Return shipping is free for damaged, defective, or incorrect items.",
            "We recommend using a trackable shipping method for self-shipped returns, as we are not responsible for items lost in transit.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Refunds">
        <LegalList
          items={[
            "Once we receive and inspect your returned item, we will notify you of the approval or rejection of your refund.",
            `Approved refunds will be processed to your original payment method within ${REFUND_TIME}.`,
            "Shipping charges (if any) are non-refundable, except in cases of defective or incorrect items received.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Exchanges">
        <LegalList
          items={[
            "Exchanges are subject to stock availability.",
            "If your desired size/color is unavailable, we will process a refund instead.",
            "To request an exchange, follow the same process as a return and specify your preferred replacement.",
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Damaged, Defective, or Incorrect Items">
        <p>
          If you receive a damaged, defective, or incorrect item, please contact
          us within {DAMAGE_REPORT_HOURS} hours of delivery with photos of the
          issue. We will arrange a free replacement, exchange, or full refund,
          including shipping costs.
        </p>
      </LegalSection>

      <LegalSection title="10. Late or Missing Refunds">
        <p>
          If you haven&apos;t received a refund within the stated timeframe:
        </p>
        <LegalList
          items={[
            "Check your bank account again",
            "Contact your payment provider, as processing times vary",
            <>
              If you&apos;ve done this and still have not received your refund,
              contact us at <SupportEmail />
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="11. Contact Us">
        <p>
          For any questions about returns, exchanges, or refunds, reach out to
          us at <SupportEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
