import { useEffect, useState } from "react";
import { serviceService } from "../services/serviceService";

function AdminServicesView() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    state: "Activo",
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarServicios = async () => {
    setCargando(true);
    setError("");
    try {
      const data = await serviceService.GetAll();
      setServices(data || []);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los servicios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarServicios();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!form.name.trim()) {
      setError("El nombre del servicio es obligatorio.");
      return;
    }
    if (!form.state.trim()) {
      setError("El estado del servicio es obligatorio.");
      return;
    }

    setGuardando(true);
    try {
      const nuevo = await serviceService.Create({
        name: form.name,
        description: form.description,
        state: form.state,
      });

      setMensaje(`Servicio "${nuevo.name}" creado correctamente.`);
      setForm({ name: "", description: "", state: "Activo" });
      await cargarServicios();
    } catch (err) {
      console.error(err);
      setError("Error al crear el servicio. Revisa el backend o la conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este servicio?")) return;
    setError("");
    setMensaje("");

    try {
      await serviceService.Delete(id);
      setMensaje("Servicio eliminado correctamente.");
      await cargarServicios();
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el servicio.");
    }
  };

  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h5 mb-3">Crear servicio</h1>

            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                {error}
              </div>
            )}
            {mensaje && (
              <div className="alert alert-success py-2 small" role="alert">
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  Nombre del servicio <span className="text-danger">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  rows="3"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label htmlFor="state" className="form-label">
                  Estado <span className="text-danger">*</span>
                </label>
                <select
                  id="state"
                  name="state"
                  className="form-select"
                  value={form.state}
                  onChange={handleChange}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar servicio"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col-lg-7">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 className="h5 mb-0">Servicios registrados</h2>
                <small className="text-muted">
                  Administrador puede crear y eliminar servicios.
                </small>
              </div>
            </div>

            {cargando ? (
              <p className="text-muted small">Cargando servicios...</p>
            ) : services.length === 0 ? (
              <p className="text-muted small mb-0">
                No hay servicios registrados.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Estado</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.idService}>
                        <td>{s.name}</td>
                        <td className="small text-muted">
                          {s.description || "Sin descripción"}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              s.state?.toLowerCase() === "activo"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {s.state}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-danger btn-sm"
                            type="button"
                            onClick={() => handleDelete(s.idService)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminServicesView;
