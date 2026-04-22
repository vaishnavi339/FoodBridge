"""
Smart Food Distribution — AI Prediction Model

Demand forecasting and urgency ranking using scikit-learn.
Endpoints:
  POST /predict/demand   — forecast food demand by area and food type
  POST /predict/urgency  — score listing urgency for priority handling
  GET  /health           — health check
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# ========== Synthetic Training Data ==========

def generate_training_data(n=2000):
    """Generate synthetic data for model training"""
    np.random.seed(42)
    
    food_types = ['cooked', 'raw', 'packaged', 'bakery', 'dairy', 'fruits_vegetables', 'beverages', 'mixed']
    areas = ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi',
             'Dwarka', 'Rohini', 'Saket', 'Connaught Place', 'Chandni Chowk']
    days_of_week = list(range(7))
    hours = list(range(24))
    
    data = []
    for _ in range(n):
        food_type = np.random.choice(food_types)
        area = np.random.choice(areas)
        day = np.random.choice(days_of_week)
        hour = np.random.choice(hours)
        temperature = np.random.uniform(15, 45)
        
        # Simulate demand patterns
        base_demand = np.random.randint(1, 20)
        
        # Higher demand on weekends
        if day in [5, 6]:
            base_demand += np.random.randint(3, 8)
        
        # Cooked food more in demand during meal times
        if food_type == 'cooked' and hour in [11, 12, 13, 18, 19, 20]:
            base_demand += np.random.randint(5, 15)
        
        # Bakery items morning demand
        if food_type == 'bakery' and hour in [7, 8, 9]:
            base_demand += np.random.randint(3, 10)
        
        # Higher demand in dense areas
        if area in ['Chandni Chowk', 'Connaught Place', 'Central Delhi']:
            base_demand += np.random.randint(2, 8)
        
        # Temperature affects dairy spoilage
        spoilage_risk = 0
        if food_type in ['dairy', 'cooked'] and temperature > 30:
            spoilage_risk = 1
        elif food_type in ['fruits_vegetables'] and temperature > 35:
            spoilage_risk = 1
        else:
            spoilage_risk = np.random.choice([0, 1], p=[0.85, 0.15])
        
        demand_level = 'low' if base_demand < 8 else ('medium' if base_demand < 15 else 'high')
        
        data.append({
            'food_type': food_type,
            'area': area,
            'day_of_week': day,
            'hour': hour,
            'temperature': round(temperature, 1),
            'demand': base_demand,
            'demand_level': demand_level,
            'spoilage_risk': spoilage_risk,
        })
    
    return pd.DataFrame(data)


# ========== Model Training ==========

class FoodPredictionModel:
    def __init__(self):
        self.demand_model = None
        self.spoilage_model = None
        self.food_type_encoder = LabelEncoder()
        self.area_encoder = LabelEncoder()
        self.demand_encoder = LabelEncoder()
        self.is_trained = False
    
    def train(self):
        print("[ML] Training prediction models...")
        df = generate_training_data(3000)
        
        # Encode categorical features
        df['food_type_enc'] = self.food_type_encoder.fit_transform(df['food_type'])
        df['area_enc'] = self.area_encoder.fit_transform(df['area'])
        df['demand_level_enc'] = self.demand_encoder.fit_transform(df['demand_level'])
        
        features = ['food_type_enc', 'area_enc', 'day_of_week', 'hour', 'temperature']
        X = df[features]
        
        # Demand prediction model
        y_demand = df['demand_level_enc']
        self.demand_model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
        self.demand_model.fit(X, y_demand)
        
        # Spoilage risk model
        y_spoilage = df['spoilage_risk']
        self.spoilage_model = GradientBoostingRegressor(n_estimators=100, random_state=42, max_depth=5)
        self.spoilage_model.fit(X, y_spoilage)
        
        self.is_trained = True
        
        # Calculate accuracy
        demand_accuracy = self.demand_model.score(X, y_demand)
        print(f"Demand model accuracy: {demand_accuracy:.2%}")
        print(f"Spoilage model trained")
        print(f"Models ready for predictions")
    
    def predict_demand(self, food_type, area, day_of_week=None, hour=None, temperature=None):
        if not self.is_trained:
            self.train()
        
        if day_of_week is None:
            day_of_week = datetime.now().weekday()
        if hour is None:
            hour = datetime.now().hour
        if temperature is None:
            temperature = 30.0
        
        try:
            food_enc = self.food_type_encoder.transform([food_type])[0]
        except ValueError:
            food_enc = 0
        
        try:
            area_enc = self.area_encoder.transform([area])[0]
        except ValueError:
            area_enc = 0
        
        X = np.array([[food_enc, area_enc, day_of_week, hour, temperature]])
        
        demand_pred = self.demand_model.predict(X)[0]
        demand_proba = self.demand_model.predict_proba(X)[0]
        demand_level = self.demand_encoder.inverse_transform([demand_pred])[0]
        
        spoilage_risk = float(self.spoilage_model.predict(X)[0])
        
        return {
            'demand_level': demand_level,
            'demand_confidence': float(max(demand_proba)),
            'demand_probabilities': {
                level: float(prob)
                for level, prob in zip(self.demand_encoder.classes_, demand_proba)
            },
            'spoilage_risk': round(min(max(spoilage_risk, 0), 1), 3),
            'spoilage_category': 'high' if spoilage_risk > 0.6 else ('medium' if spoilage_risk > 0.3 else 'low'),
        }
    
    def predict_urgency(self, food_type, hours_to_expiry, temperature=None, quantity=0):
        """Calculate urgency score for a food listing"""
        if temperature is None:
            temperature = 30.0
        
        # Base urgency from expiry time
        if hours_to_expiry <= 0:
            time_urgency = 100
        elif hours_to_expiry <= 1:
            time_urgency = 95
        elif hours_to_expiry <= 2:
            time_urgency = 85
        elif hours_to_expiry <= 4:
            time_urgency = 70
        elif hours_to_expiry <= 8:
            time_urgency = 50
        elif hours_to_expiry <= 12:
            time_urgency = 35
        elif hours_to_expiry <= 24:
            time_urgency = 20
        else:
            time_urgency = 10
        
        # Food type spoilage modifier
        spoilage_multipliers = {
            'cooked': 1.3, 'dairy': 1.25, 'fruits_vegetables': 1.15,
            'raw': 1.1, 'bakery': 1.05, 'beverages': 0.9,
            'packaged': 0.7, 'mixed': 1.0,
        }
        food_modifier = spoilage_multipliers.get(food_type, 1.0)
        
        # Temperature modifier (higher temp = faster spoilage)
        temp_modifier = 1.0
        if temperature > 35:
            temp_modifier = 1.3
        elif temperature > 30:
            temp_modifier = 1.15
        elif temperature < 10:
            temp_modifier = 0.8
        
        # Quantity modifier (larger = more urgent to distribute)
        qty_modifier = 1.0 + min(quantity / 100, 0.3)
        
        urgency = min(100, time_urgency * food_modifier * temp_modifier * qty_modifier)
        
        return {
            'urgency_score': round(urgency, 2),
            'urgency_level': 'critical' if urgency > 85 else ('high' if urgency > 60 else ('medium' if urgency > 35 else 'low')),
            'components': {
                'time_urgency': round(time_urgency, 2),
                'food_type_modifier': food_modifier,
                'temperature_modifier': temp_modifier,
                'quantity_modifier': round(qty_modifier, 2),
            },
            'recommendation': (
                'IMMEDIATE ACTION REQUIRED - Food at critical spoilage risk' if urgency > 85 else
                'High priority - Match with nearest receiver urgently' if urgency > 60 else
                'Moderate priority - Standard matching acceptable' if urgency > 35 else
                'Low priority - No immediate action needed'
            ),
        }


# Initialize model
model = FoodPredictionModel()
model.train()


# ========== API Endpoints ==========

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_trained': model.is_trained,
        'timestamp': datetime.now().isoformat(),
    })


@app.route('/predict/demand', methods=['POST'])
def predict_demand():
    try:
        data = request.get_json()
        food_type = data.get('food_type', 'cooked')
        area = data.get('area', 'Central Delhi')
        day = data.get('day_of_week')
        hour = data.get('hour')
        temperature = data.get('temperature')
        
        result = model.predict_demand(food_type, area, day, hour, temperature)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/urgency', methods=['POST'])
def predict_urgency():
    try:
        data = request.get_json()
        food_type = data.get('food_type', 'cooked')
        hours_to_expiry = data.get('hours_to_expiry', 6)
        temperature = data.get('temperature')
        quantity = data.get('quantity', 10)
        
        result = model.predict_urgency(food_type, hours_to_expiry, temperature, quantity)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """Batch prediction for multiple food types in an area"""
    try:
        data = request.get_json()
        area = data.get('area', 'Central Delhi')
        temperature = data.get('temperature', 30)
        
        food_types = ['cooked', 'raw', 'packaged', 'bakery', 'dairy', 'fruits_vegetables', 'beverages', 'mixed']
        results = {}
        
        for ft in food_types:
            pred = model.predict_demand(ft, area, temperature=temperature)
            results[ft] = pred
        
        return jsonify({
            'area': area,
            'temperature': temperature,
            'predictions': results,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"""
*************************************************
*     Food Prediction ML Service                *
*     Running on port {port}                    *
*     Models: Demand + Spoilage + Urgency       *
*************************************************
    """)
    app.run(host='0.0.0.0', port=port, debug=True)
