from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize the SQLAlchemy extension
db = SQLAlchemy()

class Student(db.Model):
    """
    Model for a student record.
    This will create a table named 'student' in your database.
    """
    id = db.Column(db.Integer, primary_key=True)
    roll_no = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    # The 'face_encoding' column will store the face encoding as a BLOB
    face_encoding = db.Column(db.PickleType, nullable=False)

    def __repr__(self):
        return f'<Student {self.roll_no} - {self.name}>'

class Attendance(db.Model):
    """
    Model for an attendance record.
    This will create a table named 'attendance'.
    """
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Define the relationship to the Student table
    student = db.relationship('Student', backref=db.backref('attendance', lazy=True))

    def __repr__(self):
        return f'<Attendance {self.student_id} at {self.timestamp}>'

def init_db(app):
    """
    Initializes the database and creates tables if they don't exist.
    """
    with app.app_context():
        db.create_all()
        print("Database initialized and tables created.")