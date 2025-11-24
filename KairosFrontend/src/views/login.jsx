import LoginForm from '../components/loginForm';

function LoginView() {
  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 text-center mb-3">Iniciar sesión</h1>
            <p className="text-muted small text-center mb-4">
              Ingresa tus credenciales para gestionar tus turnos en Kairos.
            </p>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginView;
