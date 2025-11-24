// src/components/loginForm.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userService } from '../services/userService';
import { useAuth } from '../context/useAuth';

function LoginForm() {
  const [credenciales, setCredenciales] = useState({
    user: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredenciales((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const data = await userService.Login(credenciales);
      login(data);

      const role = data?.user?.role;

      if (role === 'Administrador') {
        navigate('/admin/usuarios', { replace: true });
      } else if (role === 'Empleado') {
        navigate('/empleado/siguiente-turno', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos.');
      } else {
        setError('Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-0">
      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="user" className="form-label">
          Usuario
        </label>
        <input
          type="text"
          id="user"
          name="user"
          className="form-control"
          placeholder="Ingresa tu usuario"
          value={credenciales.user}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-1">
        <label htmlFor="password" className="form-label">
          Contraseña
        </label>
        <input
          type="password"
          id="password"
          name="password"
          className="form-control"
          placeholder="••••••••"
          value={credenciales.password}
          onChange={handleChange}
          required
        />
      </div>

      {/* Solo se muestra cuando hay error de login */}
      {error && (
        <div className="mb-3 mt-1">
          <small className="text-muted">
            ¿Olvidó sus credenciales?{' '}
            <Link to="/recuperar" className="link-primary">
              Pulse aquí
            </Link>
          </small>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={cargando}
      >
        {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>

      {/* Siempre visible */}
      <div className="mt-3 text-center">
        <small className="text-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="link-primary">
            Regístrate aquí
          </Link>
        </small>
      </div>
    </form>
  );
}

export default LoginForm;
