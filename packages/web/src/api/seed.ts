import { db } from "./database";
import * as s from "./database/schema";
await db
  .insert(s.products)
  .values([
    {
      id: "safespace",
      name: "SafeSpace",
      description:
        "A personal safety and emergency-alert application designed to help you notify your chosen emergency contacts when you need help.",
      features: JSON.stringify([
        "Emergency contact alerts",
        "Location sharing workflows",
        "Medical information",
        "Check-in functionality",
      ]),
    },
    {
      id: "shiftmate",
      name: "ShiftMate SA",
      description:
        "A South African shift and estimated-earnings tracker designed to help you record your hours and understand your estimated gross pay.",
      features: JSON.stringify([
        "Shift and working-hours tracking",
        "Configurable pay rules",
        "Estimated gross earnings",
        "Multiple-job management",
      ]),
    },
  ])
  .onConflictDoNothing();
await db
  .insert(s.plans)
  .values([
    {
      id: "safespace-once",
      productId: "safespace",
      name: "Once-off access",
      price: 10000,
      interval: "once",
    },
    {
      id: "shiftmate-month",
      productId: "shiftmate",
      name: "Pro monthly",
      price: 3999,
      interval: "month",
    },
    {
      id: "shiftmate-year",
      productId: "shiftmate",
      name: "Pro annually",
      price: 29999,
      interval: "year",
    },
  ])
  .onConflictDoNothing();
await db
  .insert(s.settings)
  .values(
    [
      "contactEmail",
      "supportEmail",
      "phone",
      "address",
      "registrationNumber",
      "informationOfficer",
    ].map((key) => ({ key, value: "" })),
  )
  .onConflictDoNothing();
const pages = [
  {
    id: "terms",
    title: "Terms and Conditions",
    content:
      "About these terms\nThis draft applies to the Zephyr Consulting website and storefront. Legal business name, registration number, physical address and contact details require confirmation before trading.\n\nProducts and orders\nDisplayed prices are proposed ZAR prices. Checkout is currently disabled. A browser redirect is not proof of payment. Access may only be granted after server-side payment verification and destination-app entitlement checks. Licence scope and support inclusions must be confirmed before sale.\n\nConsumer rights\nThese terms do not exclude non-excludable rights under South African law, including the Consumer Protection Act and Electronic Communications and Transactions Act where applicable. Counsel must confirm disclosures, applicable cooling-off periods and lawful cancellation conditions.\n\nDisputes\nContact and complaint channels require configuration. Governing law, dispute resolution and liability provisions require legal review.",
  },
  {
    id: "privacy",
    title: "Privacy Policy & POPIA Notice",
    content:
      "Responsible party\nZephyr Consulting. Registration, physical address and Information Officer contact: configuration required.\n\nWhat this storefront collects\nAccount name, email, authentication records, order references and support messages. Do not submit medical information, emergency evidence or live location data here. Those belong in the relevant product app under its own privacy notice.\n\nPurpose and sharing\nData supports customer accounts, support requests and eventual verified purchases. Hosting, authentication and payment providers may process necessary records. Provider contracts, cross-border safeguards and lawful processing grounds require review.\n\nYour rights\nSubject to applicable law, you may request access, correction, deletion or object to processing. The request channel and identity-verification procedure must be configured. Complaints may be directed to the Information Regulator of South Africa.\n\nRetention and security\nRetention periods, deletion workflows, backup recovery and incident notification procedures must be established before launch. Do not interpret this draft as certification of POPIA compliance. The platform includes analytics; its collection and consent requirements need review.",
  },
  {
    id: "refunds",
    title: "Refund & Cancellation Policy",
    content:
      "Before purchases open\nRefund eligibility, timeframes, contact channels and support responsibilities require confirmation. No real payment is accepted by this build.\n\nConsumer protection\nNothing in this draft removes mandatory rights under the Consumer Protection Act or Electronic Communications and Transactions Act where applicable. Digital-product exceptions and cooling-off rights must be reviewed by counsel.\n\nProcessing requests\nCustomers should submit an authenticated support ticket with the order reference, not card details. Verified refunds or chargebacks may require entitlement revocation under reviewed product terms. Payment-provider refund automation is not yet implemented.",
  },
  {
    id: "subscriptions",
    title: "Subscription Terms",
    content:
      "Proposed plans\nShiftMate SA Pro is proposed at R39.99 per month or R299.99 per year. These are alternatives, not simultaneous charges. Recurring billing is disabled.\n\nBefore activation\nPlan inclusions, renewal dates, cancellation route, notice periods, failed-renewal grace periods, price-change notices and any applicable refunds must be defined and displayed before checkout.\n\nAccess duration\nSubscription access must expire with its paid period and must not become indefinite after one payment. Recurring-payment verification and renewal handling require sandbox testing.",
  },
  {
    id: "disclaimer",
    title: "Website Disclaimer",
    content:
      "Product status\nProduct capabilities described as planned or under review are not verified operational features. Illustrative interfaces are not live app screenshots. No app-store listing or native Android download is supplied.\n\nSafeSpace\nSafeSpace is not a substitute for emergency services. Delivery depends on devices, permissions, connectivity and recipients. Do not rely on it as your only means of seeking help. Automatic emergency-service response and guaranteed alert delivery are not promised.\n\nShiftMate SA\nAll pay figures are estimated gross earnings, not guaranteed payroll, net pay or a determination of legally payable amounts. Confirm your contract and actual payslip.\n\nLegal review\nLiability exclusions and statutory protections require qualified South African legal review before publication.",
  },
  {
    id: "eula",
    title: "End-User Licence Agreement",
    content:
      "Distribution status\nNo signed native Android APK is available. Licence grant, permitted devices, transferability and support inclusions require confirmation before software is sold or distributed.\n\nIntended restrictions\nProduct-specific access applies only to the purchased product and valid licence period. Destination applications must enforce that access independently. Intellectual property, acceptable use and termination provisions require review.\n\nUpdates and installation\nSigned build integrity, supported Android versions, permissions, release notes and revoked-version processes must be tested before authenticated downloads are enabled. A web app or source-code archive is not an Android APK.",
  },
];
await db.insert(s.legal).values(pages).onConflictDoNothing();
console.log("Catalogue, proposed plans, configuration fields and legal drafts seeded.");
