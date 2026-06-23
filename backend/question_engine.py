from backend.database import get_db_connection

def get_recommended_questions(plant_name: str):
    """
    Fetches the specific care questions and answers from the database for the given plant name.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Query matching plant questions
    cursor.execute("""
        SELECT id, plant_name, question, answer 
        FROM plant_questions 
        WHERE LOWER(plant_name) = LOWER(?);
    """, (plant_name,))
    
    rows = cursor.fetchall()
    conn.close()
    
    questions = []
    for row in rows:
        questions.append({
            "id": row["id"],
            "plant_name": row["plant_name"],
            "question": row["question"],
            "answer": row["answer"]
        })
        
    return questions
