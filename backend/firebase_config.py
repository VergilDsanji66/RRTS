# firebase_config.py
import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase Admin SDK
def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate("./serviceAccountKey.json")
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://rrts-313dc-default-rtdb.firebaseio.com'
        })
    return db.reference()