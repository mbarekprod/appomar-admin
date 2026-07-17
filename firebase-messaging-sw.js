// استيراد ملفات Firebase للـ Service Worker
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

// تهيئة Firebase
firebase.initializeApp({
  apiKey: "AIzaSyClwbk9bCyY5YZO5jBMbjo4IWCqGfYcDCw",
  projectId: "base-resto-3d1e8",
  messagingSenderId: "797391462536"
});

const messaging = firebase.messaging();
