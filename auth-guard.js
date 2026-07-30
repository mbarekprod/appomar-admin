// =========================================================
// حارس الدخول — يتأكد إنو المستخدم مسجل دخول بـ Firebase Auth
// و إيميلو موجود فـ ADMIN_EMAILS قبل ما يورّي محتوى اللوحة.
// أي زبون عادي (حساب مسجل من login.html متاع الموقع الأساسي)
// ما يقدرش يدخل هنا حتى لو عندو حساب صحيح.
// =========================================================
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { auth } from "./firebase.js";
import { ADMIN_EMAILS } from "./admin-config.js";

window.doLogout = async function () {
  await signOut(auth);
  window.location.href = "login.html";
};

onAuthStateChanged(auth, (user) => {
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    window.location.href = "login.html";
    return;
  }
  const emailEl = document.getElementById("adminEmail");
  if (emailEl) emailEl.textContent = user.email;
  document.documentElement.style.visibility = "visible";
});
