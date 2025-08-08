// Add an event listener that waits for the entire page to load before executing the script
document.addEventListener('DOMContentLoaded', function() {

    /* =================================================
       --- LOGIC FOR `index.html` (Home Page) ---
       ================================================= */
    const studentButton = document.getElementById('studentButton');
    const adminButton = document.getElementById('adminButton');

    if (studentButton && adminButton) {
        studentButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'student'; // Redirect to the student page
        });

        adminButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'admin_login'; // Redirect to the admin login page
        });
    }


    /* ====================================================
       --- LOGIC FOR `student.html` (Student View) ---
       ==================================================== */
    const video = document.getElementById('videoElement');
    const loadingMessage = document.getElementById('loading-message');
    const attendanceStatus = document.getElementById('attendanceStatus');
    const videoContainer = document.getElementById('video-container');

    let isPolling = false;

    if (video) {
        async function startCamera() {
            loadingMessage.textContent = 'Connecting to camera...';
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                video.style.display = 'block';
                loadingMessage.style.display = 'none';
                attendanceStatus.textContent = 'Please look at the camera to mark your attendance.';
                isPolling = true;
                
                // Start sending frames for recognition after a delay
                video.onloadedmetadata = () => {
                    video.play();
                    // Flip the video horizontally for a mirror effect
                    video.style.transform = 'scaleX(-1)';
                    console.log("Client-side camera started.");
                    sendFramesForRecognition();
                };

            } catch (err) {
                console.error("Error accessing camera: ", err);
                loadingMessage.textContent = 'Camera access denied or unavailable.';
                alert('Could not start camera. Please check permissions.');
            }
        }

        function captureFrame() {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            // Draw the flipped video frame onto the canvas
            context.scale(-1, 1);
            context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.8);
        }

        async function sendFramesForRecognition() {
            if (!isPolling) return;
            const photoDataUrl = captureFrame();

            try {
                const response = await fetch('/api/recognize_face', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photo: photoDataUrl })
                });

                const data = await response.json();
                if (data.status === 'match_found') {
                    attendanceStatus.textContent = `Attendance Marked for ${data.name}! ✅`;
                    attendanceStatus.style.color = '#28a745';
                    isPolling = false; // Stop sending frames once attendance is marked
                } else if (data.status === 'no_face') {
                    attendanceStatus.textContent = `No face detected. Please try again.`;
                    attendanceStatus.style.color = '#dc3545';
                } else {
                    attendanceStatus.textContent = `Detecting face...`;
                    attendanceStatus.style.color = '#555';
                }
            } catch (error) {
                console.error('Error sending frame to server:', error);
                attendanceStatus.textContent = 'Server error. Please try again later.';
                attendanceStatus.style.color = '#dc3545';
            }
            
            // Continue polling every 1.5 seconds if attendance has not been marked
            if (isPolling) {
                setTimeout(sendFramesForRecognition, 1500);
            }
        }

        startCamera();
    }


    /* =======================================================
       --- LOGIC FOR `admin_login.html` (Admin Login) ---
       ======================================================= */
    const loginButton = document.getElementById('loginButton');

    if (loginButton) {
        loginButton.addEventListener('click', function() {
            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');

            // This will be replaced with a real API call later. For now, it's a simple placeholder.
            if (usernameInput === 'admin' && passwordInput === 'password123') {
                errorMessage.style.display = 'none';
                alert('Login Successful! Redirecting to Admin Dashboard.');
                window.location.href = 'admin_dashboard';
            } else {
                errorMessage.style.display = 'block';
                console.log('Login Failed: Incorrect username or password.');
            }
        });
    }


    /* ==========================================================
       --- LOGIC FOR `admin_dashboard.html` (Admin Dashboard) ---
       ========================================================== */
    const studentNameInput = document.getElementById('studentName');
    const studentRollNoInput = document.getElementById('studentRollNo');
    const imageUploadInput = document.getElementById('imageUpload');
    const cameraVideo = document.getElementById('cameraVideo');
    const capturedImage = document.getElementById('capturedImage');
    const cameraMessage = document.getElementById('cameraMessage');
    const startCameraButton = document.getElementById('startCameraButton');
    const capturePhotoButton = document.getElementById('capturePhotoButton');
    const stopCameraButton = document.getElementById('stopCameraButton');
    const saveStudentDataButton = document.getElementById('saveStudentData');
    const refreshAttendanceButton = document.getElementById('refreshAttendance');
    const exportExcelButton = document.getElementById('exportExcel');
    const logoutButton = document.getElementById('logoutButton');
    const attendanceTablePlaceholder = document.getElementById('attendanceTablePlaceholder');
    const studentsTablePlaceholder = document.getElementById('studentsTablePlaceholder');


    let cameraStream = null;

    if (startCameraButton) {
        async function startCameraForAdmin() {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                cameraVideo.srcObject = cameraStream;
                cameraVideo.style.display = 'block';
                capturedImage.style.display = 'none';
                cameraMessage.style.display = 'none';

                startCameraButton.disabled = true;
                capturePhotoButton.disabled = false;
                stopCameraButton.disabled = false;

                cameraVideo.onloadedmetadata = () => {
                    cameraVideo.play();
                    console.log("Admin camera started.");
                };
            } catch (err) {
                console.error("Error accessing admin camera: ", err);
                cameraMessage.textContent = 'Camera access denied or unavailable.';
                cameraMessage.style.display = 'block';
                startCameraButton.disabled = false;
                capturePhotoButton.disabled = true;
                stopCameraButton.disabled = true;
                alert('Could not start camera. Please check permissions.');
            }
        }

        function stopCameraForAdmin() {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
                cameraVideo.srcObject = null;
                cameraVideo.style.display = 'none';
                cameraMessage.textContent = 'Camera stopped.';
                cameraMessage.style.display = 'block';

                startCameraButton.disabled = false;
                capturePhotoButton.disabled = true;
                stopCameraButton.disabled = true;
                console.log("Admin camera stopped.");
            }
        }

        function capturePhoto() {
            if (cameraStream) {
                const canvas = document.createElement('canvas');
                canvas.width = cameraVideo.videoWidth;
                canvas.height = cameraVideo.videoHeight;
                const context = canvas.getContext('2d');
                context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

                const imageDataUrl = canvas.toDataURL('image/png');
                capturedImage.src = imageDataUrl;
                capturedImage.style.display = 'block';
                cameraVideo.style.display = 'none';

                console.log("Photo captured!");
                alert("Photo captured successfully! Click 'Save Student Data' to upload.");
            } else {
                alert("Please start the camera first!");
            }
        }

        async function fetchStudentsData() {
            studentsTablePlaceholder.innerHTML = '<p>Loading student data...</p>';
            try {
                const response = await fetch('/api/students_data');
                const data = await response.json();
                
                if (data.length === 0) {
                    studentsTablePlaceholder.innerHTML = '<p>No students found.</p>';
                    return;
                }

                let tableHtml = `
                    <table class="students-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                data.forEach(record => {
                    tableHtml += `
                        <tr>
                            <td>${record.s_no}</td>
                            <td>${record.name}</td>
                            <td>${record.roll_no}</td>
                            <td>
                                <button class="btn btn-danger btn-sm delete-student-btn" data-student-id="${record.id}" data-student-name="${record.name}">Delete</button>
                            </td>
                        </tr>
                    `;
                });
                tableHtml += `</tbody></table>`;
                studentsTablePlaceholder.innerHTML = tableHtml;

            } catch (error) {
                console.error("Error fetching student data:", error);
                studentsTablePlaceholder.innerHTML = '<p style="color: red;">Failed to load student data.</p>';
            }
        }

        // New function to handle the delete action
        async function deleteStudent(studentId, studentName) {
            if (confirm(`Are you sure you want to delete ${studentName} and all their attendance records? This action cannot be undone.`)) {
                try {
                    const response = await fetch(`/api/delete_student/${studentId}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();
                    if (data.success) {
                        alert(data.message);
                        fetchStudentsData(); // Refresh the student table
                        fetchAttendanceData(); // Also refresh the attendance table
                    } else {
                        alert('Error: ' + data.message);
                    }
                } catch (error) {
                    console.error('Error deleting student:', error);
                    alert('An error occurred while trying to delete the student.');
                }
            }
        }
        
        // Add a single event listener to the parent element for all delete buttons
        studentsTablePlaceholder.addEventListener('click', function(event) {
            if (event.target.classList.contains('delete-student-btn')) {
                const studentId = event.target.getAttribute('data-student-id');
                const studentName = event.target.getAttribute('data-student-name');
                deleteStudent(studentId, studentName);
            }
        });

        async function fetchAttendanceData() {
            attendanceTablePlaceholder.innerHTML = '<p>Loading attendance data...</p>';
            try {
                const response = await fetch('/api/attendance_data');
                const data = await response.json();
                
                if (data.length === 0) {
                    attendanceTablePlaceholder.innerHTML = '<p>No attendance records found.</p>';
                    return;
                }

                let tableHtml = `
                    <table class="attendance-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                data.forEach(record => {
                    const timestamp = new Date(record.timestamp).toLocaleString();
                    tableHtml += `
                        <tr>
                            <td>${record.name}</td>
                            <td>${record.roll_no}</td>
                            <td>${timestamp}</td>
                        </tr>
                    `;
                });
                tableHtml += `</tbody></table>`;
                attendanceTablePlaceholder.innerHTML = tableHtml;

            } catch (error) {
                console.error("Error fetching attendance data:", error);
                attendanceTablePlaceholder.innerHTML = '<p style="color: red;">Failed to load attendance data.</p>';
            }
        }
        
        startCameraButton.addEventListener('click', startCameraForAdmin);
        capturePhotoButton.addEventListener('click', capturePhoto);
        stopCameraButton.addEventListener('click', stopCameraForAdmin);

        imageUploadInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                stopCameraForAdmin();
                const reader = new FileReader();
                reader.onload = function(e) {
                    capturedImage.src = e.target.result;
                    capturedImage.style.display = 'block';
                    cameraVideo.style.display = 'none';
                    cameraMessage.style.display = 'none';
                    console.log("Image uploaded.");
                };
                reader.readAsDataURL(file);
            }
        });

        saveStudentDataButton.addEventListener('click', async function() {
            const name = studentNameInput.value.trim();
            const rollNo = studentRollNoInput.value.trim();
            const photoData = capturedImage.src;

            if (!name || !rollNo) {
                alert('Please enter student name and roll number.');
                return;
            }
            if (!photoData || photoData.includes('data:,')) {
                alert('Please upload or capture a student photo.');
                return;
            }

            try {
                const response = await fetch('/api/register_student', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, rollNo: rollNo, photo: photoData })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Student registered successfully!');
                    studentNameInput.value = '';
                    studentRollNoInput.value = '';
                    imageUploadInput.value = '';
                    capturedImage.src = '';
                    capturedImage.style.display = 'none';
                    cameraMessage.textContent = 'Ready for new photo.';
                    cameraMessage.style.display = 'block';
                    stopCameraForAdmin();
                    fetchStudentsData(); // Refresh the student table
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while saving student data.');
            }
        });

        refreshAttendanceButton.addEventListener('click', fetchAttendanceData);

        // Fetch data when the page loads
        fetchStudentsData();
        fetchAttendanceData();
        
        // Handle the Export to Excel button click
        exportExcelButton.addEventListener('click', function() {
            window.location.href = '/api/export_excel';
        });

        logoutButton.addEventListener('click', function() {
            alert('Logging out...');
            window.location.href = 'admin_login';
        });

        window.addEventListener('beforeunload', stopCameraForAdmin);
    }
});
}
