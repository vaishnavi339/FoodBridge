import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ========== Synthetic Data Generator (Fallback) ==========
def generate_training_data(n=2000):
    np.random.seed(42)
    food_types = ['cooked', 'raw', 'packaged', 'bakery', 'dairy', 'fruits_vegetables', 'beverages', 'mixed']
    areas = ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'Dwarka', 'Rohini', 'Saket', 'Connaught Place', 'Chandni Chowk']
    
    data = []
    for _ in range(n):
        food_type = np.random.choice(food_types)
        area = np.random.choice(areas)
        day = np.random.choice(range(7))
        hour = np.random.choice(range(24))
        temp = np.random.uniform(15, 45)
        base_demand = np.random.randint(1, 20)
        
        # Simple logical patterns for the model to pick up
        if day in [5, 6]: base_demand += 5
        if food_type == 'cooked' and hour in [12, 13, 19, 20]: base_demand += 10
        
        demand_level = 'low' if base_demand < 8 else ('medium' if base_demand < 15 else 'high')
        spoil_risk = 1 if (food_type in ['dairy', 'cooked'] and temp > 30) else 0
        
        data.append({
            'food_type': food_type, 'area': area, 'day_of_week': day, 
            'hour': hour, 'temperature': round(temp, 1), 
            'demand_level': demand_level, 'spoilage_risk': spoil_risk
        })
    return pd.DataFrame(data)

# ========== Production Model Class ==========
class FoodAI:
    def __init__(self):
        self.demand_model = None
        self.spoilage_model = None
        self.ft_enc = LabelEncoder()
        self.ar_enc = LabelEncoder()
        self.de_enc = LabelEncoder()
        self.is_trained = False

    def train_or_load(self):
        """Logic to load a model file or train on the fly"""
        model_path = 'model.joblib'
        if os.path.exists(model_path):
            logger.info("Loading pre-trained model from disk...")
            data = joblib.load(model_path)
            self.__dict__.update(data)
        else:
            logger.warning("No model file found. Commencing auto-training...")
            df = generate_training_data(3000)
            df['ft'] = self.ft_enc.fit_transform(df['food_type'])
            df['ar'] = self.ar_enc.fit_transform(df['area'])
            df['de'] = self.de_enc.fit_transform(df['demand_level'])
            
            X = df[['ft', 'ar', 'day_of_week', 'hour', 'temperature']]
            
            self.demand_model = RandomForestClassifier(n_estimators=100, max_depth=10).fit(X, df['de'])
            self.spoilage_model = GradientBoostingRegressor(n_estimators=50).fit(X, df['spoilage_risk'])
            self.is_trained = True
            logger.info("Models trained and ready.")

    def predict(self, input_data):
        """Unified prediction logic"""
        try:
            food_type = input_data.get('food_type', 'cooked')
            area = input_data.get('area', 'Central Delhi')
            day = input_data.get('day_of_week', datetime.now().weekday())
            hour = input_data.get('hour', datetime.now().hour)
            temp = input_data.get('temperature', 30.0)
            hrs_to_exp = input_data.get('hours_to_expiry', 12)

            # Encoding handles unknown categories gracefully
            f_enc = self.ft_enc.transform([food_type])[0] if food_type in self.ft_enc.classes_ else 0
            a_enc = self.ar_enc.transform([area])[0] if area in self.ar_enc.classes_ else 0
            
            X = np.array([[f_enc, a_enc, day, hour, temp]])
            
            # Demand Prediction
            d_pred = self.demand_model.predict(X)[0]
            d_level = self.de_enc.inverse_transform([d_pred])[0]
            d_proba = max(self.demand_model.predict_proba(X)[0])
            
            # Spoilage & Urgency Logic
            spoil_score = float(self.spoilage_model.predict(X)[0])
            urgency = (100 - (hrs_to_exp * 5)) * (1.2 if spoil_score > 0.5 else 1.0)
            urgency = min(100, max(0, urgency))

            return {
                "demand": {"level": d_level, "confidence": round(d_proba, 2)},
                "urgency": {"score": round(urgency, 2), "label": "Critical" if urgency > 80 else "Regular"},
                "spoilage_risk": "High" if spoil_score > 0.6 else "Low",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise e

# ========== API Routes ==========
brain = FoodAI()
brain.train_or_load()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ready", "trained": brain.is_trained})

@app.route('/predict', methods=['POST'])
def predict():
    """Main REST endpoint for model predictions"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400
        
        result = brain.predict(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Prediction failed", "details": str(e)}), 500

if __name__ == '__main__':
    # Used only for local development. Render uses Gunicorn.
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))

@app.route('/')
def home():
    return jsonify({
        "message": "FoodBridge API is running 🚀",
        "routes": {
            "/health": "Check server status",
            "/predict": "POST request for prediction"
        }
    })
