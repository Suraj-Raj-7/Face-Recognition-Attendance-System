from flask import Flask, render_template, Response, request, jsonify, send_file
import cv2
import face_recognition
import time
import base64
import numpy as np
from datetime import datetime
import pandas as pd
import io
import os
import pytz

# Import the database configuration
from database import db, Student, Attendance, init_db

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database with the Flask app
db.init_app(app)

# Global variables to store face encodings in memory
known_face_encodings = []
known_student_ids = []

# Define the Indian Standard Time zone object
IST = pytz.timezone('Asia/Kolkata')

def load_face_encodings():
    """
    Loads all student data and face encodings from the database into memory.
    This function should be called at startup.
    """
    global known_face_encodings, known_student_ids
    with app.app_context():
        students = Student.query.all()
        if students:
            known_face_encodings = [np.frombuffer(s.face_encoding) for s in students]
            known_student_ids = [s.id for s in students]
        else:
            print("No students found in the database.")
            known_face_encodings = []
            known_student_ids = []

# Call this function once when the app starts
with app.app_context():
    init_db(app)

load_face_encodings()

# --- Flask Routes ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/student')
def student():
    return render_template('student.html')

@app.route('/admin_login')
def admin_login():
    return render_template('admin_login.html')

@app.route('/admin_dashboard')
def admin_dashboard():
    return render_template('admin_dashboard.html')

@app.route('/api/recognize_face', methods=['POST'])
def recognize_face():
    """
    New API endpoint to receive image data, perform face recognition,
    and mark attendance if a match is found.
    """
    data = request.json
    photo_data_url = data.get('photo')

    if not photo_data_url:
        return jsonify({'status': 'no_face'}), 400

    try:
        header, image_data = photo_data_url.split(',', 1)
        decoded_image = base64.b64decode(image_data)
        nparr = np.frombuffer(decoded_image, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        rgb_frame = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        if not face_encodings:
            return jsonify({'status': 'no_face'})

        face_encoding = face_encodings[0]
        if known_face_encodings:
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.6)
            if True in matches:
                first_match_index = matches.index(True)
                matched_student_id = known_student_ids[first_match_index]

                with app.app_context():
                    student = db.session.get(Student, matched_student_id)
                    if student:
                        # Check if attendance has already been marked recently to avoid duplicates
                        recent_attendance = Attendance.query.filter_by(student_id=matched_student_id).order_by(Attendance.timestamp.desc()).first()
                        if not recent_attendance or (datetime.utcnow() - recent_attendance.timestamp).total_seconds() > 30:
                            new_attendance = Attendance(student_id=matched_student_id, timestamp=datetime.utcnow())
                            db.session.add(new_attendance)
                            db.session.commit()
                            return jsonify({'status': 'match_found', 'name': student.name})
                        else:
                            # Matched, but attendance was marked too recently
                            return jsonify({'status': 'already_marked', 'name': student.name})

        return jsonify({'status': 'no_match'})
    
    except Exception as e:
        print(f"Error during face recognition: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/register_student', methods=['POST'])
def register_student():
    """
    API endpoint to register a new student and their face encoding.
    """
    data = request.json
    name = data.get('name')
    roll_no = data.get('rollNo')
    photo_data_url = data.get('photo')

    if not name or not roll_no or not photo_data_url:
        return jsonify({'success': False, 'message': 'Missing data'}), 400

    try:
        # Decode the Base64 image data
        header, image_data = photo_data_url.split(',', 1)
        decoded_image = base64.b64decode(image_data)
        
        # Save the image to the student_faces folder
        filename = f"{name.replace(' ', '_')}.png"
        save_path = os.path.join('static', 'uploads', 'student_faces', filename)
        with open(save_path, 'wb') as f:
            f.write(decoded_image)

        # Convert image to numpy array for face recognition
        nparr = np.frombuffer(decoded_image, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Get face encoding
        encodings = face_recognition.face_encodings(rgb_img)
        if not encodings:
            return jsonify({'success': False, 'message': 'No face found in the image.'}), 400

        # Save the student to the database
        face_encoding = encodings[0]
        new_student = Student(name=name, roll_no=roll_no, face_encoding=face_encoding.tobytes())
        db.session.add(new_student)
        db.session.commit()
        
        # Optimize: add new encoding to global lists directly instead of reloading all of them
        global known_face_encodings, known_student_ids
        known_face_encodings.append(face_encoding)
        known_student_ids.append(new_student.id)

        return jsonify({'success': True, 'message': 'Student registered successfully!'})
    except Exception as e:
        print(f"Error registering student: {e}")
        return jsonify({'success': False, 'message': 'An error occurred.'}), 500

@app.route('/api/attendance_data')
def get_attendance_data():
    """
    API endpoint to get all attendance records for the admin dashboard.
    """
    with app.app_context():
        attendance_records = db.session.query(Attendance, Student).join(Student).all()
        
        attendance_list = []
        for attendance, student in attendance_records:
            attendance_list.append({
                'name': student.name,
                'roll_no': student.roll_no,
                'timestamp': attendance.timestamp.isoformat() + 'Z'
            })
    return jsonify(attendance_list)

@app.route('/api/attendance_status')
def get_attendance_status():
    """
    API endpoint to check if attendance has been marked for the current session.
    (This is now obsolete with client-side camera, but is kept for backward compatibility).
    """
    with app.app_context():
        recent_attendance = Attendance.query.order_by(Attendance.timestamp.desc()).first()
        if recent_attendance and (datetime.utcnow() - recent_attendance.timestamp).total_seconds() < 10:
            return jsonify({'marked': True})
        return jsonify({'marked': False})

@app.route('/api/export_excel')
def export_excel():
    """
    API endpoint to export attendance data to an Excel file.
    """
    with app.app_context():
        attendance_records = db.session.query(Attendance, Student).join(Student).all()
        
        data = []
        for attendance, student in attendance_records:
            # Convert UTC time to IST for the Excel file
            utc_time = attendance.timestamp.replace(tzinfo=pytz.utc)
            ist_time = utc_time.astimezone(IST)
            
            data.append({
                'Name': student.name,
                'Roll No': student.roll_no,
                'Timestamp': ist_time.strftime("%Y-%m-%d %H:%M:%S %Z%z")
            })
        
        df = pd.DataFrame(data)
        
        # Save the DataFrame to an in-memory Excel file
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Attendance')
        
        output.seek(0)
        
        return send_file(output,
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         as_attachment=True,
                         download_name='attendance_data.xlsx')

@app.route('/api/students_data')
def get_students_data():
    """
    API endpoint to get all student data.
    """
    with app.app_context():
        students = Student.query.order_by(Student.name).all()
        student_list = []
        for i, student in enumerate(students, 1):
            student_list.append({
                'id': student.id,
                's_no': i,
                'name': student.name,
                'roll_no': student.roll_no
            })
    return jsonify(student_list)

@app.route('/api/delete_student/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    """
    API endpoint to delete a student and their attendance records.
    """
    with app.app_context():
        student = db.session.get(Student, student_id)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404

        # Delete all attendance records for the student first
        Attendance.query.filter_by(student_id=student_id).delete()
        
        # Then delete the student record
        db.session.delete(student)
        db.session.commit()
        
        # Reload face encodings to remove the deleted student
        load_face_encodings()

        return jsonify({'success': True, 'message': 'Student and related attendance records deleted successfully.'})

if __name__ == '__main__':
    # This block is now empty because Gunicorn will run the application
    pass
