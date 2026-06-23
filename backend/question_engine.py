from backend.database import get_db_connection

# Treatment mapping dictionary for plant diseases
DISEASE_TREATMENT_MAP = {
    "Root Rot": "Stop watering immediately. Remove the plant from the pot, cut away mushy black roots, and repot in fresh, well-draining soil. Do not water for the next 7-10 days to let roots heal.",
    "Leaf Burn": "Move the plant away from direct scorching sun. Place it in bright, indirect light. Cut off heavily burned foliage to let the plant direct energy into new growth.",
    "Black Spot Fungus": "Prune and dispose of all infected leaves. Apply organic neem oil spray or fungicide every 7 days. Water directly at the root zone; keep foliage dry.",
    "Powdery Mildew": "Improve ventilation and air circulation. Wipe white patches off leaves with a diluted baking soda and water mixture, or spray with organic sulfur fungicide.",
    "Rust Fungus": "Remove affected leaves immediately to prevent fungal spore dispersal. Apply organic copper fungicide, avoid overhead watering, and keep the plant in a dry, ventilated area.",
    "Dehydration": "Give the plant a slow, thorough soak until water drains from the bottom. Check soil daily and maintain a regular watering interval. Mist the leaves for immediate relief.",
    "Aphid Infestation": "Spray the foliage with a firm blast of water to dislodge insects, then thoroughly coat the leaves with organic insecticidal soap or neem oil spray every 3 days.",
    "Nutrient Deficiency": "Feed with a water-soluble balanced liquid fertilizer. Check soil pH to ensure it is not too acidic or alkaline, which blocks nutrient uptake."
}

def get_recommended_questions(plant_name: str, disease_detected: str = "None - Healthy"):
    """
    Fetches the specific care questions and answers for the given plant name, 
    and dynamically prepends treatment recommendations if a disease is diagnosed.
    """
    # 1. Funny Easter Egg for Human Face detection
    if plant_name.lower() == "human face":
        return [
            {
                "id": 9001,
                "plant_name": "Human Face",
                "question": "How much water does this human need?",
                "answer": "Humans require roughly 2.5 to 3.5 liters of clean water daily to stay hydrated and active. Adjust for high ambient temperature or workout sessions."
            },
            {
                "id": 9002,
                "plant_name": "Human Face",
                "question": "Sunlight requirement?",
                "answer": "Moderate sunlight exposure (10-15 minutes) is excellent for synthesizing Vitamin D. Wear SPF sunscreen for prolonged exposure to prevent leaf (skin) scorch!"
            },
            {
                "id": 9003,
                "plant_name": "Human Face",
                "question": "Why is the skin turning red?",
                "answer": "This is often sunburn or thermal stress (or embarrassment!). Apply soothing aloe vera lotion, drink water, and seek shade immediately."
            },
            {
                "id": 9004,
                "plant_name": "Human Face",
                "question": "Best soil type?",
                "answer": "None! Humans are mobile mammals and prefer orthopedic mattresses or comfortable computer chairs rather than a pot of soil."
            },
            {
                "id": 9005,
                "plant_name": "Human Face",
                "question": "How to grow faster?",
                "answer": "Maintain a balanced diet rich in leafy greens, ensure 8 hours of sleep, exercise daily, and drink plenty of water."
            }
        ]

    # 2. General Plant Questions from SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, plant_name, question, answer 
        FROM plant_questions 
        WHERE LOWER(plant_name) = LOWER(?);
    """, (plant_name,))
    
    rows = cursor.fetchall()
    conn.close()
    
    questions = []
    
    # 3. Dynamic Disease Treatment Question Insertion
    clean_disease = disease_detected.replace("None - ", "")
    if disease_detected and "healthy" not in disease_detected.lower() and clean_disease in DISEASE_TREATMENT_MAP:
        questions.append({
            "id": 9999,
            "plant_name": plant_name,
            "question": f"🚨 How do I treat {clean_disease} on my {plant_name}?",
            "answer": DISEASE_TREATMENT_MAP[clean_disease]
        })
        
    for row in rows:
        questions.append({
            "id": row["id"],
            "plant_name": row["plant_name"],
            "question": row["question"],
            "answer": row["answer"]
        })
        
    return questions
