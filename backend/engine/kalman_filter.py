import numpy as np

class SatelliteKalman:
    def __init__(self, initial_state):
        # State vector [x, y, z, vx, vy, vz]
        self.state = np.array(initial_state).reshape(6, 1)
        self.dt = 1.0  # Time step (1 second)
        
        # Transition Matrix (Physics model: x = x + vt)
        self.A = np.eye(6)
        self.A[0, 3] = self.dt
        self.A[1, 4] = self.dt
        self.A[2, 5] = self.dt
        
        # Uncertainty and Noise
        self.P = np.eye(6) * 500   # Confidence
        self.Q = np.eye(6) * 0.1   # Process noise
        self.R = np.eye(6) * 5.0   # Measurement noise (from SGP4)

    def filter(self, measurement):
        z = np.array(measurement).reshape(6, 1)
        
        # 1. Prediction Step
        x_pred = self.A @ self.state
        P_pred = (self.A @ self.P @ self.A.T) + self.Q
        
        # 2. Update Step (Correction)
        S = P_pred + self.R
        K = P_pred @ np.linalg.inv(S) # Kalman Gain
        
        self.state = x_pred + K @ (z - x_pred)
        self.P = (np.eye(6) - K) @ P_pred
        
        return self.state.flatten().tolist()