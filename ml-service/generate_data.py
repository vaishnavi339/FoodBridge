import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

zones = ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi',
         'Central Delhi', 'Noida', 'Gurgaon', 'Dwarka']
food_categories = ['Cooked Meals', 'Bakery', 'Fruits & Vegetables',
                   'Packaged Goods', 'Dairy', 'Rice & Grains']

zone_demand_map = {
    'South Delhi': 0.9, 'Central Delhi': 0.85, 'North Delhi': 0.7,
    'East Delhi': 0.65, 'West Delhi': 0.6, 'Dwarka': 0.55,
    'Noida': 0.5, 'Gurgaon': 0.45
}
cat_map = {
    'Cooked Meals': 1.0, 'Rice & Grains': 0.9, 'Dairy': 0.8,
    'Fruits & Vegetables': 0.75, 'Bakery': 0.65, 'Packaged Goods': 0.5
}

records = []
for _ in range(2000):
    zone = random.choice(zones)
    food_cat = random.choice(food_categories)
    day = random.randint(0, 6)
    hour = random.randint(6, 22)
    month = random.randint(1, 12)
    is_weekend = 1 if day >= 5 else 0
    is_evening = 1 if 17 <= hour <= 21 else 0
    is_morning = 1 if 7 <= hour <= 11 else 0
    zone_factor = zone_demand_map[zone]
    cat_factor = cat_map[food_cat]
    base_demand = 20
    demand_kg = (
        base_demand * zone_factor * cat_factor
        * (1.4 if is_weekend else 1.0)
        * (1.3 if is_evening else 1.0)
        * (1.1 if is_morning else 1.0)
        + np.random.normal(0, 5)
    )
    demand_kg = max(5, round(demand_kg, 1))
    urgency = round(
        zone_factor * 0.5 + cat_factor * 0.3 + (0.2 if is_weekend else 0)
        + np.random.normal(0, 0.1), 2
    )
    urgency = min(1.0, max(0.1, urgency))
    claim_prob = zone_factor * 0.6 + (0.2 if is_weekend else 0) + (0.15 if is_evening else 0)
    claimed_fast = 1 if random.random() < claim_prob else 0
    records.append({
        'zone': zone, 'food_category': food_cat, 'day_of_week': day,
        'hour': hour, 'month': month, 'is_weekend': is_weekend,
        'is_evening': is_evening, 'is_morning': is_morning,
        'zone_ngos_active': random.randint(2, 12),
        'listings_in_zone': random.randint(1, 8),
        'avg_distance_km': round(random.uniform(1.5, 18.0), 1),
        'demand_kg': demand_kg, 'urgency_score': urgency,
        'claimed_within_2hrs': claimed_fast
    })

df = pd.DataFrame(records)
df.to_csv('models/training_data.csv', index=False)
print(f"Generated {len(df)} training records")
