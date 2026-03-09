import numpy as np  # type: ignore

class SatelliteKalman:
    """
    Upgraded to an Extended Kalman Filter (EKF) for non-linear orbital mechanics.
    This replaces the naive linear model with actual physics (RK4 integration of gravity).
    """
    def __init__(self, initial_state):
        # State vector [x, y, z, vx, vy, vz] in Earth-Centered Inertial (ECI) coordinates
        self.state = np.array(initial_state, dtype=float).reshape(6, 1)
        self.dt = 1.0  # Time step (1 second)
        
        # Earth's standard gravitational parameter (m^3/s^2)
        # We scale units to km and seconds: mu = 3.986004418e5 km^3/s^2
        # Assuming input is in km and km/s.
        self.mu = 3.986004418e5 
        
        # Uncertainty and Noise
        self.P = np.eye(6) * 1000.0   # Initial High Uncertainty (Confidence)
        self.Q = np.eye(6) * 0.1      # Process noise (perturbations)
        self.R = np.eye(6) * 5.0      # Measurement noise (from SGP4/Sensors)

    def _state_transition(self, state):
        """ Non-linear orbital mechanics state transition using RK4 integration """
        def derivatives(s):
            r = s[0:3]
            v = s[3:6]
            r_norm = np.linalg.norm(r)
            if r_norm == 0:
                return np.zeros((6, 1))
            # Gravity vector: a = -mu * r / r^3
            a = -self.mu * r / (r_norm**3)
            return np.vstack((v, a))
            
        k1 = derivatives(state)
        k2 = derivatives(state + 0.5 * self.dt * k1)
        k3 = derivatives(state + 0.5 * self.dt * k2)
        k4 = derivatives(state + self.dt * k3)
        
        # Next state prediction
        return state + (self.dt / 6.0) * (k1 + 2*k2 + 2*k3 + k4)

    def _jacobian(self, state):
        """ Jacobian matrix evaluated at current state for the EKF """
        r = state[0:3]
        x, y, z = r.flatten()
        r_norm = np.linalg.norm(r)
        if r_norm == 0:
            return np.eye(6)
            
        r2 = r_norm**2
        r5 = r_norm**5
        
        mu = self.mu
        
        # Partial derivatives of acceleration wrt position
        df_dr = np.zeros((3, 3))
        df_dr[0, 0] = -mu * (r2 - 3*x**2) / r5
        df_dr[0, 1] = mu * 3*x*y / r5
        df_dr[0, 2] = mu * 3*x*z / r5
        
        df_dr[1, 0] = mu * 3*y*x / r5
        df_dr[1, 1] = -mu * (r2 - 3*y**2) / r5
        df_dr[1, 2] = mu * 3*y*z / r5
        
        df_dr[2, 0] = mu * 3*z*x / r5
        df_dr[2, 1] = mu * 3*z*y / r5
        df_dr[2, 2] = -mu * (r2 - 3*z**2) / r5
        
        # Construct full 6x6 Jacobian
        F = np.eye(6)
        F[0:3, 3:6] = np.eye(3) * self.dt
        F[3:6, 0:3] = df_dr * self.dt
        return F

    def filter(self, measurement):
        z = np.array(measurement, dtype=float).reshape(6, 1)
        
        # 1. Prediction Step (Non-linear state, Linearized covariance)
        x_pred = self._state_transition(self.state)
        F = self._jacobian(self.state)
        P_pred = (F @ self.P @ F.T) + self.Q
        
        # 2. Update Step (Correction)
        # Identity observation model matrix H since we observe [x,y,z,vx,vy,vz]
        H = np.eye(6)
        S = (H @ P_pred @ H.T) + self.R
        K = P_pred @ H.T @ np.linalg.inv(S) # Kalman Gain
        
        self.state = x_pred + K @ (z - H @ x_pred)
        self.P = (np.eye(6) - K @ H) @ P_pred
        
        return self.state.flatten().tolist()