import cv2
from flask import Flask, render_template, Response, jsonify
from flask_socketio import SocketIO
from datetime import datetime
import base64
from deepface import DeepFace
import threading
import os
import pyttsx3
import random
import requests
import concurrent.futures
from scipy.linalg import norm
import numpy as np
from pathlib import Path
import shutil


app = Flask(__name__)
socketio = SocketIO(app)

cap = cv2.VideoCapture(0)
scaling_factor = 1

# Load Haarcascades for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

url = 'http://localhost:8081/User'
response = requests.get(url)
data = response.json()

# ตรวจสอบ CSID ที่ไม่มีใน URL และลบไฟล์รูปภาพทิ้ง
existing_csid = set([item["CSID"] for item in data])
image_folder = 'Userimage'
for folder in os.listdir(image_folder):
    if folder not in existing_csid:
        file_path = os.path.join(image_folder, folder + '.jpg')
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Deleted image for CSID: {folder}")

# สร้างโฟลเดอร์ 'Userimage' หากยังไม่มี
os.makedirs('Userimage', exist_ok=True)

# บันทึกรูปภาพจาก URL ลงในโฟลเดอร์ตาม CSName และ CSID
for item in data:
    CSName = item["CSName"]
    img_64 = item["img_64"]

    CSName_path = os.path.join('Userimage', CSName)
    if not os.path.exists(CSName_path):
        os.makedirs(CSName_path)

    CSID = item["CSID"]
    img_filename = f"{CSID}.jpg"

    with open(os.path.join(CSName_path, img_filename), "wb") as f:
        f.write(base64.b64decode(img_64.split(",")[1]))

def store_data_to_mysql(most_similar_id, emotions, age, gender, face_encoded, frame_encoded, timestamp):
    url = 'http://localhost:8081/saveKiosk'

    emoid = requests.get('http://localhost:8081/emotionid', params={'emotion': emotions}).json()[0]['EmoID']

    payload = {
        'CSGender': gender,
        'CSAge': age,
        'CSID': most_similar_id,
        'EmoID': emoid,
        'S_Pic': face_encoded,
        'L_Pic': frame_encoded,
        'Date_time' : timestamp
    }

    response = requests.post(url, json=payload)
    if response.status_code == 200:
        print("Data stored successfully")
    else:
        print("Failed to store data to API")

TH_voice_id = "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices\Tokens\TTS_THAI"
def speak_message(message):
    engine = pyttsx3.init()
    engine.setProperty('rate', 160)
    engine.setProperty('volume', 1)
    engine.setProperty('voice', TH_voice_id)
    engine.say(message)
    engine.runAndWait()

def get_message_based_on_emotion(emotion_text):
    emoid = requests.get('http://localhost:8081/emotionid', params={'emotion': emotion_text}).json()[0]['EmoID']

    messages = requests.get('http://localhost:8081/textid', params={'EmoID': emoid}).json()
    if messages:
        return random.choice(messages)['Message']
    else:
        return None
    
def analyze_face(face):
    with concurrent.futures.ThreadPoolExecutor() as executor:
        emotion_future = executor.submit(DeepFace.analyze, face, actions=['emotion'], enforce_detection=False)
        age_future = executor.submit(DeepFace.analyze, face, actions=['age'], enforce_detection=False)
        gender_future = executor.submit(DeepFace.analyze, face, actions=['gender'], enforce_detection=False)
  
        concurrent.futures.wait([emotion_future, age_future, gender_future])

        emotion_result = emotion_future.result()[0]['dominant_emotion']
        age_result = age_future.result()[0]['age']
        gender_result = gender_future.result()[0]['dominant_gender']
        
    return emotion_result, age_result, gender_result

