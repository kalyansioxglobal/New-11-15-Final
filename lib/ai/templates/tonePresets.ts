export type TonePreset = {
  id: string;
  label: string;
  modifier: string;
};

export const tonePresets: TonePreset[] = [
  {
    id: "neutral",
    label: "Neutral",
    modifier: "Maintain a clear, direct, neutral tone.",
  },
  {
    id: "friendly",
    label: "Friendly",
    modifier: "Use a warm, friendly, but still professional tone.",
  },
  {
    id: "professional_firm",
    label: "Professional & Firm",
    modifier:
      "Use a confident, concise, professional tone with firm clarity, avoiding unnecessary softness.",
  },
];
