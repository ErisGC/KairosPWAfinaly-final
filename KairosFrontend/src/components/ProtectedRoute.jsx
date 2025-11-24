import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';


function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return null; // podrías poner un spinner bonito aquí

  // No logueado → al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay restricción por roles y el rol del usuario no está permitido
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role) // user.role debe venir del backend: "Administrador" o "Empleado"
  ) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
