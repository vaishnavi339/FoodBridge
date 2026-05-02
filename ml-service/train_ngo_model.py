import pandas as pd
import json
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import os

# Top 100+ Indian Cities for training
# Load NGO database
with open('models/ngo_database.json', 'r', encoding='utf-8') as f:
    ngo_db = json.load(f)

# Prepare training data
training_data = []

# 1. Add all cities from the expanded database to ensure the model recognizes them
for entry in ngo_db:
    if entry['city'] == "National": continue
    city = entry['city']
    training_data.append({"text": city.lower(), "label": city})
    training_data.append({"text": f"ngos in {city.lower()}", "label": city})
    training_data.append({"text": f"is there an ngo in {city.lower()}", "label": city})
    training_data.append({"text": f"food rescue in {city.lower()}", "label": city})
    training_data.append({"text": f"{city.lower()} city", "label": city})


df = pd.DataFrame(training_data)

# Create a pipeline with better parameters for larger dataset
model = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2))), # Use bigrams for better city name detection
    ('clf', MultinomialNB(alpha=0.1)) # Lower alpha for more sensitivity
])

# Train the model
model.fit(df['text'], df['label'])

# Save the model
os.makedirs('models', exist_ok=True)
with open('models/city_classifier.pkl', 'wb') as f:
    pickle.dump(model, f)

print(f"NGO City Intent Model trained on {len(df)} samples across {len(df['label'].unique())} cities!")
