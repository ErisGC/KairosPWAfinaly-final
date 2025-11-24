// src/components/registerForm.jsx
import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { rolService } from '../services/rolService';

function RegisterForm() {
  const [form, setForm] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    rolId: '',
  });

  const [roles, setRoles] = useState([]);
  const [cargandoRoles, setCargandoRoles] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  // Cargar roles al montar el componente
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await rolService.GetAll();
        setRoles(data || []);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los roles. Verifica que el backend esté levantado y que estés logueado como Administrador.');
      } finally {
        setCargandoRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    // Validaciones básicas en front
    if (!form.name.trim()) {
      setError('El nombre de usuario es obligatorio.');
      return;
    }

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!form.rolId) {
      setError('Debes seleccionar un rol.');
      return;
    }

    setCargando(true);

    try {
      // El back espera: { name, password, state, rolId }
      const newUser = await userService.Create({
        name: form.name,
        password: form.password,
        state: 'Activo',
        rolId: Number(form.rolId),
      });

      setExito(
        `Usuario "${newUser.name}" registrado correctamente. Ya puedes iniciar sesión con ese usuario y contraseña.`
      );

      // Dejamos el nombre y el rol por si quiere registrar más,
      // y limpiamos solo las contraseñas.
      setForm((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));
    } catch (err) {
      console.error(err);

      // Si el backend envía { message: "..." }
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      }
      // Si el backend envía errores de validación (ModelState)
      else if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        // Unir todos los mensajes en un solo string
        const mensajes = Object.values(errors)
          .flat()
          .join(' ');
        setError(mensajes || 'Error de validación en el servidor.');
      } else {
        setError('Error al registrar el usuario. Revisa el backend o la conexión.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      {exito && (
        <div className="alert alert-success py-2 small" role="alert">
          {exito}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="name" className="form-label">
          Nombre de usuario <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          className="form-control"
          placeholder="Ej: empleado1, admin2, etc."
          value={form.name}
          onChange={handleChange}
          required
        />
        <div className="form-text">
          Este será el nombre que usarás en la pantalla de <strong>Login</strong>.
          <br />
          Recuerda que el usuario <code>admin</code> ya existe generado automáticamente.
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="password" className="form-label">
          Contraseña <span className="text-danger">*</span>
        </label>
        <input
          type="password"
          id="password"
          name="password"
          className="form-control"
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="confirmPassword" className="form-label">
          Confirmar contraseña <span className="text-danger">*</span>
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          className="form-control"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="rolId" className="form-label">
          Rol <span className="text-danger">*</span>
        </label>
        <select
          id="rolId"
          name="rolId"
          className="form-select"
          value={form.rolId}
          onChange={handleChange}
          disabled={cargandoRoles}
          required
        >
          <option value="">Selecciona un rol...</option>
          {roles.map((r) => (
            <option key={r.idRol} value={r.idRol}>
              {r.name}
            </option>
          ))}
        </select>
        {cargandoRoles && (
          <div className="form-text">Cargando roles...</div>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={cargando}
      >
        {cargando ? 'Registrando...' : 'Registrar usuario'}
      </button>
    </form>
  );
}

export default RegisterForm;
