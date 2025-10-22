const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const { ref, set, get, onValue, update } = require('firebase/database');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('./rbacConfig'); // Adjusted path for standalone server

const PORT = parseInt(process.env.PORT, 10) || 8080;
const rawClientOrigins = process.env.CLIENT_ORIGINS || process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
const clientOrigins = rawClientOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigins = clientOrigins.length ? clientOrigins : true;

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON provided.');
    }
  }

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(__dirname, serviceAccountPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Firebase service account file not found at: ${resolvedPath}`);
    }
    try {
      const fileContents = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(fileContents);
    } catch (error) {
      throw new Error(`Failed to read Firebase service account file at ${resolvedPath}: ${error.message}`);
    }
  }

  // Removed the hardcoded reference to the original project's service account file
  console.warn(
    '[server] No service account configuration provided via environment variables or specified path.'
  );
  return null;
};

const serviceAccount = loadServiceAccount();

if (!serviceAccount) {
  throw new Error(
    'Firebase service account credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH in your .env file.'
  );
}

const databaseURL =
  process.env.FIREBASE_DATABASE_URL || 'https://illuminate-41282-default-rtdb.firebaseio.com'; // Default URL, user should configure

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });
}

const db = admin.database(); // Get a reference to the Firebase Realtime Database

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

const coerceSlotArray = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object') {
    return Object.values(value);
  }
  return [value];
};

const normalizeSlotArray = (slots) => {
  return Array.from(new Set(coerceSlotArray(slots).filter(Boolean))).sort();
};


app.use(express.json());
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.get('/', (req, res) => {
  res.send('Chat and Appointment server is running!');
});

// --- Appointment Service Logic (adapted for server-side) ---
const appointmentService = {
  bookAppointment: async (appointmentData) => {
    try {
      const { userId, doctorId, date, timeSlot, ...restData } = appointmentData;
      const appointmentRef = db.ref(`appointments/${userId}/${doctorId}/${date}/${timeSlot}`);
      
      const appointment = {
        ...restData,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await appointmentRef.set(appointment);

      // Emit Socket.IO event for new appointment booking
      io.emit('appointmentStatusUpdated', {
        appointmentId: `${userId}_${doctorId}_${date}_${timeSlot}`,
        status: appointment.status,
        notes: 'New appointment booked',
        ...appointment // Include full appointment data for frontend to update
      });

      return `${userId}_${doctorId}_${date}_${timeSlot}`;
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  },

  getUserAppointments: async (userId) => {
    const userAppointmentsRef = db.ref(`appointments/${userId}`);
    const snapshot = await userAppointmentsRef.once('value');
    const appointments = [];
    if (snapshot.exists()) {
      snapshot.forEach((doctorSnapshot) => {
        doctorSnapshot.forEach((dateSnapshot) => {
          dateSnapshot.forEach((timeSlotSnapshot) => {
            appointments.push({
              id: `${userId}_${doctorSnapshot.key}_${dateSnapshot.key}_${timeSlotSnapshot.key}`,
              userId: userId,
              doctorId: doctorSnapshot.key,
              date: dateSnapshot.key,
              timeSlot: timeSlotSnapshot.key,
              ...timeSlotSnapshot.val()
            });
          });
        });
      });
    }
    return appointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  },

  getDoctorAppointments: async (doctorId) => {
    const appointmentsRef = db.ref('appointments');
    const snapshot = await appointmentsRef.once('value');
    const appointments = [];
    if (snapshot.exists()) {
      snapshot.forEach((userSnapshot) => {
        userSnapshot.forEach((doctorSnapshot) => {
          if (doctorSnapshot.key === doctorId) {
            doctorSnapshot.forEach((dateSnapshot) => {
              dateSnapshot.forEach((timeSlotSnapshot) => {
                appointments.push({
                  id: `${userSnapshot.key}_${doctorId}_${dateSnapshot.key}_${timeSlotSnapshot.key}`,
                  userId: userSnapshot.key,
                  doctorId: doctorId,
                  date: dateSnapshot.key,
                  timeSlot: timeSlotSnapshot.key,
                  ...timeSlotSnapshot.val()
                });
              });
            });
          }
        });
      });
    }
    return appointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  },

  updateAppointmentStatus: async (appointmentId, status, notes = '') => {
    try {
      // appointmentId format: userId_doctorId_date_timeSlot
      const parts = appointmentId.split('_');
      if (parts.length !== 4) {
        throw new Error('Invalid appointmentId format');
      }
      const [userId, doctorId, date, timeSlot] = parts;
      const appointmentRef = db.ref(`appointments/${userId}/${doctorId}/${date}/${timeSlot}`);
      const updates = {
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (notes) {
        updates.notes = notes;
      }
      
      await appointmentRef.update(updates);
      // Emit Socket.IO event for appointment status update
      io.emit('appointmentStatusUpdated', { appointmentId, status, notes });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  },

  getAvailableSlots: async (doctorId, date, appointmentType = null) => {
    try {
      console.log(`[Backend] Fetching available slots for doctor ${doctorId} on ${date} (type: ${appointmentType})`);

      // Fetch from doctorSchedules path
      const doctorScheduleRef = db.ref(`doctors/${doctorId}/availableSlots/${date}`);
      const doctorScheduleSnapshot = await doctorScheduleRef.once('value');
      const doctorScheduleData = doctorScheduleSnapshot.val();

      let allSlots = new Set();
      const normalizedType = appointmentType ? appointmentType.toLowerCase() : null;

      if (doctorScheduleData) {
        const virtualSlots = doctorScheduleData.virtualSlots || [];
        const clinicSlots = doctorScheduleData.clinicSlots || [];

        if (!normalizedType || normalizedType === 'clinic') {
          normalizeSlotArray(clinicSlots).forEach(slot => allSlots.add(slot));
        }
        if (!normalizedType || normalizedType === 'virtual') {
          normalizeSlotArray(virtualSlots).forEach(slot => allSlots.add(slot));
        }
      } else {
        console.log(`[Backend] No schedule found in doctorSchedules for ${doctorId} on ${date}.`);
      }

      // Fetch booked appointments to filter out unavailable slots
      const appointmentsRef = db.ref('appointments');
      const snapshot = await appointmentsRef.once('value');
      
      const bookedSlots = new Set();
      if (snapshot.exists()) {
        const allAppointments = snapshot.val();
        Object.values(allAppointments).forEach(userAppointments => {
          if (userAppointments[doctorId] && userAppointments[doctorId][date]) {
            Object.keys(userAppointments[doctorId][date]).forEach(timeSlot => {
              if (userAppointments[doctorId][date][timeSlot].status !== 'cancelled') {
                bookedSlots.add(timeSlot);
              }
            });
          }
        });
      }
      
      const availableSlots = [...allSlots].filter(slot => !bookedSlots.has(slot));
      console.log(`[Backend] Found ${availableSlots.length} available slots for ${doctorId} on ${date}.`);
      return availableSlots.sort();
    } catch (error) {
      console.error('[Backend] Error getting available slots:', error);
      throw error;
    }
  },

  cancelAppointment: async (appointmentId, reason = '') => {
    try {
      await appointmentService.updateAppointmentStatus(appointmentId, 'cancelled', reason);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  },

  rescheduleAppointment: async (appointmentId, newDate, newTime) => {
    try {
      // appointmentId format: userId_doctorId_date_timeSlot
      const parts = appointmentId.split('_');
      if (parts.length !== 4) {
        throw new Error('Invalid appointmentId format');
      }
      const [userId, doctorId, oldDate, oldTimeSlot] = parts;

      // First, get the existing appointment data
      const oldAppointmentRef = db.ref(`appointments/${userId}/${doctorId}/${oldDate}/${oldTimeSlot}`);
      const oldAppointmentSnapshot = await oldAppointmentRef.once('value');
      if (!oldAppointmentSnapshot.exists()) {
        throw new Error('Original appointment not found for rescheduling.');
      }
      const oldAppointmentData = oldAppointmentSnapshot.val();

      // Create a new appointment entry with the new date/time
      const newAppointmentRef = db.ref(`appointments/${userId}/${doctorId}/${newDate}/${newTime}`);
      const newAppointmentData = {
        ...oldAppointmentData,
        date: newDate,
        timeSlot: newTime,
        dateTime: new Date(`${newDate} ${newTime}`).toISOString(),
        status: 'rescheduled',
        updatedAt: new Date().toISOString()
      };
      await newAppointmentRef.set(newAppointmentData);

      // Remove the old appointment entry
      await oldAppointmentRef.remove();

    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      throw error;
    }
  },

  // Function to save doctor's schedule (used by ScheduleScreen)
  saveDoctorSchedule: async (doctorId, dateString, virtualSlots, clinicSlots) => {
      try {
        const virtualSlotsRef = db.ref(`doctors/${doctorId}/availableSlots/${dateString}/virtual`);
        const clinicSlotsRef = db.ref(`doctors/${doctorId}/availableSlots/${dateString}/clinic`);
  
        const sanitizedVirtualSlots = normalizeSlotArray(virtualSlots);
        const sanitizedClinicSlots = normalizeSlotArray(clinicSlots);

        await virtualSlotsRef.set(sanitizedVirtualSlots);
        await clinicSlotsRef.set(sanitizedClinicSlots);
        return {
          success: true,
          virtual: sanitizedVirtualSlots,
          clinic: sanitizedClinicSlots
        };
      } catch (error) {
        console.error('Error saving doctor schedule:', error);
        throw error;
      }
    },

  // Function to fetch doctor's schedule (used by ScheduleScreen)
  fetchDoctorSchedule: async (doctorId, dateString) => {
    try {
      const virtualSlotsRef = db.ref(`doctors/${doctorId}/availableSlots/${dateString}/virtual`);
      const clinicSlotsRef = db.ref(`doctors/${doctorId}/availableSlots/${dateString}/clinic`);

      const virtualSnapshot = await virtualSlotsRef.once('value');
      const clinicSnapshot = await clinicSlotsRef.once('value');

        const fetchedVirtualSlots = normalizeSlotArray(virtualSnapshot.exists() ? virtualSnapshot.val() : []);
        const fetchedClinicSlots = normalizeSlotArray(clinicSnapshot.exists() ? clinicSnapshot.val() : []);
        
        return { virtual: fetchedVirtualSlots, clinic: fetchedClinicSlots };
    } catch (error) {
      console.error('Error fetching doctor schedule:', error);
      throw error;
    }
  }
};

// --- Prescription Service Logic (server-side) ---
const prescriptionService = {
  issuePrescription: async (prescriptionData) => {
    try {
      const { patientId, doctorId, medications, instructions, issueDate, doctorName, doctorSpecialty, notes } = prescriptionData;
      const prescriptionsRef = db.ref(`prescriptions`);
      const newPrescriptionRef = prescriptionsRef.push();
      const prescriptionId = newPrescriptionRef.key;

      const prescription = {
        id: prescriptionId,
        patientId,
        doctorId,
        doctorName,
        doctorSpecialty,
        medications,
        instructions,
        notes: notes || '',
        issueDate,
        createdAt: new Date().toISOString(),
      };

      await newPrescriptionRef.set(prescription);
      return prescriptionId;
    } catch (error) {
      console.error('Error issuing prescription:', error);
      throw error;
    }
  },

  getPatientPrescriptions: async (patientId) => {
    const prescriptionsRef = db.ref('prescriptions').orderByChild('patientId').equalTo(patientId);
    const snapshot = await prescriptionsRef.once('value');
    const prescriptions = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        prescriptions.push(childSnapshot.val());
      });
    }
    return prescriptions.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
  },

  getPrescriptionDetails: async (prescriptionId) => {
    const prescriptionRef = db.ref(`prescriptions/${prescriptionId}`);
    const snapshot = await prescriptionRef.once('value');
    if (snapshot.exists()) {
      return snapshot.val();
    }
    throw new Error('Prescription not found');
  },
};


// --- Express API Endpoints for Appointments ---

// Middleware to handle errors
// Middleware to authenticate and authorize requests
const authenticateAndAuthorize = (requiredPermissions = []) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Attach decoded token to request

    // Fetch user role from Firebase Realtime Database
    const userRef = db.ref(`users/${decodedToken.uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData || !userData.role) {
      // For a standalone chat server, we might default to a 'user' role or skip role-based authorization
      // For now, we'll allow access if no role is found, but this should be reviewed based on security needs.
      console.warn(`User ${decodedToken.uid} has no role defined. Proceeding with default access.`);
      req.user.role = 'user'; // Default role if not found
    } else {
      req.user.role = userData.role; // Attach user role to request
    }

    // Check permissions - simplified for standalone server, assuming PERMISSIONS and ROLE_PERMISSIONS are defined in rbacConfig.js
    if (requiredPermissions.length > 0) {
      const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
      const hasAllRequired = requiredPermissions.every(perm => userPermissions.includes(perm));

      if (!hasAllRequired) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
      }
    }
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or fetching user role:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token or authentication failed.' });
  }
};

