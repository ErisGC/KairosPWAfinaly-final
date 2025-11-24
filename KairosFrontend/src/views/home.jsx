// src/views/home.jsx
import React, { useEffect, useState } from "react";
import { serviceService } from "../services/serviceService";
import { turnService } from "../services/turnService";
import { startConnection } from "../services/signalR";

function HomeView() {
  const [services, setServices] = useState([]);
  const [summaries, setSummaries] = useState({}); // { [idService]: { currentNumber, lastNumber, pendingCount } }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [selectedService, setSelectedService] = useState(null);
  const [clientDocument, setClientDocument] = useState("");
  const [clientName, setClientName] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setError("");
    setCargando(true);

    try {
      const data = await serviceService.GetAll();
      setServices(data);

      // cargar summary para cada servicio
      const summariesTemp = {};
      for (const s of data) {
        const summary = await turnService.GetServiceSummary(s.idService);
        summariesTemp[s.idService] = summary;
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

  // Suscribirse a SignalR para actualizaciones en tiempo real
  useEffect(() => {
    let connection;
    let isMounted = true;

    const setupSignalR = async () => {
      try {
        connection = await startConnection();

        // Cuando el backend emite "TurnUpdated", recibimos el serviceId
        connection.on("TurnUpdated", async (payload) => {
          if (!isMounted) return;

          const serviceId = payload?.serviceId;
          if (!serviceId) return;

          try {
            const summary = await turnService.GetServiceSummary(serviceId);
            setSummaries((prev) => ({
              ...prev,
              [serviceId]: summary,
            }));
          } catch (err) {
            console.error("Error actualizando resumen vía SignalR:", err);
          }
        });
      } catch (err) {
        console.error("Error iniciando conexión SignalR:", err);
      }
    };

    setupSignalR();

    return () => {
      isMounted = false;
      if (connection) {
        connection.off("TurnUpdated");
        // No necesariamente cerramos la conexión global aquí, solo removemos el handler
      }
    };
  }, []);

  const handleOpenTurnModal = (service) => {
    setSelectedService(service);
    setClientDocument("");
    setClientName("");
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

      // refrescar resumen del servicio (por si acaso, además de SignalR)
      const summary = await turnService.GetServiceSummary(
        selectedService.idService
      );
      setSummaries((prev) => ({
        ...prev,
        [selectedService.idService]: summary,
      }));
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "No se pudo crear el turno.";
      setMessage(msg);
    }
  };

  if (cargando) return <p>Cargando servicios...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <>
      <h1 className="mb-4">Servicios disponibles</h1>

      <div className="row g-3">
        {services.map((servicio) => {
          const summary = summaries[servicio.idService];

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
                    className="btn btn-primary mt-auto"
                    onClick={() => handleOpenTurnModal(servicio)}
                  >
                    Tomar turno
                    {summary && ` (último: ${summary.lastNumber})`}
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
