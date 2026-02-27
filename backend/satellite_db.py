import sqlite3
import json

def get_debris_details(norad_id):
    conn = sqlite3.connect('data/satellites.db')
    conn.row_factory = sqlite3.Row # Dictionary-aa data eduka
    cursor = conn.cursor()
    
    # Un database structure-ku yetha query
    cursor.execute("""
        SELECT name, mass, diameter, length, tle_history 
        FROM satellites 
        WHERE norad_id = ?
    """, (norad_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        data = dict(row)
        # TLE History JSON string-aa irundha list-aa mathikalam
        if isinstance(data['tle_history'], str):
            data['tle_history'] = json.loads(data['tle_history'])
        return data
    return None