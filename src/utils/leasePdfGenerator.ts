import jsPDF from "jspdf";

interface UrgentRepairs {
  contactName: string;
  phone: string;
  email: string;
}

interface LeaseAgreementDetails {
  signingProvider: string;
  dateOfAgreement: string;
  renterAddresses: Record<string, string>;
  urgentRepairs: UrgentRepairs;
  ownersCorporation: boolean;
  conditionReport: string;
  additionalTerms: string;
}

interface TenantInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface BondDetails {
  amount: string;
  isPaid: boolean;
  dueDate: string;
  collectViaPlatform: boolean;
}

interface LeaseDetails {
  startDate: string;
  leaseType: string;
  endDate?: string;
  rentAmount?: string;
  rentFrequency?: string;
}

// ─── Helper Constants ───
const PAGE_W = 210; // A4 width in mm
const LEFT = 15;
const RIGHT = PAGE_W - 15;
const CONTENT_W = RIGHT - LEFT;
const BLUE = [0, 51, 153] as const; // Victorian gov blue
const BLACK = [0, 0, 0] as const;
const GREY_LINE = [180, 180, 180] as const;

/**
 * Generates the first page of the official Victorian
 * "Residential rental agreement – no more than 5 years"
 * in the exact layout from Consumer Affairs Victoria.
 */
