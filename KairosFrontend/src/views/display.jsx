// src/views/display.jsx
import { useEffect, useState } from 'react';
import { turnService } from '../services/turnService';
import { startConnection } from '../services/signalR';

function DisplayView() {
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTurns = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await turnService.GetRecentCalled(20);
      setTurns(data || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los turnos llamados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTurns();

    let connection;
    const connectSignalR = async () => {
      try {
        connection = await startConnection();
        connection.on('TurnUpdated', () => {
          loadTurns();
        });
      } catch (err) {
        console.error('Error configurando SignalR en Pantalla:', err);
      }
    };

    connectSignalR();

    return () => {
      if (connection) {
        connection.off('TurnUpdated');
      }
    };
  }, []);

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h1 className="h4 mb-3 text-center">Turnos en pantalla</h1>
        <p className="text-muted small text-center mb-4">
          Se muestran los últimos turnos <strong>llamados</strong> por los
          empleados.
        </p>

        {loading && (
          <p className="text-center text-muted">Cargando turnos...</p>
        )}
        {error && <p className="text-center text-danger small">{error}</p>}

        <div className="list-group list-group-flush">
          {turns.map((t) => (
            <div
              key={t.idTurn}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                <div className="fs-3 fw-bold mb-1">Turno {t.number}</div>
                <div className="small">
                  Servicio: <strong>{t.serviceName}</strong> · Cliente:{' '}
                  <strong>{t.clientName}</strong>
                </div>
              </div>
              <span className="badge rounded-pill bg-primary px-3 py-2">
                Llamando
              </span>
            </div>
          ))}

          {!loading && turns.length === 0 && (
            <p className="text-center text-muted mb-0 small">
              Todavía no se ha llamado ningún turno.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DisplayView;
