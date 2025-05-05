import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  console.log("ProtectedRoute - Auth state:", {
    isAuthenticated,
    userId: user?._id,
  });

  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== "admin") {
    console.log("Admin access required, redirecting to /dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("User authenticated, rendering protected content");
  return <>{children}</>;
};

export default ProtectedRoute;
