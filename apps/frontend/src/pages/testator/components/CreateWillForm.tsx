import React, { useState } from 'react';
import type { WillData } from '../TestatorPage';

interface Props {
  testatorAddress: string;
  onSubmit: (data: WillData) => void;
}

const CreateWillForm: React.FC<Props> = ({ testatorAddress, onSubmit }) => {
  // Load default values from environment
  const defaultExecutor = import.meta.env.VITE_DEFAULT_EXECUTOR || '';
  const defaultBeneficiaries: Array<{ address: string; token: string; amount: string }> = [];

  // Add first beneficiary if available
  if (import.meta.env.VITE_DEFAULT_BENEFICIARY0) {
    defaultBeneficiaries.push({
      address: import.meta.env.VITE_DEFAULT_BENEFICIARY0 || '',
      token: import.meta.env.VITE_DEFAULT_TOKEN0 || '',
      amount: import.meta.env.VITE_DEFAULT_AMOUNT0 || '',
    });
  }

  // Add second beneficiary if available
  if (import.meta.env.VITE_DEFAULT_BENEFICIARY1) {
    defaultBeneficiaries.push({
      address: import.meta.env.VITE_DEFAULT_BENEFICIARY1 || '',
      token: import.meta.env.VITE_DEFAULT_TOKEN1 || '',
      amount: import.meta.env.VITE_DEFAULT_AMOUNT1 || '',
    });
  }

  // If no defaults found, add one empty beneficiary
  if (defaultBeneficiaries.length === 0) {
    defaultBeneficiaries.push({ address: '', token: '', amount: '' });
  }

  const [executor, setExecutor] = useState(defaultExecutor);
  const [beneficiaries, setBeneficiaries] = useState(defaultBeneficiaries);

  const addBeneficiary = () => {
    setBeneficiaries([...beneficiaries, { address: '', token: '', amount: '' }]);
  };

  const removeBeneficiary = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
  };

  const updateBeneficiary = (index: number, field: string, value: string) => {
    const updated = [...beneficiaries];
    updated[index] = { ...updated[index], [field]: value };
    setBeneficiaries(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      testator: testatorAddress,
      executor,
      beneficiaries,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="will-form">
      <h2>Create Your Will</h2>

      <div className="form-group">
        <label>Testator Address (You)</label>
        <input type="text" value={testatorAddress} disabled />
      </div>

      <div className="form-group">
        <label>Executor Address *</label>
        <input
          type="text"
          value={executor}
          onChange={(e) => setExecutor(e.target.value)}
          placeholder="0x..."
          required
        />
      </div>

      <div className="beneficiaries-section">
        <h3>Beneficiaries</h3>
        {beneficiaries.map((ben, index) => (
          <div key={index} className="beneficiary-item">
            <div className="form-group">
              <label>Beneficiary Address *</label>
              <input
                type="text"
                value={ben.address}
                onChange={(e) => updateBeneficiary(index, 'address', e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
            <div className="form-group">
              <label>Token Address *</label>
              <input
                type="text"
                value={ben.token}
                onChange={(e) => updateBeneficiary(index, 'token', e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="text"
                value={ben.amount}
                onChange={(e) => updateBeneficiary(index, 'amount', e.target.value)}
                placeholder="1000"
                required
              />
            </div>
            {beneficiaries.length > 1 && (
              <button type="button" onClick={() => removeBeneficiary(index)} className="btn-remove">
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addBeneficiary} className="btn-add">
          + Add Beneficiary
        </button>
      </div>

      <button type="submit" className="btn-primary">
        Continue to Approval
      </button>
    </form>
  );
};

export default CreateWillForm;
