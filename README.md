# Face Recognition Attendance System

This is a web-based attendance system that uses face recognition technology to mark student attendance. The application is built with Flask, a Python web framework, and uses OpenCV and the `face_recognition` library for real-time face detection. Student and attendance data are securely stored in a SQLite database.

## Features

* **Face Recognition Attendance:** Students can mark their attendance by simply looking at the camera.
* **Admin Dashboard:** A secure dashboard for administrators to manage student data.
* **Student Registration:** Admins can add new students by entering their details and uploading or capturing a photo.
* **Real-time Attendance Status:** The student page provides a confirmation message once attendance is successfully marked.
* **Attendance Tracking:** The admin dashboard displays a table of all attendance records from the database.
* **SQLite Database:** All data is stored in a `site.db` file, providing a robust and scalable solution compared to CSV files.



