import json
from pymongo import MongoClient

def import_data():
    # 1. MongoDB Connection
    client = MongoClient("mongodb://localhost:27017/")
    
    # DATABASE: satellite_mission_db
    db = client["satellite_mission_db"]
    
    # COLLECTION: debris_satellites
    collection = db["mission_control"]

    # 2. Pazhaya data-vah clean panrom (Both mission_control and old debris data)
    collection.delete_many({})
    # Oru vela mission_control collection-ah delete pannanum-na idhai use pannu:
    # db.mission_control.drop() 
    
    print("🧹 Cleaning complete: debris_satellites collection is ready.")

    # 3. JSON-ah read panni ulla thallurom
    try:
        with open('mission_satellite_fixed', 'r') as f:
            data = json.load(f)
            
            # Key check: 'satellites' kulla dhaan unga list irukku
            satellite_list = data.get('satellites', [])

            if satellite_list:
                # insert_many thaan array-va documents-aa split pannum
                collection.insert_many(satellite_list)
                print(f"🔥 Success! {len(satellite_list)} separate documents added.")
                print("📂 Database: satellite_mission_db | Collection: mission_control")
            else:
                print("❌ Error: JSON-la 'satellites' list-ah kaanom!")
                
    except FileNotFoundError:
        print("❌ Error: 'debris_satellites.json' file path-ah check pannu da!")

if __name__ == "__main__":
    import_data()