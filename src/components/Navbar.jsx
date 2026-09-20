import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          Cozy Loopz
        </Link>
        <button
          className="nav-toggle"
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="primary-navigation"
        >
          ☰
        </button>
        <nav id="primary-navigation" className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/shop" onClick={() => setOpen(false)}>Shop All</NavLink>
        </nav>
      </div>
    </header>
  );
}
