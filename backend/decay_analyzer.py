import math

class DecayAnalyzer:
    def __init__(self, debris_data):
        self.mass = debris_data['mass']
        self.diameter = debris_data['diameter']
        self.length = debris_data['length']
        self.history = debris_data['tle_history'] # 5-day data
        self.cd = 2.2 # Drag coefficient

    def get_area(self):
        # Cylindrical debris-ku cross-section area approx calculation
        radius = self.diameter / 2
        return math.pi * (radius ** 2)

    def calculate_bc(self):
        area = self.get_area()
        bc = self.mass / (self.cd * area)
        return round(bc, 2)

    def analyze_drag_from_eccentricity(self):
        """
        Logic: Eccentricity change track panrom.
        Eccentricity koraiyudhu-na atmospheric drag satellite-ah circularize
        panni keela thalludhu-nu artham.
        """
        if len(self.history) < 2: return 0
        
        e_start = self.history[0]['eccentricity']
        e_end = self.history[-1]['eccentricity']
        
        # Rate of change in eccentricity
        de_dt = (e_end - e_start) / 5 
        return de_dt