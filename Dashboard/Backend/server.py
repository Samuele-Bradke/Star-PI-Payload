from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='../Frontend/Figma/dist')
CORS(app)

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# API endpoint for telemetry data (example)
@app.route('/api/flights')
def get_flights():
    # This would eventually read from your database or files
    return jsonify({
        "flights": [
            {
                "id": "flight-001",
                "date": "2024-03-15",
                "duration": 180,
                "status": "success"
            }
        ]
    })

@app.route('/api/telemetry/<flight_id>')
def get_telemetry(flight_id):
    # This would eventually return real telemetry data
    return jsonify({
        "flight_id": flight_id,
        "data": []
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
