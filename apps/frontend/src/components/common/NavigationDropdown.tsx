import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NavigationDropdown.css';

const NavigationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOptionClick = (option: 'zkwill' | 'ipfs' | 'arbitrum' | 'github' | 'civilcode') => {
    setIsOpen(false);

    switch (option) {
      case 'zkwill':
        navigate('/');
        break;
      case 'ipfs':
        navigate('/ipfs-explorer');
        break;
      case 'arbitrum':
        window.open('https://sepolia.arbiscan.io/', '_blank');
        break;
      case 'github':
        window.open('https://github.com/june-in-exile/zkWill', '_blank');
        break;
      case 'civilcode':
        window.open('https://law.moj.gov.tw/LawClass/LawParaDeatil.aspx?pcode=B0000001&bp=133', '_blank');
        break;
    }
  };

  return (
    <div className="navigation-dropdown" ref={dropdownRef}>
      <button
        className={`hamburger-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <button
            className="dropdown-item"
            onClick={() => handleOptionClick('zkwill')}
          >
            <span className="item-icon">📝</span>
            <div className="item-content">
              <div className="item-title">zkWill System</div>
              <div className="item-description">Main dashboard and will management</div>
            </div>
          </button>

          <button
            className="dropdown-item"
            onClick={() => handleOptionClick('ipfs')}
          >
            <span className="item-icon">📦</span>
            <div className="item-content">
              <div className="item-title">IPFS Explorer</div>
              <div className="item-description">Query encrypted data by CID</div>
            </div>
          </button>

          <button
            className="dropdown-item"
            onClick={() => handleOptionClick('arbitrum')}
          >
            <span className="item-icon">🔗</span>
            <div className="item-content">
              <div className="item-title">Arbitrum Sepolia</div>
              <div className="item-description">View blockchain explorer</div>
            </div>
          </button>

          <button
            className="dropdown-item"
            onClick={() => handleOptionClick('github')}
          >
            <span className="item-icon">💻</span>
            <div className="item-content">
              <div className="item-title">GitHub Repository</div>
              <div className="item-description">View source code and documentation</div>
            </div>
          </button>

          <button
            className="dropdown-item"
            onClick={() => handleOptionClick('civilcode')}
          >
            <span className="item-icon">⚖️</span>
            <div className="item-content">
              <div className="item-title">Civil Code</div>
              <div className="item-description">Taiwan Civil Code - Inheritance Law</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default NavigationDropdown;
