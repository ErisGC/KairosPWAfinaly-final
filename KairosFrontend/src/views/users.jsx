function UsersView() {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="h4 mb-0">Gestión de usuarios</h1>
            <small className="text-muted">
              Listado de usuarios registrados en el sistema.
            </small>
          </div>
          <button className="btn btn-primary btn-sm">
            + Nuevo usuario
          </button>
        </div>

        {/* Próximo paso: hacer tabla con Bootstrap y consumo de userService.GetAll */}
        <div className="alert alert-info small mb-0" role="alert">
          Pendiente: implementar tabla con usuarios desde el backend.
        </div>
      </div>
    </div>
  );
}

export default UsersView;
