import { ClipboardList } from "lucide-react";

/**
 * Certificate requirements mapped by keyword matching.
 * To update requirements, edit the entries below.
 */
const REQUIREMENTS_MAP: { keywords: string[]; label: string; items: string[] }[] = [
  {
    keywords: ["medical"],
    label: "Medical-Related Certificate",
    items: [
      "Medical certificate from a doctor",
      "Valid ID",
      "Purpose of request",
    ],
  },
  {
    keywords: ["pwd"],
    label: "PWD-Related Certificate",
    items: [
      "PWD ID",
      "Medical certificate",
      "Valid ID",
      "Purpose of request",
    ],
  },
  {
    keywords: ["cedula"],
    label: "Cedula-Related Request",
    items: [
      "2×2 picture",
      "Valid ID",
      "Purpose of request",
    ],
  },
  {
    keywords: ["first time job seeker"],
    label: "First Time Job Seeker Certification",
    items: [
      "Valid ID",
      "Purpose of request",
      "Additional barangay verification if needed",
    ],
  },
  {
    keywords: ["others"],
    label: "Others (Specify)",
    items: [
      "Valid ID",
      "Purpose of request",
      "Additional supporting requirements may be requested by the barangay",
    ],
  },
];

const DEFAULT_REQUIREMENTS = {
  label: "General Requirements",
  items: ["Valid ID", "Purpose of request"],
};

function getRequirements(certificateType: string) {
  const lower = certificateType.toLowerCase();
  const match = REQUIREMENTS_MAP.find((r) =>
    r.keywords.some((kw) => lower.includes(kw))
  );
  return match ?? { label: DEFAULT_REQUIREMENTS.label, items: DEFAULT_REQUIREMENTS.items };
}

interface CertificateRequirementsGuideProps {
  certificateType: string;
}

const CertificateRequirementsGuide = ({ certificateType }: CertificateRequirementsGuideProps) => {
  if (!certificateType) return null;

  const { label, items } = getRequirements(certificateType);

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Requirements Guide — {label}
        </h4>
      </div>
      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground/70 mt-3 italic">
        Requirements may vary depending on certificate type.
      </p>
    </div>
  );
};

export default CertificateRequirementsGuide;
