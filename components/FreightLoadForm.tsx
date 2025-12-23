import React, { useState } from "react";
import { AliasAutocomplete, AliasOption } from "./AliasAutocomplete";

interface FreightLoadFormValues {
  loadNumber: string;
  salesAgentAliasId: number | null;
  csrAliasId: number | null;
  dispatcherAliasId: number | null;
}

interface Props {
  initial?: Partial<FreightLoadFormValues>;
  onSubmit: (values: FreightLoadFormValues) => void;
}

export const FreightLoadForm: React.FC<Props> = ({ initial, onSubmit }) => {
  const [loadNumber, setLoadNumber] = useState(initial?.loadNumber ?? "");
  const [salesAgent, setSalesAgent] = useState<AliasOption | null>(null);
  const [csr, setCsr] = useState<AliasOption | null>(null);
  const [dispatcher, setDispatcher] = useState<AliasOption | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      loadNumber,
      salesAgentAliasId: salesAgent?.id ?? null,
      csrAliasId: csr?.id ?? null,
      dispatcherAliasId: dispatcher?.id ?? null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Load #</label>
        <input
          value={loadNumber}
          onChange={(e) => setLoadNumber(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </div>

      <AliasAutocomplete
        label="Sales Agent"
        role="SALES_AGENT"
        value={salesAgent}
        onChange={setSalesAgent}
      />

      <AliasAutocomplete
        label="CSR"
        role="CSR"
        value={csr}
        onChange={setCsr}
      />

      <AliasAutocomplete
        label="Dispatcher"
        role="DISPATCHER"
        value={dispatcher}
        onChange={setDispatcher}
      />

      <button
        type="submit"
        className="px-4 py-2 rounded-md bg-black text-white text-sm"
      >
        Save Load
      </button>
    </form>
  );
};

export default FreightLoadForm;
