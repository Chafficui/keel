import { Link } from "react-router";

export interface ConsentState {
  privacyPolicy: boolean;
  termsOfService: boolean;
  marketingEmails: boolean;
  analytics: boolean;
}

interface ConsentCheckboxesProps {
  value: ConsentState;
  onChange: (value: ConsentState) => void;
}

export default function ConsentCheckboxes({
  value,
  onChange,
}: ConsentCheckboxesProps) {
  const update = (field: keyof ConsentState, checked: boolean) => {
    onChange({ ...value, [field]: checked });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-keel-gray-400 uppercase tracking-wide">
        Consent
      </p>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.privacyPolicy}
          onChange={(e) => update("privacyPolicy", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-keel-gray-800 bg-keel-gray-900 text-keel-blue focus:ring-keel-blue"
        />
        <span className="text-sm text-keel-gray-100">
          I have read and accept the{" "}
          <Link
            to="/privacy-policy"
            target="_blank"
            className="font-medium text-keel-blue hover:text-keel-blue/80"
          >
            Privacy Policy
          </Link>
          <span className="text-red-400"> *</span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.termsOfService}
          onChange={(e) => update("termsOfService", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-keel-gray-800 bg-keel-gray-900 text-keel-blue focus:ring-keel-blue"
        />
        <span className="text-sm text-keel-gray-100">
          I agree to the{" "}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-keel-blue hover:text-keel-blue/80"
          >
            Terms of Service
          </a>
          <span className="text-red-400"> *</span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.marketingEmails}
          onChange={(e) => update("marketingEmails", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-keel-gray-800 bg-keel-gray-900 text-keel-blue focus:ring-keel-blue"
        />
        <span className="text-sm text-keel-gray-400">
          I would like to receive product updates and marketing emails
          <span className="ml-1 text-xs text-keel-gray-400/60">(optional)</span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.analytics}
          onChange={(e) => update("analytics", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-keel-gray-800 bg-keel-gray-900 text-keel-blue focus:ring-keel-blue"
        />
        <span className="text-sm text-keel-gray-400">
          I consent to anonymous usage analytics to help improve the service
          <span className="ml-1 text-xs text-keel-gray-400/60">(optional)</span>
        </span>
      </label>
    </div>
  );
}
