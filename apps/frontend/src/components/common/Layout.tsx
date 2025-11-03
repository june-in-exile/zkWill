import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import WalletConnect from '../wallet/WalletConnect';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <Link to="/">ZK Will System</Link>
          </div>
          <div className="nav-links">
            <Link to="/testator" className={isActive('/testator') ? 'active' : ''}>
              Testator
            </Link>
            <Link to="/notary" className={isActive('/notary') ? 'active' : ''}>
              Notary
            </Link>
            <Link to="/oracle" className={isActive('/oracle') ? 'active' : ''}>
              Oracle
            </Link>
            <Link to="/executor" className={isActive('/executor') ? 'active' : ''}>
              Executor
            </Link>
          </div>
          <WalletConnect />
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
