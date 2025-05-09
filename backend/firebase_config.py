#firebase_config_py
import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase Admin SDK
def initialize_firebase():
    cred = credentials.Certificate("./serviceAccountKey.json")  # Download from Firebase Console
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://rrts-313dc-default-rtdb.firebaseio.com'
    })
    
    return db.reference()