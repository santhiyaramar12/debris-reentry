from pymongo import MongoClient

def get_db_connection():
    # MongoDB default port 27017
    client = MongoClient("mongodb://localhost:27017/")
    # Database name: satellite_db
    db = client["satellite_db"]
    return db

def fetch_debris_details(norad_id):
    db = get_db_connection()
    collection = db["debris"]
    
    # norad_id vachchu query panrom
    data = collection.find_one({"norad_id": norad_id})
    return data