export const generateVictoriaLeasePdf = (
  leaseAgreementDetails: LeaseAgreementDetails,
  tenants: TenantInput[],
  bondDetails: BondDetails,
  leaseDetails: LeaseDetails,
  propertyAddress: string = "",
  propertyId: string = ""
) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 15; // current y position

  // ─── Utility functions ───
  const setColor = (rgb: readonly [number, number, number]) => {
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  };
  const setDrawColor = (rgb: readonly [number, number, number]) => {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  };

  const drawBox = (x: number, yPos: number, w: number, h: number) => {
    setDrawColor(BLACK);
    doc.setLineWidth(0.3);
    doc.rect(x, yPos, w, h);
  };

  const drawFilledField = (
    x: number,
    yPos: number,
    w: number,
    h: number,
    value: string
  ) => {
    drawBox(x, yPos, w, h);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(BLACK);
    doc.text(value || "", x + 2, yPos + h / 2 + 1);
  };

  const sectionNumber = (num: string, title: string, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setColor(BLACK);
    doc.text(num, LEFT, yPos);
    doc.text(title, LEFT + 7, yPos);
  };

  const label = (text: string, x: number, yPos: number, bold = true) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    setColor(BLACK);
    doc.text(text, x, yPos);
  };

  // Parse property address and postcode
  // Expected format: "102 Victoria St, Carlton 3053"
  const postcodeMatch = propertyAddress.match(/\b(\d{4})\s*$/);
  const postcode = postcodeMatch ? postcodeMatch[1] : "";
  const mainAddress = postcode
    ? propertyAddress.replace(/\s*\d{4}\s*$/, "").replace(/,\s*$/, "").trim()
    : propertyAddress.trim();

  // Parse provider info
  const providerParts = leaseAgreementDetails.signingProvider.split(" - ");
  const providerName = providerParts[0]?.trim() || "";
  const providerDetails = providerParts[1]?.trim() || "";
  const providerDetailsParts = providerDetails.split(",").map((s) => s.trim());
  const providerEmail = providerDetailsParts[0] || "";
  const providerPhone = providerDetailsParts[1] || "";

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate Lease ID
  let leaseIdDisplay = "";
  if (propertyId) {
    let hash = 0;
    for (let i = 0; i < propertyId.length; i++) {
      hash = ((hash << 5) - hash) + propertyId.charCodeAt(i);
      hash |= 0;
    }
    leaseIdDisplay = `L-${Math.abs(hash).toString().substring(0, 8).padEnd(6, '0')}`;
  }

  // ═══════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setColor(BLACK);
  doc.text("Residential rental agreement", LEFT, y);
  
  if (leaseIdDisplay) {
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text(`LEASE ID: ${leaseIdDisplay}`, RIGHT - 40, y);
    doc.setFont("helvetica", "bold");
  }

  y += 6;

  doc.setFontSize(12);
  doc.text("no more than 5 years", LEFT, y);
  y += 6;

  // Consumer Affairs Victoria text (top-right, since we can't embed the logo)
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(BLUE);
  doc.text("CONSUMER", RIGHT - 25, 15);
  doc.text("AFFAIRS", RIGHT - 25, 18.5);
  doc.text("VICTORIA", RIGHT - 25, 22);

  // Legislation references
  setColor(BLUE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Residential Tenancies Act 1997", LEFT, y);
  doc.setFont("helvetica", "normal");
  setColor(BLACK);
  doc.text(" Section 26(1)", LEFT + 55, y);
  y += 4;

  setColor(BLUE);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Residential Tenancies Regulations 2021", LEFT, y);
  doc.setFont("helvetica", "normal");
  setColor(BLACK);
  doc.text(" Regulation 10(1)", LEFT + 63, y);
  y += 6;

  // ─── Bullet points ───
  const bullets = [
    "This is your residential rental agreement. It is a binding contract under the Residential Tenancies Act 1997 (the Act).",
    "Parts A, B, C and E are the terms of your agreement. Part D is a summary of your rights and obligations.",
    "Do not sign this agreement if there is anything in it that you do not understand.",
    "Please refer to Renters Guide for details about your rights and responsibility.",
    "For further information, visit the renting section of the Consumer Affairs Victoria (CAV) website at www.consumer.vic.gov.au/renting or call 1300 558 181.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColor(BLACK);
  bullets.forEach((b) => {
    doc.text("•", LEFT + 3, y);
    const lines = doc.splitTextToSize(b, CONTENT_W - 10);
    doc.text(lines, LEFT + 8, y);
    y += lines.length * 3.5 + 1;
  });
  y += 2;

  // ═══════════════════════════════════════════
  // PART A – Basic terms
  // ═══════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setColor(BLUE);
  doc.text("Part A – Basic terms", LEFT, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  setColor(BLACK);
  doc.text(
    "This agreement is between the residential rental provider (rental provider) and the renter(s) listed on this form.",
    LEFT,
    y
  );
  y += 7;

  // ═══════════════════════════════════════════
  // 1. Date of agreement
  // ═══════════════════════════════════════════
  sectionNumber("1", "Date of agreement", y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("This is the date the agreement is signed.", LEFT + 7, y);
  y += 5;

  drawFilledField(
    LEFT + 7,
    y,
    50,
    7,
    formatDate(leaseAgreementDetails.dateOfAgreement)
  );
  y += 11;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  const agreementNote =
    "If the agreement is signed by the parties on different days, the date of the agreement is the date the last person signs the agreement.";
  const noteLines = doc.splitTextToSize(agreementNote, CONTENT_W - 7);
  doc.text(noteLines, LEFT + 7, y);
  y += noteLines.length * 3 + 5;

  // ═══════════════════════════════════════════
  // 2. Premises let by the rental provider
  // ═══════════════════════════════════════════
  sectionNumber("2", "Premises let by the rental provider", y);
  y += 5;
  label("Address of premises", LEFT + 7, y, false);
  y += 3;

  // Address box
  drawBox(LEFT + 7, y, CONTENT_W - 55, 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(mainAddress, LEFT + 9, y + 5);

  // Postcode label + box
  label("Postcode", RIGHT - 42, y + 5, false);
  drawFilledField(RIGHT - 25, y, 25, 7, postcode);
  y += 12;

  // ═══════════════════════════════════════════
  // 3. Rental provider details
  // ═══════════════════════════════════════════
  sectionNumber("3", "Rental provider details", y);
  y += 6;

  const fieldLabelX = LEFT + 7;
  const fieldValueX = LEFT + 45;
  const fieldW = CONTENT_W - 45;

  // Full name(s) or
  label("Full name(s) or", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW, 7, providerName || providerEmail);
  y += 9;

  // Company name
  label("Company name", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW, 7, "");
  y += 9;

  // ACN (if applicable)
  label("ACN (if applicable)", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW / 2, 7, "");
  y += 11;

  // Note about agents
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    "(Please fill out details below where no agent is acting for the rental provider)",
    fieldLabelX,
    y
  );
  y += 5;

  // Address
  label("Address", fieldLabelX, y + 4);
  drawBox(fieldValueX, y, fieldW - 40, 7);
  doc.text("", fieldValueX + 2, y + 5);
  label("Postcode", RIGHT - 42, y + 4, false);
  drawFilledField(RIGHT - 25, y, 25, 7, "");
  y += 9;

  // Phone number
  label("Phone number", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW / 2, 7, providerPhone);
  y += 9;

  // Email address
  label("Email address", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW, 7, providerEmail);
  y += 12;

  // ─── Rental provider's agent's details ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(BLACK);
  doc.text(
    "Rental provider's agent's details (if applicable)",
    fieldLabelX,
    y
  );
  y += 5;

  // Agent Full name
  label("Full name", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW, 7, "");
  y += 9;

  // Agent Address
  label("Address", fieldLabelX, y + 4);
  drawBox(fieldValueX, y, fieldW - 40, 7);
  label("Postcode", RIGHT - 42, y + 4, false);
  drawFilledField(RIGHT - 25, y, 25, 7, "");
  y += 9;

  // Agent Phone number
  label("Phone number", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW / 2, 7, "");
  y += 9;

  // Agent ACN
  label("ACN (if applicable)", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW / 2, 7, "");
  y += 9;

  // Agent Email
  label("Email address", fieldLabelX, y + 4);
  drawFilledField(fieldValueX, y, fieldW, 7, "");
  y += 10;

  // Note
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Note:", fieldLabelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    " The rental provider must notify the renter within 7 days if any of this information changes.",
    fieldLabelX + 8,
    y
  );
  y += 5;

  // ═══════════════════════════════════════════
  // FOOTER PAGE 1
  // ═══════════════════════════════════════════
  const drawFooter = (pageNum: number) => {
    const footerY = 287;
    setDrawColor(GREY_LINE);
    doc.setLineWidth(0.3);
    doc.line(LEFT, footerY, RIGHT, footerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(BLACK);
    doc.text(
      "Residential rental agreement – no more than 5 years",
      LEFT,
      footerY + 4
    );
    doc.text(`Page ${pageNum} of 9`, PAGE_W / 2, footerY + 4, {
      align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("OFFICIAL", RIGHT, footerY + 4, { align: "right" });
  };

  drawFooter(1);

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 2
  // ═══════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 18;

  const fieldLabelX2 = LEFT + 7;
  const fieldValueX2 = LEFT + 45;
  const fieldW2 = CONTENT_W - 45;

  // ═══════════════════════════════════════════
  // 4. Renter details
  // ═══════════════════════════════════════════
  sectionNumber("4", "Renter details", y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(BLACK);
  doc.text(
    "Each renter that is a party to the agreement must provide their details here.",
    fieldLabelX2,
    y
  );
  y += 6;

  // Draw up to 4 renter blocks
  for (let i = 0; i < 4; i++) {
    const tenant = tenants[i];
    const renterNum = i + 1;

    // Parse renter address & postcode
    let renterAddress = "";
    let renterPostcode = "";
    if (tenant) {
      const rawAddr =
        leaseAgreementDetails.renterAddresses[tenant.id] || "";
      const rpcMatch = rawAddr.match(/\b(\d{4})\s*$/);
      renterPostcode = rpcMatch ? rpcMatch[1] : "";
      renterAddress = renterPostcode
        ? rawAddr.replace(/\s*\d{4}\s*$/, "").replace(/,\s*$/, "").trim()
        : rawAddr.trim();
    }

    const fullName = tenant
      ? `${tenant.firstName} ${tenant.lastName}`
      : "";
    const phone = tenant?.phone || "";
    const email = tenant?.email || "";

    // Full name of renter N
    label(`Full name of renter ${renterNum}`, fieldLabelX2, y + 4, true);
    drawFilledField(fieldValueX2, y, fieldW2, 7, fullName);
    y += 9;

    // Current address + Postcode
    label("Current address", fieldLabelX2, y + 4, true);
    drawBox(fieldValueX2, y, fieldW2 - 40, 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(BLACK);
    doc.text(renterAddress, fieldValueX2 + 2, y + 5);
    label("Postcode", RIGHT - 42, y + 4, false);
    drawFilledField(RIGHT - 25, y, 25, 7, renterPostcode);
    y += 9;

    // Phone number
    label("Phone number", fieldLabelX2, y + 4, true);
    drawFilledField(fieldValueX2, y, fieldW2 / 2, 7, phone);
    y += 9;

    // Email address
    label("Email address", fieldLabelX2, y + 4, true);
    drawFilledField(fieldValueX2, y, fieldW2, 7, email);
    y += 11;
  }

  // Note
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(BLACK);
  doc.text("Note:", fieldLabelX2, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    " If there are more than four renters, include details on an extra page.",
    fieldLabelX2 + 8,
    y
  );
  y += 8;

  // ═══════════════════════════════════════════
  // 5. Length of the agreement
  // ═══════════════════════════════════════════
  sectionNumber("5", "Length of the agreement", y);
  y += 7;

  const isFixed = leaseDetails.leaseType === "Fixed term";
  const isPeriodic = leaseDetails.leaseType === "Periodic";

  // Fixed term agreement checkbox
  const checkboxSize = 4;
  drawBox(fieldLabelX2, y, checkboxSize, checkboxSize);
  if (isFixed) {
    // Draw checkmark
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(BLACK);
    doc.text("✓", fieldLabelX2 + 0.5, y + 3.5);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(BLACK);
  doc.text("Fixed term agreement", fieldLabelX2 + 7, y + 3);

  // Start date label + box
  label("Start date", fieldLabelX2 + 55, y + 3, false);
  drawFilledField(
    fieldLabelX2 + 75,
    y - 0.5,
    35,
    6,
    isFixed ? formatDate(leaseDetails.startDate) : ""
  );

  // Note text
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.text(
    "(this is the date the agreement starts and you",
    fieldLabelX2 + 115,
    y + 1
  );
  doc.text("may move in)", fieldLabelX2 + 115, y + 4.5);
  y += 9;

  // End date
  label("End date", fieldLabelX2 + 55, y + 3, false);
  drawFilledField(
    fieldLabelX2 + 75,
    y - 0.5,
    35,
    6,
    isFixed && leaseDetails.endDate ? formatDate(leaseDetails.endDate) : ""
  );
  y += 10;

  // Periodic agreement checkbox
  drawBox(fieldLabelX2, y, checkboxSize, checkboxSize);
  if (isPeriodic) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(BLACK);
    doc.text("✓", fieldLabelX2 + 0.5, y + 3.5);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(BLACK);
  doc.text("Periodic agreement (monthly)", fieldLabelX2 + 7, y + 3);

  // Start date for periodic
  label("Start date", fieldLabelX2 + 65, y + 3, false);
  drawFilledField(
    fieldLabelX2 + 85,
    y - 0.5,
    35,
    6,
    isPeriodic ? formatDate(leaseDetails.startDate) : ""
  );
  y += 9;

  // Periodic note
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Note:", fieldLabelX2, y);
  doc.setFont("helvetica", "normal");
  const periodicNote =
    "A periodic (e.g. month by month) rental agreement will be formed at the end of the fixed term agreement if the renter and rental provider do not sign a new fixed term agreement and the renter stays in the property.";
  const periodicNoteLines = doc.splitTextToSize(
    periodicNote,
    CONTENT_W - 17
  );
  doc.text(periodicNoteLines, fieldLabelX2 + 10, y);
  y += periodicNoteLines.length * 3 + 6;

  // ═══════════════════════════════════════════
  // 6. Rent
  // ═══════════════════════════════════════════
  sectionNumber("6", "Rent", y);
  y += 6;

  // Rent amount
  label("Rent amount ($)", fieldLabelX2, y + 4);
  drawFilledField(
    fieldValueX2,
    y,
    30,
    7,
    leaseDetails.rentAmount || bondDetails.amount || ""
  );
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("(payable in advance)", fieldLabelX2, y);
  y += 7;

  // To be paid per: checkboxes
  label("To be paid per", fieldLabelX2, y + 3);

  const freqOptions = ["week", "fortnight", "calendar month"];
  const freqPositions = [fieldValueX2, fieldValueX2 + 40, fieldValueX2 + 80];
  const currentFreq = (
    leaseDetails.rentFrequency || "Weekly"
  ).toLowerCase();

  freqOptions.forEach((opt, idx) => {
    const x = freqPositions[idx];
    drawBox(x, y, checkboxSize, checkboxSize);

    const isChecked =
      currentFreq.includes(opt) ||
      (opt === "week" && currentFreq === "weekly") ||
      (opt === "fortnight" && currentFreq === "fortnightly") ||
      (opt === "calendar month" && currentFreq === "monthly");

    if (isChecked) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setColor(BLACK);
      doc.text("✓", x + 0.5, y + 3.5);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setColor(BLACK);
    doc.text(opt, x + 6, y + 3);
  });
  y += 10;

  // Day rent is to be paid
  label("Day rent is to be paid", fieldLabelX2, y + 4);
  drawFilledField(fieldValueX2, y, 35, 7, "");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text(
    "(e.g. each Thursday or the 11th of each month)",
    fieldValueX2 + 38,
    y + 5
  );
  y += 10;

  // Date first rent payment due
  label("Date first rent payment due", fieldLabelX2, y + 4);
  drawFilledField(
    fieldValueX2,
    y,
    35,
    7,
    formatDate(leaseDetails.startDate)
  );
  y += 10;

  // ═══════════════════════════════════════════
  // FOOTER PAGE 2
  // ═══════════════════════════════════════════
  drawFooter(2);

  // Save the PDF
  doc.save("residential-rental-agreement.pdf");
};
