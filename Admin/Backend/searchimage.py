import base64
import mysql.connector
from deepface import DeepFace
from flask import Flask, request, jsonify

app = Flask(__name__)

results = []

# MySQL database configuration
db_config = {
   'host': 'localhost',
   'user': 'root',
   'password': '',
   'database': 'ai'
}

def get_image_from_db(image_id):
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT image_base64 FROM images WHERE id = %s"
            cursor.execute(sql, (image_id,))
            result = cursor.fetchone()
            if result:
                return result[0]
            else:
                return None
    finally:
        connection.close()

@app.route('/verify', methods=['POST'])
def verify_image():
    data = request.get_json()
    image_id = data['image_id']
    target_image_base64 = get_image_from_db(image_id)
    image_path = data['image_path']

    if target_image_base64:
        target_image = base64.b64decode(target_image_base64)
        try:
            result = DeepFace.verify(image_path, target_image)
            verified = result['verified']

            results.append({
                'image_id': image_id,
                'image_path': image_path,
                'verified': verified
            })

            return jsonify({'message': 'Verification successful', 'verified': verified}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    else:
        return jsonify({'message': 'Image not found in database'}), 404

@app.route('/results', methods=['GET'])
def get_results():
    return jsonify(results), 200

if __name__ == '__main__':
    app.run(debug=True)
