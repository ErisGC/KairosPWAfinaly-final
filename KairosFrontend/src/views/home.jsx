// src/views/home.jsx
import { useEffect, useState } from 'react';
import { serviceService } from '../services/serviceService';
import { turnService } from '../services/turnService';
import { startConnection } from '../services/signalR';

function HomeView() {
  const [services, setServices] = useState([]);
  const [summaries, setSummaries] = useState({}); // { [idService]: summary }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Sesión superficial de cliente
  const [clientSession, setClientSession] = useState(() => {
    const stored = localStorage.getItem('kairos_client');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  // Turno pendiente del cliente por servicio
  const [clientTurns, setClientTurns] = useState({}); // { [idService]: TurnDTO | null }

  // Modal
  const [selectedService, setSelectedService] = useState(null);
  const [clientDocument, setClientDocument] = useState('');
  const [clientName, setClientName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Carga inicial + SignalR
  useEffect(() => {
    loadAllData();

    let connection;
    const connectSignalR = async () => {
      try {
        connection = await startConnection();
        connection.on('TurnUpdated', (payload) => {
          const serviceId = payload?.serviceId;
          if (serviceId) {
            refreshServiceData(serviceId);
          } else {
            loadAllData();
          }
        });
      } catch (err) {
        console.error('Error configurando SignalR en Home:', err);
      }
    };

    connectSignalR();

    return () => {
      if (connection) {
        connection.off('TurnUpdated');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSession?.document]);

  const loadAllData = async () => {
    setCargando(true);
    setError('');

    try {
      const data = await serviceService.GetAll();
      setServices(data || []);

      const summariesTemp = {};
      const clientTurnsTemp = {};

      for (const s of data) {
        const summary = await turnService.GetServiceSummary(s.idService);
        summariesTemp[s.idService] = summary;

        if (clientSession?.document) {
          const myTurn = await turnService.GetPublicStatus(
            clientSession.document,
            s.idService
          );
          clientTurnsTemp[s.idService] = myTurn;
        }
      }

      setSummaries(summariesTemp);
      if (clientSession?.document) {
        setClientTurns(clientTurnsTemp);
      } else {
        setClientTurns({});
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al cargar los servicios.');
    } finally {
      setCargando(false);
    }
  };

  const refreshServiceData = async (serviceId) => {
    try {
      const summary = await turnService.GetServiceSummary(serviceId);

      setSummaries((prev) => ({
        ...prev,
        [serviceId]: summary,
      }));

      if (clientSession?.document) {
        const myTurn = await turnService.GetPublicStatus(
          clientSession.document,
          serviceId
        );
        setClientTurns((prev) => ({
          ...prev,
          [serviceId]: myTurn,
        }));
      }
    } catch (err) {
      console.error('Error refrescando datos del servicio:', err);
    }
  };

  const handleOpenTurnModal = (service) => {
    setSelectedService(service);
    setMessage('');

    if (clientSession) {
      setClientDocument(clientSession.document);
      setClientName(clientSession.name);
    } else {
      setClientDocument('');
      setClientName('');
    }
  };

  const handleCreateTurn = async (e) => {
    e.preventDefault();
    if (!selectedService) return;

    setSending(true);
    setMessage('');

    const finalDocument = clientSession?.document ?? clientDocument;
    const finalName = clientSession?.name ?? clientName;

    try {
      const dto = {
        clientDocument: finalDocument,
        clientName: finalName,
        serviceId: selectedService.idService,
      };

      const created = await turnService.CreatePublic(dto);

      // Si no había sesión de cliente, la creamos
      if (!clientSession) {
        const newSession = {
          document: finalDocument,
          name: finalName,
        };
        setClientSession(newSession);
        localStorage.setItem('kairos_client', JSON.stringify(newSession));
      }

      setClientTurns((prev) => ({
        ...prev,
        [selectedService.idService]: created,
      }));

      await refreshServiceData(selectedService.idService);

      setMessage(
        `Tu turno es el número ${created.number} para ${selectedService.name}.`
      );
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || 'No se pudo crear el turno.';
      setMessage(msg);
    } finally {
      setSending(false);
    }
  };

  const handleCancelTurn = async (service) => {
    if (!clientSession) return;

    const confirm = window.confirm(
      `¿Seguro que deseas cancelar tu turno para "${service.name}"?`
    );
    if (!confirm) return;

    try {
      await turnService.CancelPublic({
        clientDocument: clientSession.document,
        serviceId: service.idService,
      });

      setClientTurns((prev) => ({
        ...prev,
        [service.idService]: null,
      }));

      await refreshServiceData(service.idService);
    } catch (err) {
      console.error(err);
      alert('No se pudo cancelar el turno. Inténtalo de nuevo.');
    }
  };

  const handleClientLogout = () => {
    setClientSession(null);
    setClientTurns({});
    localStorage.removeItem('kairos_client');
  };

  if (cargando) return <p>Cargando servicios...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Servicios disponibles</h1>

        {clientSession && (
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">
              Sesión cliente:{' '}
              <strong>{clientSession.name}</strong> ({clientSession.document})
            </span>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={handleClientLogout}
            >
              Cerrar sesión cliente
            </button>
          </div>
        )}
      </div>

      <div className="row g-3">
        {services.map((servicio) => {
          const summary = summaries[servicio.idService];
          const myTurn = clientTurns[servicio.idService];

          const hasMyTurn = !!myTurn;

          return (
            <div className="col-md-4" key={servicio.idService}>
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{servicio.name}</h5>
                  <p className="card-text flex-grow-1">
                    {servicio.description || 'Sin descripción.'}
                  </p>

                  {summary && (
                    <div className="mb-2 small">
                      <div>
                        Turno actual:{' '}
                        <strong>{summary.currentNumber ?? '—'}</strong>
                      </div>
                      <div>
                        Último turno entregado:{' '}
                        <strong>{summary.lastNumber}</strong>
                      </div>
                      <div>
                        Personas en cola:{' '}
                        <strong>{summary.pendingCount}</strong>
                      </div>
                    </div>
                  )}

                  {hasMyTurn && (
                    <div className="alert alert-info py-2 small mb-2">
                      Tu turno para este servicio es el{' '}
                      <strong>{myTurn.number}</strong>.
                    </div>
                  )}

                  <button
                    className={`btn ${
                      hasMyTurn ? 'btn-outline-danger' : 'btn-primary'
                    } mt-auto`}
                    type="button"
                    onClick={() =>
                      hasMyTurn
                        ? handleCancelTurn(servicio)
                        : handleOpenTurnModal(servicio)
                    }
                  >
                    {hasMyTurn
                      ? `Cancelar turno (${myTurn.number})`
                      : `Tomar turno${
                          summary ? ` (último: ${summary.lastNumber})` : ''
                        }`}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedService && (
        <div className="modal-backdrop-custom">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleCreateTurn}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    Tomar turno - {selectedService.name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedService(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <div className="alert alert-light border small mb-0">
                      <div className="fw-semibold mb-1">
                        Servicio seleccionado
                      </div>
                      <div>{selectedService.name}</div>
                    </div>
                  </div>

                  {clientSession ? (
                    <div className="mb-3">
                      <label className="form-label">Cliente</label>
                      <div className="p-2 rounded border bg-light">
                        <div className="small text-muted mb-1">
                          Usando la sesión actual:
                        </div>
                        <div className="fw-semibold">{clientSession.name}</div>
                        <div className="small text-muted">
                          Documento: {clientSession.document}
                        </div>
                      </div>
                      <div className="form-text">
                        Si no eres tú, puedes cerrar la sesión cliente desde la
                        parte superior de la página.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Identificación</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientDocument}
                          onChange={(e) => setClientDocument(e.target.value)}
                          required
                          placeholder="Ej: 1067xxxxxx"
                        />
                        <div className="form-text">
                          Se usará para identificarte en futuras visitas.
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Nombre completo</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          required
                          placeholder="Tu nombre y apellidos"
                        />
                      </div>
                    </>
                  )}

                  {message && (
                    <div className="alert alert-info py-2">{message}</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedService(null)}
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sending}
                  >
                    {sending ? 'Creando turno...' : 'Confirmar turno'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HomeView;
