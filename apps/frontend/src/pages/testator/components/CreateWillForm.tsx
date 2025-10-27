import React, { useState } from 'react';
import type { WillData } from '../TestatorPage';

interface Props {
  testatorAddress: string;
  onSubmit: (data: WillData) => void;
}

const CreateWillForm: React.FC<Props> = ({ testatorAddress, onSubmit }) => {
  // Load default values from environment
  const defaultExecutor = import.meta.env.VITE_DEFAULT_EXECUTOR || '';
  const defaultEstates: Array<{ address: string; token: string; amount: string }> = [];

  // Add first estate if available
  if (import.meta.env.VITE_DEFAULT_BENEFICIARY0) {
    defaultEstates.push({
      address: import.meta.env.VITE_DEFAULT_BENEFICIARY0 || '',
      token: import.meta.env.VITE_DEFAULT_TOKEN0 || '',
      amount: import.meta.env.VITE_DEFAULT_AMOUNT0 || '',
    });
  }

  // Add second estate if available
  if (import.meta.env.VITE_DEFAULT_BENEFICIARY1) {
    defaultEstates.push({
      address: import.meta.env.VITE_DEFAULT_BENEFICIARY1 || '',
      token: import.meta.env.VITE_DEFAULT_TOKEN1 || '',
      amount: import.meta.env.VITE_DEFAULT_AMOUNT1 || '',
    });
  }

  // If no defaults found, add one empty estate
  if (defaultEstates.length === 0) {
    defaultEstates.push({ address: '', token: '', amount: '' });
  }

  const [executor, setExecutor] = useState(defaultExecutor);
  const [estates, setEstates] = useState(defaultEstates);

  const addEstate = () => {
    setEstates([...estates, { address: '', token: '', amount: '' }]);
  };

  const removeEstate = (index: number) => {
    setEstates(estates.filter((_, i) => i !== index));
  };

  const updateEstate = (index: number, field: string, value: string) => {
    const updated = [...estates];
    updated[index] = { ...updated[index], [field]: value };
    setEstates(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      testator: testatorAddress,
      executor,
      estates: estates.map((estate) => ({
        address: estate.address,
        token: estate.token,
        amount: estate.amount,
      })),
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

      <div className="estates-section">
        <h3>Estates</h3>
        {estates.map((estate, index) => (
          <div key={index} className="estate-item">
            <div className="form-group">
              <label>Beneficiary Address *</label>
              <input
                type="text"
                value={estate.address}
                onChange={(e) => updateEstate(index, 'address', e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
            <div className="form-group">
              <label>Token Address *</label>
              <input
                type="text"
                value={estate.token}
                onChange={(e) => updateEstate(index, 'token', e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="text"
                value={estate.amount}
                onChange={(e) => updateEstate(index, 'amount', e.target.value)}
                placeholder="1000"
                required
              />
            </div>
            {estates.length > 1 && (
              <button type="button" onClick={() => removeEstate(index)} className="btn-remove">
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addEstate} className="btn-add">
          + Add Estate
        </button>
      </div>

      <button type="submit" className="btn-primary">
        Continue to Approval
      </button>
    </form>
  );
};

export default CreateWillForm;
