// src/components/navbar.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { useAuth } from '../context/useAuth';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'Administrador';
  const isEmpleado = user?.role === 'Empleado';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const brandLink = isAdmin
    ? '/admin/usuarios'
    : isEmpleado
    ? '/empleado/siguiente-turno'
    : '/';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold" to={brandLink}>
          Kairos - Sistema de Turnos
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* MENÚ IZQUIERDO */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {/* NO logueado: ver servicios + login */}
            {!user && (
              <>
                <li className="nav-item">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active fw-semibold' : ''}`
                    }
                  >
                    Servicios
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active fw-semibold' : ''}`
                    }
                  >
                    Iniciar sesión
                  </NavLink>
                </li>
              </>
            )}

            {/* Opciones Empleado/Admin */}
            {(isAdmin || isEmpleado) && (
              <>
                <li className="nav-item">
                  <NavLink
                    to="/empleado/siguiente-turno"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active fw-semibold' : ''}`
                    }
                  >
                    Siguiente turno
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/empleado/clientes"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active fw-semibold' : ''}`
                    }
                  >
                    Consultar cliente
                  </NavLink>
                </li>
              </>
            )}

            {/* Menú Administración solo para ADMIN */}
            {isAdmin && (
              <li className="nav-item dropdown">
                <button
                  className="btn btn-outline-light btn-sm dropdown-toggle ms-lg-2"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Administración
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <NavLink className="dropdown-item" to="/admin/usuarios">
                      Usuarios
                    </NavLink>
                  </li>
                  <li>
                    <NavLink className="dropdown-item" to="/admin/servicios">
                      Servicios
                    </NavLink>
                  </li>
                  <li>
                    <NavLink className="dropdown-item" to="/admin/turnos">
                      Turnos (próximamente)
                    </NavLink>
                  </li>
                  <li>
                    <NavLink className="dropdown-item" to="/registro">
                      Registrar usuario
                    </NavLink>
                  </li>
                </ul>
              </li>
            )}
          </ul>

          {/* MENÚ DERECHO */}
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            {user && (
              <>
                <li className="nav-item me-2">
                  <span className="navbar-text small">
                    Hola, <strong>{user.name}</strong> ({user.role})
                  </span>
                </li>
                <li className="nav-item">
                  <button
                    className="btn btn-outline-light btn-sm"
                    type="button"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
