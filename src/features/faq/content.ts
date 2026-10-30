import { siteConfig } from "@/config/site";
import {
  DAMAGE_REPORT_HOURS,
  DELIVERY_TIME,
  REFUND_TIME,
  RETURN_WINDOW_DAYS,
} from "@/features/legal/policy";

export type Faq = { question: string; answer: string };
export type FaqCategory = { id: string; label: string; faqs: Faq[] };

const email = siteConfig.supportEmail;

export const faqCategories: FaqCategory[] = [
  {
    id: "orders-shipping",
    label: "Orders & Shipping",
    faqs: [
      {
        question: "How long will it take to receive my order?",
        answer: `Standard delivery is free and typically takes ${DELIVERY_TIME}. Please note that during exclusive drops or sale periods, dispatch may be delayed by up to 48 hours.`,
      },
      {
        question: "Do you ship internationally?",
        answer: "Yes.",
      },
      {
        question: "Can I modify or cancel my order after placing it?",
        answer: `Orders are processed quickly, so please write to us at ${email} as soon as possible. If your order hasn't been packed yet, we'll do our best to cancel it and refund you in full.`,
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept UPI, credit and debit cards, net banking and popular wallets through our secure payment partner. Cash on delivery isn't available at the moment.",
      },
      {
        question: "Can I change my shipping address?",
        answer: `If your order hasn't shipped yet, email ${email} with your order ID and the new address and we'll update it. Once an order has shipped, the address can't be changed.`,
      },
    ],
  },
  {
    id: "returns-exchanges",
    label: "Returns & Exchanges",
    faqs: [
      {
        question: "What is your return policy?",
        answer: `You can request a return or exchange within ${RETURN_WINDOW_DAYS} days of delivery. Items must be unworn, unwashed and have all original tags attached.`,
      },
      {
        question: "How do I start a return?",
        answer: `Sign in, go to Order History and choose Request return on the delivered order (it's there for ${RETURN_WINDOW_DAYS} days after delivery), or email us at ${email} with your order number. We'll send instructions for sending the item back or arrange a reverse pickup.`,
      },
      {
        question: "When will I get my refund?",
        answer: `Once we receive and inspect your return, approved refunds are processed to your original payment method within ${REFUND_TIME}.`,
      },
      {
        question: "What if my item arrives damaged or incorrect?",
        answer: `Contact us within ${DAMAGE_REPORT_HOURS} hours of delivery with photos of the issue. We'll arrange a free replacement, exchange or full refund.`,
      },
    ],
  },
  {
    id: "sizing-fit",
    label: "Sizing & Fit",
    faqs: [
      {
        question: "How do I find my size?",
        answer:
          "Every product page has a size guide with garment measurements. Compare them with a similar piece you already own for the best fit.",
      },
      {
        question: "Do your pieces run true to size?",
        answer:
          "Most of our pieces fit true to size. Where a style is cut oversized or slim, we mention it in the product description.",
      },
      {
        question: "What if the size doesn't fit?",
        answer: `You can exchange it for another size within ${RETURN_WINDOW_DAYS} days of delivery, subject to stock. The new size is delivered in ${DELIVERY_TIME}. If your size is unavailable, we'll refund you instead.`,
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    faqs: [
      {
        question: "Which currency will I be charged in?",
        answer:
          "All orders are charged in Indian Rupees (INR). Prices shown in other currencies are estimates to help you compare.",
      },
      {
        question: "Is it safe to pay on your website?",
        answer:
          "Yes. Payments are handled by a secure, PCI-compliant payment partner. We never see or store your full card details.",
      },
      {
        question: "My payment failed but money was debited. What now?",
        answer: `Failed payments are refunded automatically by your bank or payment provider, usually within ${REFUND_TIME}. If it hasn't arrived after that, contact us at ${email}.`,
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    faqs: [
      {
        question: "Do I need an account to place an order?",
        answer:
          "No, you can check out as a guest. An account lets you track orders, save addresses and keep a wishlist across devices.",
      },
      {
        question: "How do I track my order?",
        answer:
          "Sign in and open Order History. Once your order ships, a Track Order link appears on it.",
      },
      {
        question: "How do I update my details?",
        answer:
          "Sign in and go to Account Details to update your name, phone number and saved addresses.",
      },
    ],
  },
];
