// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/navbar';
import LoginView from './views/login';
import RegisterView from './views/register';
import UsersView from './views/users';
import HomeView from './views/home';
import AdminServicesView from './views/adminServices';
import RecoverView from './views/recover';
import ProtectedRoute from './components/ProtectedRoute';
import { useEffect, useState } from 'react';
import { serviceService } from './services/serviceService';
import { turnService } from './services/turnService';
import { clientService } from './services/clientService';
import DisplayView from './views/display';
import './App.css';

// EMPLEADO / ADMIN – Siguiente turno
function EmployeeNextTurnView() {
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [currentTurn, setCurrentTurn] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await serviceService.GetAll();
        setServices(data);
      } catch (error) {
        console.error(error);
        setMensaje('No se pudieron cargar los servicios.');
      }
    };

    loadServices();
  }, []);

  const handleAdvance = async () => {
    if (!selectedServiceId) {
      setMensaje('Selecciona un servicio primero.');
      return;
    }

    setCargando(true);
    setMensaje('');

    try {
      const result = await turnService.AdvanceByService(selectedServiceId);

      if (result.message) {
        // mensaje del backend: no hay más turnos pendientes
        setCurrentTurn(null);
        setMensaje(result.message);
      } else {
        setCurrentTurn(result);
        setMensaje(`Turno actualizado. Ahora en atención: ${result.number}`);
      }
    } catch (error) {
      console.error(error);
      const msg =
        error.response?.data?.message || 'Error al avanzar el turno.';
      setMensaje(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h1 className="h4 mb-3">Gestión de turnos</h1>
        <p className="text-muted small">
          Selecciona un servicio y presiona <strong>Siguiente turno</strong> para
          marcar como atendido el actual y pasar al siguiente en cola.
        </p>

        <div className="mb-3">
          <label className="form-label">Servicio</label>
          <select
            className="form-select"
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
          >
            <option value="">-- Selecciona un servicio --</option>
            {services.map((s) => (
              <option key={s.idService} value={s.idService}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleAdvance}
          disabled={!selectedServiceId || cargando}
        >
          {cargando ? 'Procesando...' : 'Siguiente turno'}
        </button>

        {mensaje && (
          <div className="alert alert-info mt-3 mb-0">{mensaje}</div>
        )}

        {currentTurn && (
          <div className="mt-3">
            <h2 className="h5">Turno en atención</h2>
            <p className="mb-1">
              <strong>Número:</strong> {currentTurn.number}
            </p>
            <p className="mb-1">
              <strong>Cliente:</strong> {currentTurn.clientName}
            </p>
            <p className="mb-0">
              <strong>Servicio:</strong> {currentTurn.serviceName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// EMPLEADO / ADMIN – Consultar clientes
function EmployeeClientsView() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await clientService.GetAll();
        setClients(data || []);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los clientes.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h1 className="h4 mb-3">Consultar Cliente</h1>
        <p className="text-muted small">
          Aquí el empleado puede consultar los clientes que han tomado turnos.
        </p>

        {loading && <p className="text-muted small">Cargando clientes...</p>}
        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && clients.length === 0 && (
          <p className="text-muted small mb-0">
            Todavía no hay clientes registrados.
          </p>
        )}

        {!loading && !error && clients.length > 0 && (
          <div className="table-responsive mt-3">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.idClient}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          c.state?.toLowerCase() === 'activo'
                            ? 'bg-success'
                            : 'bg-secondary'
                        }`}
                      >
                        {c.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="App d-flex flex-column min-vh-100 bg-light">
      <Navbar />

      <main className="flex-grow-1">
        <div className="container py-4">
          <Routes>
            {/* Página principal: servicios desde la API */}
            <Route path="/" element={<HomeView />} />

            {/* Pantalla pública de turnos */}
            <Route path="/pantalla" element={<DisplayView />} />

            {/* Público */}
            <Route path="/login" element={<LoginView />} />
            <Route path="/recuperar" element={<RecoverView />} />

            {/* SOLO ADMIN — Registro de nuevos empleados/usuarios */}
            <Route
              path="/registro"
              element={
                <ProtectedRoute allowedRoles={['Administrador']}>
                  <RegisterView />
                </ProtectedRoute>
              }
            />

            {/* SOLO ADMIN — Gestión de usuarios */}
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute allowedRoles={['Administrador']}>
                  <UsersView />
                </ProtectedRoute>
              }
            />

            {/* SOLO ADMIN — Gestión de servicios */}
            <Route
              path="/admin/servicios"
              element={
                <ProtectedRoute allowedRoles={['Administrador']}>
                  <AdminServicesView />
                </ProtectedRoute>
              }
            />

            {/* EMPLEADO + ADMIN — Siguiente turno */}
            <Route
              path="/empleado/siguiente-turno"
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Empleado']}>
                  <EmployeeNextTurnView />
                </ProtectedRoute>
              }
            />

            {/* EMPLEADO + ADMIN — Consultar cliente */}
            <Route
              path="/empleado/clientes"
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Empleado']}>
                  <EmployeeClientsView />
                </ProtectedRoute>
              }
            />

            {/* Cualquier otra ruta → Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <footer className="bg-dark text-light py-3 mt-auto">
        <div className="container small text-center">
          &copy; {new Date().getFullYear()} Kairos - Sistema de Turnos
        </div>
      </footer>
    </div>
  );
}

export default App;
