interface LoadSummary {
  id: number;
  reference?: string | null;
  pickupCity?: string | null;
  pickupState?: string | null;
  dropCity?: string | null;
  dropState?: string | null;
  pickupDate?: Date | null;
  equipmentType?: string | null;
  rate?: number | null;
}

export function generateEmailSubject(load: LoadSummary): string {
  const lane = getLane(load);
  const ref = load.reference || `Load #${load.id}`;
  return `${ref} - ${lane} - Available Now`;
}

export function generateEmailBody(load: LoadSummary, ventureName: string): string {
  const lane = getLane(load);
  const pickupDate = load.pickupDate
    ? new Date(load.pickupDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "ASAP";
  const equipment = load.equipmentType || "TBD";

  return `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <p>Hi,</p>
  <p>We have a load available that matches your lanes:</p>
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <p style="margin: 5px 0;"><strong>Lane:</strong> ${lane}</p>
    <p style="margin: 5px 0;"><strong>Pickup:</strong> ${pickupDate}</p>
    <p style="margin: 5px 0;"><strong>Equipment:</strong> ${equipment}</p>
    <p style="margin: 5px 0;"><strong>Reference:</strong> ${load.reference || `#${load.id}`}</p>
  </div>
  <p>Reply to this email or call us to book.</p>
  <p>Best,<br/>${ventureName} Dispatch Team</p>
</div>
`.trim();
}

export function generateSmsBody(load: LoadSummary, ventureName: string): string {
  const lane = getLane(load);
  const pickupDate = load.pickupDate
    ? new Date(load.pickupDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "ASAP";
  const equipment = load.equipmentType || "TBD";

  return `${ventureName}: Load available! ${lane}, ${pickupDate}, ${equipment}. Reply YES or call to book. Ref: ${load.reference || load.id}`;
}

function getLane(load: LoadSummary): string {
  const pickup = load.pickupCity && load.pickupState
    ? `${load.pickupCity}, ${load.pickupState}`
    : load.pickupState || "Origin";
  const drop = load.dropCity && load.dropState
    ? `${load.dropCity}, ${load.dropState}`
    : load.dropState || "Destination";
  return `${pickup} → ${drop}`;
}