# Capture face and socket result
tracker = []
Time = 0
def camera_stream():
    while True:
        ret, frame = cap.read()
        frame = cv2.resize(frame, None, fx=scaling_factor, fy=scaling_factor, interpolation=cv2.INTER_AREA)
        frame = cv2.flip(frame, 1)
        # Add timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d   %H:%M:%S")
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, flags=cv2.CASCADE_SCALE_IMAGE)

        for (x, y, w, h) in faces:
            face = frame[y:y+h, x:x+w]
            max_size = 100
            height, width = face.shape[:2]
            if height > max_size or width > max_size:
                if height > width:
                    scale_factor = max_size / height
                else:
                    scale_factor = max_size / width
                face_resized = cv2.resize(face, (int(width * scale_factor), int(height * scale_factor)))
            else:
                face_resized = face

            # Encode face_resized image to base64 with data:image/jpeg;base64,
            face_encoded = base64.b64encode(cv2.imencode('.jpg', face_resized)[1]).decode('utf-8')
            face_encoded = f"data:image/jpeg;base64,{face_encoded}"

            # Encode frame image to base64 with data:image/jpeg;base64,
            frame_encoded = base64.b64encode(cv2.imencode('.jpg', frame)[1]).decode('utf-8')
            frame_encoded = f"data:image/jpeg;base64,{frame_encoded}"

            embedding_objs = DeepFace.represent(face_resized, model_name="Facenet", enforce_detection=False)
            embedding = embedding_objs[0]["embedding"]

            # Compare with existing embeddings in tracker
            is_existing_face = False
            for trac in tracker:
                cosine = np.dot(embedding, trac['pic']) / (norm(embedding) * norm(trac['pic']))
                if cosine > 0.6:
                    # print('most similar face')
                    trac['time'] = Time
                    is_existing_face = True
                    break
                elif trac['time'] != Time:
                    print('less similar face')
                    tracker.append({'pic': embedding, 'time': Time})
                    break

            if not is_existing_face:
                print('unseen face')
                cv2.imwrite('face.jpg', face)
                cv2.imwrite('frame.jpg', frame)
                tracker.append({'pic': embedding, 'time': Time})
                # detect face from user name
                current_directory = Path(__file__).parent
                db_path = current_directory / 'UserImage'
                results = DeepFace.find(img_path='face.jpg', db_path=db_path, model_name='VGG-Face', enforce_detection=False)

                most_similar_id = 0
                if results and not results[0].empty:
                    first_result_df = results[0]
                    most_similar_path = first_result_df.iloc[0]['identity']
                    most_similar_id = os.path.splitext(os.path.basename(most_similar_path))[0]
                print(most_similar_id)

                most_similar_name = "Stranger"
                response = requests.get('http://localhost:8081/User')
                if response:
                    users = response.json()
                    for user in users:
                        if user["CSID"] == int(most_similar_id):
                            most_similar_name = user["CSName"]
                            break
                print(most_similar_name)

                emotions, age, gender = analyze_face(face)
                message = get_message_based_on_emotion(emotions)
                if message:
                    speak_message(message)

                # Emit data over socket
                socketio.emit('data', {'name': most_similar_name, 'emotion': emotions, 'age_range': age, 'gender': gender, 'faceimg': face_encoded})

                # Store data to MySQL
                store_data_to_mysql(most_similar_id, emotions, age, gender, face_encoded, frame_encoded, timestamp)

            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 255, 255), 1)
            
  
# Only Stream video
def gen_frames():
    while True:
        ret, frame = cap.read()
        frame = cv2.resize(frame, None, fx=scaling_factor, fy=scaling_factor, interpolation=cv2.INTER_AREA)
        frame = cv2.flip(frame, 1)

        # Add timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d   %H:%M:%S")
        cv2.putText(frame, f'Time: {timestamp}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, flags=cv2.CASCADE_SCALE_IMAGE)

        for (x, y, w, h) in faces:
            frame[y:y+h, x:x+w]
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 255, 255), 1)
        _  , encoded_frame = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + encoded_frame.tobytes() + b'\r\n\r\n')

@app.route('/savetoDir')
def create_image_folders_and_save_images():
    api_endpoint = 'http://localhost:8081/uploadtofolder'

    response = requests.get(api_endpoint)
    image_data = response.json()

    # Check if image_data is a list or dict before iterating
    if isinstance(image_data, list):
        for entry in image_data:
            print(entry['CSName'])
    else:
        print("Unexpected response format:", image_data)

    folder_root = "UserImage"

    if not os.path.exists(folder_root):
        os.makedirs(folder_root)
        print("folder '{}' has been created".format(folder_root))
    else:
        print("folder '{}' already exists".format(folder_root))
    
    return "folder is creating"
# Unexpected response format: {'code': 'ER_BAD_FIELD_ERROR', 'errno': 1054, 'sqlMessage': "Unknown column 'CSImg' in 'field list'", 'sqlState': '42S22', 'index': 0, 'sql': 'SELECT `CSID`, `CSName`, `Role`, `CSImg`, `img_64` FROM `csuser`'}
# folder 'UserImage' already exists
# 127.0.0.1 - - [02/Apr/2024 15:21:34] "GET /savetoDir HTTP/1.1" 200 -

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    thread = threading.Thread(target=camera_stream)
    thread.daemon = True
    thread.start()
    socketio.run(app)
