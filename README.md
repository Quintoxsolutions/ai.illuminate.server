# Application Server

This is a dedicated Node.js server that acts as a secure bridge between the application and Firebase Realtime Database, handling all backend functionalities including real-time communication, appointment management, and prescription services. It utilizes Socket.IO for real-time interactions and provides a robust API layer with Role-Based Access Control (RBAC).

## Features

- Real-time communication with Socket.IO
- Comprehensive API for various application functionalities
- Secure interaction with Firebase Realtime Database
- Appointment booking, rescheduling, and cancellation
- Doctor schedule management
- Prescription issuance and retrieval
- Role-Based Access Control (RBAC) for API endpoints
- Health check and metrics endpoints

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Quintoxsolutions/ai.illuminate.server.git
    cd ai.illuminate.server
    ```
    **Note:** The repository name is `ai.illuminate.server`, but the internal project name is `app-server`.

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    This server uses Firebase Realtime Database. You need to set up a Firebase project and obtain a service account key.

    a.  Go to your Firebase project in the Firebase Console.
    b.  Navigate to "Project settings" > "Service accounts".
    c.  Click "Generate new private key" and download the JSON file.

    **Option 1: Using `FIREBASE_SERVICE_ACCOUNT` environment variable (recommended for production)**
    Open the downloaded JSON file, copy its entire content, and set it as the `FIREBASE_SERVICE_ACCOUNT` environment variable. Ensure it's a single-line JSON string (you might need to escape double quotes if setting directly in a shell, or use a `.env` file).

    **Option 2: Using `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable**
    Place the downloaded JSON file in a secure location (e.g., `config/firebase/serviceAccountKey.json`) and set the `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable to its relative or absolute path.

    **Option 3: Using a `.env` file**
    Create a file named `.env` in the root of the server directory (`ai.illuminate.server/`). Copy the content from `.env.example` into `.env` and fill in your Firebase credentials and other settings.

    Example `.env` file:
    ```
    FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", "project_id": "your-project-id", "private_key_id": "...", "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", "client_email": "...", "client_id": "...", "auth_uri": "...", "token_uri": "...", "auth_provider_x509_cert_url": "...", "client_x509_cert_url": "...", "universe_domain": "..."}'
    FIREBASE_DATABASE_URL='https://your-project-id-default-rtdb.firebaseio.com'
    PORT=8080
    CLIENT_ORIGINS='http://localhost:3000,https://your-frontend-domain.com'
    ```
    **Note:** Replace `your-project-id` and other placeholder values with your actual Firebase project details.

4.  **Run the server:**
    ```bash
    npm start
    ```
    The server will start on the configured `PORT` (default: 8080).

## API Endpoints

-   `GET /`: Basic server status check.
-   `GET /health`: Health check endpoint to verify server and Firebase connectivity.
-   `GET /metrics`: Provides server performance metrics.

**Appointments:**
-   `POST /api/appointments/book`
-   `GET /api/appointments/user/:userId`
-   `GET /api/appointments/doctor/:doctorId`
-   `PUT /api/appointments/:appointmentId/status`
-   `GET /api/appointments/slots/:doctorId/:date`
-   `PUT /api/appointments/:appointmentId/cancel`
-   `PUT /api/appointments/:appointmentId/reschedule`
-   `POST /api/doctors/:doctorId/schedule/:date`
-   `GET /api/doctors/:doctorId/schedule/:date`
-   `GET /api/doctors/:doctorId/monthly-schedule/:yearMonth`

**Prescriptions:**
-   `POST /api/prescriptions/issue`
-   `GET /api/prescriptions/patient/:patientId`
-   `GET /api/prescriptions/:prescriptionId`

## Socket.IO Events

-   `joinChat`: Client joins a chat room.
-   `sendMessage`: Client sends a message.
-   `typingStatus`: Client sends typing status.
-   `messagesRead`: Client marks messages as read.
-   `newMessage`: Server broadcasts new messages.
-   `chatHistory`: Server sends chat history to a newly joined client.
-   `appointmentStatusUpdated`: Server broadcasts appointment status updates.

## RBAC Configuration

The `rbacConfig.js` file defines `PERMISSIONS` and `ROLE_PERMISSIONS` for `user`, `doctor`, and `admin` roles. The `authenticateAndAuthorize` middleware in `server.js` enforces these permissions for API endpoints.
