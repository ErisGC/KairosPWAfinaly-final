// src/views/home.jsx
import React, { useEffect, useRef, useState } from "react";
import { serviceService } from "../services/serviceService";
import { turnService } from "../services/turnService";
import { startConnection, getConnection } from "../services/signalR";

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880; // tono agudo

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.7);
  } catch (e) {
    console.warn("No se pudo reproducir el sonido de notificación", e);
  }
}

function HomeView() {
  const [services, setServices] = useState([]);
  const [summaries, setSummaries] = useState({}); // { [idService]: {currentNumber, lastNumber, pendingCount} }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [selectedService, setSelectedService] = useState(null);
  const [clientDocument, setClientDocument] = useState("");
  const [clientName, setClientName] = useState("");
  const [message, setMessage] = useState("");

  const [clientSession, setClientSession] = useState(() => {
    try {
      const stored = localStorage.getItem("kairos_client_session");
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  const clientSessionRef = useRef(clientSession);
  useEffect(() => {
    clientSessionRef.current = clientSession;
  }, [clientSession]);

  const loadData = async () => {
    setError("");
    setCargando(true);

    try {
      const data = await serviceService.GetAll();
      setServices(data);

      // cargar summary para cada servicio
      const summariesTemp = {};
      for (const s of data) {
        try {
          const summary = await turnService.GetServiceSummary(s.idService);
          summariesTemp[s.idService] = summary;
        } catch (err) {
          console.error("Error cargando summary de servicio", s.idService, err);
        }
      }
      setSummaries(summariesTemp);
    } catch (error) {
      console.error(error);
      setError("Ocurrió un error al cargar los servicios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Conexión SignalR para actualizar cola y avisar cuando llega tu turno
  useEffect(() => {
    let isMounted = true;

    const setupSignalR = async () => {
      try {
        const conn = await startConnection();
        if (!isMounted) return;

        conn.on("TurnUpdated", async (payload) => {
          const serviceId = payload?.serviceId;
          if (!serviceId) return;

          try {
            const summary = await turnService.GetServiceSummary(serviceId);
            setSummaries((prev) => ({
              ...prev,
              [serviceId]: summary,
            }));

            const session = clientSessionRef.current;
            if (
              session &&
              session.serviceId === serviceId &&
              summary.currentNumber === session.turnNumber
            ) {
              playNotificationSound();
              alert(
                `¡Es tu turno!\nTurno ${session.turnNumber} para el servicio "${session.serviceName}".`
              );
            }
          } catch (err) {
            console.error("Error actualizando summary tras TurnUpdated:", err);
          }
        });
      } catch (err) {
        console.error("Error al conectar con SignalR:", err);
      }
    };

    setupSignalR();

    return () => {
      isMounted = false;
      const conn = getConnection();
      if (conn) {
        conn.off("TurnUpdated");
      }
    };
  }, []);

  const handleOpenTurnModal = (service) => {
    setSelectedService(service);
    setClientDocument(clientSession?.document || "");
    setClientName(clientSession?.name || "");
    setMessage("");
  };

  const handleCreateTurn = async (e) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      const dto = {
        clientDocument,
        clientName,
        serviceId: selectedService.idService,
      };

      const created = await turnService.CreatePublic(dto);
      setMessage(
        `Tu turno es el número ${created.number} para ${selectedService.name}.`
      );

      const session = {
        document: clientDocument,
        name: clientName,
        serviceId: selectedService.idService,
        serviceName: selectedService.name,
        turnNumber: created.number,
      };
      setClientSession(session);
      localStorage.setItem("kairos_client_session", JSON.stringify(session));

      // refrescar resumen del servicio
      const summary = await turnService.GetServiceSummary(
        selectedService.idService
      );
      setSummaries((prev) => ({
        ...prev,
        [selectedService.idService]: summary,
      }));
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || "No se pudo crear el turno.";
      setMessage(msg);

      // Si ya tenía turno pendiente, intentar recuperar info y "loguearlo"
      if (
        err.response?.data?.message &&
        err.response.data.message.includes(
          "Ya tienes un turno pendiente para este servicio."
        )
      ) {
        try {
          const existing = await turnService.GetClientPendingTurn(
            clientDocument,
            selectedService.idService
          );
          if (existing) {
            const session = {
              document: clientDocument,
              name: clientName,
              serviceId: selectedService.idService,
              serviceName: selectedService.name,
              turnNumber: existing.number,
            };
            setClientSession(session);
            localStorage.setItem(
              "kairos_client_session",
              JSON.stringify(session)
            );
          }
        } catch (e2) {
          console.error(
            "Error obteniendo turno pendiente del cliente:",
            e2
          );
        }
      }
    }
  };

  const handleCancelTurn = async (service) => {
    if (!clientSession || clientSession.serviceId !== service.idService) return;

    const confirmed = window.confirm(
      "¿Seguro que deseas cancelar tu turno? Perderás tu lugar en la cola."
    );
    if (!confirmed) return;

    try {
      await turnService.CancelPublic({
        clientDocument: clientSession.document,
        serviceId: clientSession.serviceId,
      });

      setClientSession(null);
      localStorage.removeItem("kairos_client_session");
      setMessage("");

      const summary = await turnService.GetServiceSummary(service.idService);
      setSummaries((prev) => ({
        ...prev,
        [service.idService]: summary,
      }));
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || "No se pudo cancelar el turno.";
      setMessage(msg);
    }
  };

  if (cargando) return <p>Cargando servicios...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <>
      <h1 className="mb-4">Servicios disponibles</h1>

      {clientSession && (
        <div className="alert alert-warning small">
          Tienes un turno pendiente:&nbsp;
          <strong>
            {clientSession.turnNumber} - {clientSession.serviceName}
          </strong>{" "}
          para el documento <strong>{clientSession.document}</strong>. Mantén
          esta página abierta para recibir la alerta cuando llegue tu turno.
        </div>
      )}

      <div className="row g-3">
        {services.map((servicio) => {
          const summary = summaries[servicio.idService];
          const isClientInThisService =
            clientSession && clientSession.serviceId === servicio.idService;

          return (
            <div className="col-md-4" key={servicio.idService}>
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{servicio.name}</h5>
                  <p className="card-text flex-grow-1">
                    {servicio.description || "Sin descripción."}
                  </p>

                  {summary && (
                    <div className="mb-2 small">
                      <div>
                        Turno actual:{" "}
                        <strong>{summary.currentNumber ?? "—"}</strong>
                      </div>
                      <div>
                        Último turno entregado:{" "}
                        <strong>{summary.lastNumber}</strong>
                      </div>
                      <div>
                        Personas en cola:{" "}
                        <strong>{summary.pendingCount}</strong>
                      </div>
                    </div>
                  )}

                  <button
                    className={`btn ${
                      isClientInThisService ? "btn-danger" : "btn-primary"
                    } mt-auto`}
                    onClick={() =>
                      isClientInThisService
                        ? handleCancelTurn(servicio)
                        : handleOpenTurnModal(servicio)
                    }
                  >
                    {isClientInThisService
                      ? "Cancelar turno"
                      : `Tomar turno${
                          summary ? ` (último: ${summary.lastNumber})` : ""
                        }`}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal sencillo */}
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
                    <label className="form-label">Identificación</label>
                    <input
                      type="text"
                      className="form-control"
                      value={clientDocument}
                      onChange={(e) => setClientDocument(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nombre completo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                    />
                  </div>
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
                  <button type="submit" className="btn btn-primary">
                    Confirmar turno
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