// Middleware to handle errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Book Appointment
app.post('/api/appointments/book', authenticateAndAuthorize([PERMISSIONS.BOOK_APPOINTMENT]), async (req, res) => {
  try {
    const appointmentId = await appointmentService.bookAppointment(req.body);
    res.status(201).json({ message: 'Appointment booked successfully', appointmentId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User Appointments
app.get('/api/appointments/user/:userId', authenticateAndAuthorize([PERMISSIONS.VIEW_APPOINTMENTS_USER]), async (req, res) => {
  try {
    const { userId } = req.params;
    // Ensure user can only view their own appointments unless they are a doctor or admin
    if (req.user.uid !== userId && req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot view other users\' appointments.' });
    }
    const appointments = await appointmentService.getUserAppointments(userId);
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Doctor Appointments
app.get('/api/appointments/doctor/:doctorId', authenticateAndAuthorize([PERMISSIONS.MANAGE_APPOINTMENTS_DOCTOR]), async (req, res) => {
  try {
    const { doctorId } = req.params;
    // Ensure doctor can only view their own appointments unless they are an admin
    if (req.user.uid !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot view other doctors\' appointments.' });
    }
    const appointments = await appointmentService.getDoctorAppointments(doctorId);
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Appointment Status
app.put('/api/appointments/:appointmentId/status', authenticateAndAuthorize([PERMISSIONS.MANAGE_APPOINTMENTS_DOCTOR]), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;
    // Further check: ensure the doctor updating the status is the one associated with the appointment
    const parts = appointmentId.split('_');
    if (parts.length !== 4) {
      return res.status(400).json({ error: 'Invalid appointmentId format' });
    }
    const [, doctorId] = parts;
    if (req.user.uid !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot update status for other doctors\' appointments.' });
    }

    await appointmentService.updateAppointmentStatus(appointmentId, status, notes);
    res.status(200).json({ message: 'Appointment status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Available Slots
app.get('/api/appointments/slots/:doctorId/:date', authenticateAndAuthorize([PERMISSIONS.BOOK_APPOINTMENT, PERMISSIONS.VIEW_SCHEDULE_DOCTOR]), async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const { type } = req.query;
    const availableSlots = await appointmentService.getAvailableSlots(doctorId, date, type);
    res.status(200).json(availableSlots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel Appointment
app.put('/api/appointments/:appointmentId/cancel', authenticateAndAuthorize([PERMISSIONS.VIEW_APPOINTMENTS_USER, PERMISSIONS.MANAGE_APPOINTMENTS_DOCTOR]), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    // Ensure user can only cancel their own appointment, or doctor/admin can cancel any
    const parts = appointmentId.split('_');
    if (parts.length !== 4) {
      return res.status(400).json({ error: 'Invalid appointmentId format' });
    }
    const [userId, doctorId] = parts;
    if (req.user.uid !== userId && req.user.uid !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot cancel this appointment.' });
    }

    await appointmentService.cancelAppointment(appointmentId, reason);
    res.status(200).json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reschedule Appointment
app.put('/api/appointments/:appointmentId/reschedule', authenticateAndAuthorize([PERMISSIONS.VIEW_APPOINTMENTS_USER, PERMISSIONS.MANAGE_APPOINTMENTS_DOCTOR]), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDate, newTime } = req.body;
    // Ensure user can only reschedule their own appointment, or doctor/admin can reschedule any
    const parts = appointmentId.split('_');
    if (parts.length !== 4) {
      return res.status(400).json({ error: 'Invalid appointmentId format' });
    }
    const [userId, doctorId] = parts;
    if (req.user.uid !== userId && req.user.uid !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot reschedule this appointment.' });
    }

    await appointmentService.rescheduleAppointment(appointmentId, newDate, newTime);
    res.status(200).json({ message: 'Appointment rescheduled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save Doctor Schedule
app.post('/api/doctors/:doctorId/schedule/:date', authenticateAndAuthorize([PERMISSIONS.VIEW_SCHEDULE_DOCTOR]), async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    // Ensure doctor can only save their own schedule unless they are an admin
    if (req.user.uid !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot save other doctors\' schedules.' });
    }
    const { virtualSlots, clinicSlots } = req.body;
    await appointmentService.saveDoctorSchedule(doctorId, date, virtualSlots, clinicSlots);
    res.status(200).json({ message: 'Doctor schedule saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Doctor Schedule
app.get('/api/doctors/:doctorId/schedule/:date', authenticateAndAuthorize([PERMISSIONS.VIEW_SCHEDULE_DOCTOR, PERMISSIONS.BOOK_APPOINTMENT]), async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const schedule = await appointmentService.fetchDoctorSchedule(doctorId, date);
    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/doctors/:doctorId/monthly-schedule/:yearMonth
app.get('/api/doctors/:doctorId/monthly-schedule/:yearMonth', authenticateAndAuthorize([PERMISSIONS.VIEW_SCHEDULE_DOCTOR, PERMISSIONS.BOOK_APPOINTMENT]), async (req, res) => {
  const { doctorId, yearMonth } = req.params;
  const { type } = req.query; // 'clinic' or 'virtual'

  if (!doctorId || !yearMonth) {
    return res.status(400).json({ error: 'Doctor ID and year-month are required.' });
  }

  try {
    const [year, month] = yearMonth.split('-');
    const startDate = new Date(year, parseInt(month) - 1, 1); // Month is 0-indexed
    const endDate = new Date(year, parseInt(month), 0); // Last day of the month

    const monthlySlots = {};

    // Iterate through each day of the month
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const formattedDate = d.toISOString().split('T')[0]; // YYYY-MM-DD

      const scheduleRef = db.ref(`doctors/${doctorId}/availableSlots/${formattedDate}`);
      const snapshot = await get(scheduleRef);

      if (snapshot.exists()) {
        const daySchedule = snapshot.val();
        let slotsForDate = [];

        if (type === 'clinic' && daySchedule.clinic) {
          slotsForDate = daySchedule.clinic;
        } else if (type === 'virtual' && daySchedule.virtual) {
          slotsForDate = daySchedule.virtual;
        } else if (!type) { // If no type specified, return all slots
          slotsForDate = [...(daySchedule.clinic || []), ...(daySchedule.virtual || [])];
        }
        
        if (slotsForDate.length > 0) {
          monthlySlots[formattedDate] = slotsForDate;
        }
      }
    }
    res.status(200).json(monthlySlots);
  } catch (error) {
    console.error('Backend: Error fetching monthly schedule:', error);
    res.status(500).json({ error: 'Failed to fetch monthly schedule.' });
  }
});

// --- Express API Endpoints for Prescriptions ---

// Issue Prescription
app.post('/api/prescriptions/issue', authenticateAndAuthorize([PERMISSIONS.ISSUE_PRESCRIPTION]), async (req, res) => {
  try {
    const prescriptionId = await prescriptionService.issuePrescription(req.body);
    res.status(201).json({ message: 'Prescription issued successfully', prescriptionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Patient Prescriptions
app.get('/api/prescriptions/patient/:patientId', authenticateAndAuthorize([PERMISSIONS.MANAGE_PRESCRIPTIONS, PERMISSIONS.VIEW_PATIENTS_DOCTOR]), async (req, res) => {
  try {
    const { patientId } = req.params;
    // Ensure user can only view their own prescriptions, or doctor/admin can view any
    if (req.user.uid !== patientId && req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot view other patients\' prescriptions.' });
    }
    const prescriptions = await prescriptionService.getPatientPrescriptions(patientId);
    res.status(200).json(prescriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Prescription Details
app.get('/api/prescriptions/:prescriptionId', authenticateAndAuthorize([PERMISSIONS.MANAGE_PRESCRIPTIONS, PERMISSIONS.ISSUE_PRESCRIPTION]), async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const prescription = await prescriptionService.getPrescriptionDetails(prescriptionId);
    // Further check: ensure the user is the patient, the doctor who issued it, or an admin
    if (req.user.uid !== prescription.patientId && req.user.uid !== prescription.doctorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot view this prescription.' });
    }
    res.status(200).json(prescription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


io.on('connection', (socket) => {
  console.log('[Socket.IO Server] Client connected:', socket.id);

  socket.on('joinChat', async ({ chatId, userId }) => { // Made async
    socket.join(chatId);
    socket.chatId = chatId;
    socket.userId = userId;
    console.log(`[Socket.IO Server] User ${userId} joined chat ${chatId}. Socket ID: ${socket.id}`);

    // Fetch chat history from Firebase
    const messagesRef = db.ref(`messages/${chatId}`);
    const snapshot = await messagesRef.once('value');
    const historyMessages = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        historyMessages.push(childSnapshot.val());
      });
    }
    socket.emit('chatHistory', historyMessages);
  });

  socket.on('sendMessage', async ({ chatId, senderId, text, fileUrl, fileType, preview }) => { // Made async
    const timestamp = new Date().toISOString();

    // Store message in Firebase
    const messagesRef = db.ref(`messages/${chatId}`);
    const newMessageRef = messagesRef.push();
    const messageId = newMessageRef.key;

    const messageData = {
      id: messageId,
      chatId,
      senderId,
      text,
      timestamp,
      fileUrl: fileUrl || null,
      fileType: fileType || null,
      preview: typeof preview === 'string' ? preview : '',
      status: 'sent',
      readBy: {
        [senderId]: timestamp,
      },
    };

    await newMessageRef.set(messageData);
    console.log(`[Socket.IO Server] Stored new message in Firebase for chat ${chatId}.`);

    io.to(chatId).emit('newMessage', messageData);
    console.log(`[Socket.IO Server] Message sent in chat ${chatId} by ${senderId}.`);
  });

  socket.on('typingStatus', ({ chatId, userId, isTyping }) => {
    socket.to(chatId).emit('typingStatus', { userId, isTyping });
    console.log(`[Socket.IO Server] Broadcasted typing status (${isTyping}) for user ${userId} in chat ${chatId}.`);
  });

  socket.on('messagesRead', async ({ chatId, readerId, messageIds }) => {
    if (!chatId || !readerId || !Array.isArray(messageIds) || messageIds.length === 0) {
      console.warn('[Socket.IO Server] Invalid messagesRead payload received.', {
        chatId,
        readerId,
        messageIds,
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const updates = {};

    messageIds.forEach((messageId) => {
      if (!messageId) {
        return;
      }
      updates[`messages/${chatId}/${messageId}/readBy/${readerId}`] = timestamp;
      updates[`messages/${chatId}/${messageId}/status`] = 'read';
    });
    updates[`chats/${chatId}/lastMessage/readBy/${readerId}`] = timestamp;
    updates[`chats/${chatId}/lastMessage/status`] = 'read';

    try {
      await db.ref().update(updates);
      console.log(
        `[Socket.IO Server] Marked messages as read in chat ${chatId} for reader ${readerId}:`,
        messageIds
      );
      const payload = { chatId, readerId, messageIds, timestamp };
      io.to(chatId).emit('messagesRead', payload);
    } catch (error) {
      console.error('[Socket.IO Server] Failed to mark messages as read:', error);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO Server] Client disconnected: ${socket.id}, Reason: ${reason}`);
    if (socket.chatId) {
      console.log(`[Socket.IO Server] User ${socket.userId} left chat ${socket.chatId}.`);
    }
  });

  socket.on('error', (error) => {
    console.error('[Socket.IO Server] Socket error:', error);
  });
});

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Firebase Realtime Database connectivity
    const testRef = db.ref('.info/connected');
    const snapshot = await testRef.once('value');
    const isFirebaseConnected = snapshot.val();

    if (isFirebaseConnected) {
      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        message: 'Server and Firebase are operational',
      });
    } else {
      res.status(500).json({
        status: 'degraded',
        uptime: process.uptime(),
        message: 'Server is running, but Firebase connection is down',
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      uptime: process.uptime(),
      message: 'Health check encountered an error',
      error: error.message,
    });
  }
});

// Metrics Endpoint
app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const connectedSockets = io.engine.clientsCount;

  res.status(200).json({
    uptime_seconds: uptime,
    memory_usage_bytes: {
      rss: memoryUsage.rss, // Resident Set Size
      heapTotal: memoryUsage.heapTotal, // Total size of the allocated heap
      heapUsed: memoryUsage.heapUsed, // Actual memory used by the heap
      external: memoryUsage.external, // Memory used by C++ objects bound to JavaScript objects
      arrayBuffers: memoryUsage.arrayBuffers, // Memory allocated for ArrayBuffer and SharedArrayBuffer
    },
    socket_connections: connectedSockets,
    // Add more metrics here as needed, e.g., request counts, error rates
  });
});

server.listen(PORT, () => {
  console.log(`Chat server listening on port ${PORT}`);
  // In a production environment, you might integrate with an uptime monitoring service here
  // For example, ping a monitoring service's API to report server startup.
  // console.log('Server started. Pinging uptime monitoring service...');
});
