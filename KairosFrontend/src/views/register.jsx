import RegisterForm from '../components/registerForm';

function RegisterView() {
  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 mb-3 text-center">Registro de usuario</h1>
            <p className="text-muted small text-center mb-4">
              Crea un usuario Administrador o Empleado. 
              Luego podrás iniciar sesión con el mismo nombre y contraseña.
            </p>

            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterView;
