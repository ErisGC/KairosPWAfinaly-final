import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/userService';

function UsersView() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState([]); // UserServiceTurnCounterDTO[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [usersData, statsData] = await Promise.all([
          userService.GetAll(),
          userService.GetTurnStats(),
        ]);

        setUsers(usersData || []);
        setStats(statsData || []);
      } catch (err) {
        console.error(err);
        setError(
          'No se pudieron cargar los usuarios o sus informes. Revisa el backend o tus permisos.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Agrupar estadísticas por usuario
  const turnsByUser = useMemo(() => {
    const result = {};

    for (const s of stats) {
      if (!result[s.userId]) {
        result[s.userId] = {
          total: 0,
          services: {},
        };
      }

      result[s.userId].total += s.contTurns;

      if (!result[s.userId].services[s.serviceId]) {
        result[s.userId].services[s.serviceId] = {
          serviceName: s.serviceName,
          count: 0,
        };
      }

      result[s.userId].services[s.serviceId].count += s.contTurns;
    }

    return result;
  }, [stats]);

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        {/* Encabezado */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="h4 mb-0">Gestión de usuarios</h1>
            <small className="text-muted">
              Listado de usuarios registrados y resumen de turnos atendidos.
            </small>
          </div>

          <Link to="/registro" className="btn btn-primary btn-sm">
            + Nuevo usuario
          </Link>
        </div>

        {/* Mensajes de estado */}
        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted small mb-0">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="text-muted small mb-0">
            No hay usuarios registrados aún.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th style={{ minWidth: 130 }}>Turnos atendidos</th>
                  <th>Detalle por servicio</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const userStats = turnsByUser[u.idUser];

                  return (
                    <tr key={u.idUser}>
                      <td>
                        <div className="fw-semibold">{u.name}</div>
                        <div className="small text-muted">
                          ID: {u.idUser}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {u.rolName || '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.state?.toLowerCase() === 'activo'
                              ? 'bg-success'
                              : 'bg-secondary'
                          }`}
                        >
                          {u.state}
                        </span>
                      </td>
                      <td>
                        {userStats ? (
                          <strong>{userStats.total}</strong>
                        ) : (
                          <span className="text-muted small">Sin registros</span>
                        )}
                      </td>
                      <td>
                        {userStats ? (
                          <ul className="mb-0 small text-muted">
                            {Object.values(userStats.services).map(
                              (s, index) => (
                                <li key={index}>
                                  {s.serviceName}: <strong>{s.count}</strong>
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <span className="text-muted small">
                            Aún no ha gestionado turnos.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UsersView;
