
import { db } from "./firebase.js";
console.log("DB =", db);
console.log("ADMIN LOADED");
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const categoriesRef = collection(db, "categories");
const productsRef = collection(db, "products");
const variantsRef = collection(db, "variants");
const loyaltyRef = collection(db, "loyalty");
const wheelResultsRef = collection(db, "wheelResults");
const locationsRef = collection(db, "locations");
const eventsRef = collection(db, "events");
const notificationsRef = collection(db, "notifications");
const wheelScheduleRef = doc(db, "settings", "wheelSchedule");

// Cache
let categoriesCache = [];
let productsCache = [];
let currentLocationFilter = "all";

// =========================
// TOAST NOTIFICATIONS
// =========================
window.showToast = function(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || "✅"}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
};

// =========================
// MODAL MANAGEMENT
// =========================
window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("active");
};
window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
};
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("active");
  }
});

// =========================
// NAVIGATION
// =========================
const sectionTitles = {
  dashboard: "📊 لوحة التحكم",
  categories: "📂 إدارة الأصناف",
  products: "🍽️ إدارة المنتجات",
  variants: "🔀 إدارة الخيارات",
  loyalty: "💳 نقاط الوفاء",
  wheel: "🎡 عجلة الحظ",
  events: "🎉 الإيفينمونات",
  locations: "📍 مواقع الزبائن",
  notifications: "📢 الإشعارات"
};

window.navigateTo = function(section) {
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  const link = document.querySelector(`.nav-link[data-section="${section}"]`);
  if (link) link.classList.add("active");
  document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
  const sec = document.getElementById(`section-${section}`);
  if (sec) sec.classList.add("active");
  const title = document.getElementById("pageTitle");
  if (title) title.textContent = sectionTitles[section] || "لوحة التحكم";
  if (window.innerWidth <= 900) {
    document.getElementById("sidebar").classList.remove("open");
  }
};

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo(link.dataset.section);
  });
});

// Mobile sidebar
const mobileToggle = document.getElementById("mobileToggle");
if (mobileToggle) {
  mobileToggle.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

// =========================
// DATE DISPLAY
// =========================
const topbarDate = document.getElementById("topbarDate");
if (topbarDate) {
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  topbarDate.textContent = now.toLocaleDateString("ar-EG", options);
}

// =========================
// CATEGORIES MANAGEMENT
// =========================
window.addCategory = async function() {
  const name = document.getElementById("categoryName").value.trim();
  const color = document.getElementById("categoryColor").value;
  const icon = document.getElementById("categoryIcon").value.trim() || "📂";
  if (!name) {
    showToast("أدخل اسم الصنف", "error");
    return;
  }
  try {
    await addDoc(categoriesRef, {
      name,
      color,
      icon,
      createdAt: Date.now()
    });
    document.getElementById("categoryName").value = "";
    document.getElementById("categoryIcon").value = "";
    closeModal("addCategoryModal");
    showToast("تمت إضافة الصنف بنجاح", "success");
  } catch (err) {
    showToast("خطأ في الإضافة: " + err.message, "error");
  }
};

window.deleteCategory = async function(id) {
  if (!confirm("حذف هذا الصنف؟ سيتم حذف منتجاته أيضاً.")) return;
  try {
    // Delete products in this category
    const q = query(productsRef, where("categoryId", "==", id));
    const snap = await new Promise((resolve) => {
      const unsub = onSnapshot(q, (s) => { unsub(); resolve(s); });
    });
    const promises = [];
    snap.forEach(d => promises.push(deleteDoc(doc(db, "products", d.id))));
    await Promise.all(promises);
    await deleteDoc(doc(db, "categories", id));
    showToast("تم حذف الصنف ومنتجاته", "success");
  } catch (err) {
    showToast("خطأ في الحذف: " + err.message, "error");
  }
};

function loadCategories() {
  const list = document.getElementById("categoriesList");
  if (!list) return;
  const q = query(categoriesRef, orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    categoriesCache = [];
    snapshot.forEach(cat => categoriesCache.push({ id: cat.id, ...cat.data() }));
    if (categoriesCache.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>لا توجد أصناف بعد</p><button class="btn btn-gold" onclick="openModal('addCategoryModal')">➕ إضافة صنف</button></div>`;
      return;
    }
    list.innerHTML = categoriesCache.map(cat => `
      <div class="item-card" style="border-right: 5px solid ${cat.color || '#ffd54f'}">
        <div class="item-card-header">
          <span class="item-icon" style="background:${cat.color || '#ffd54f'}22; color:${cat.color || '#ffd54f'}">${cat.icon || '📂'}</span>
          <div class="item-info">
            <h3>${cat.name}</h3>
            <span class="item-meta">${countProductsInCategory(cat.id)} منتج</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-outline" onclick="showCategoryProducts('${cat.id}')">🍽️ المنتجات</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')">🗑️ حذف</button>
        </div>
      </div>
    `).join("");
    updateCategorySelects();
  });
}

function countProductsInCategory(catId) {
  return productsCache.filter(p => p.categoryId === catId).length;
}

window.showCategoryProducts = function(catId) {
  navigateTo("products");
  const filter = document.getElementById("filterCategory");
  if (filter) {
    filter.value = catId;
    filterProducts();
  }
};

function updateCategorySelects() {
  const selects = [
    document.getElementById("productCategory"),
    document.getElementById("filterCategory")
  ];
  selects.forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value;
    const isFilter = sel.id === "filterCategory";
    sel.innerHTML = isFilter ? '<option value="all">كل الأصناف</option>' : '<option value="">اختر الصنف</option>';
    categoriesCache.forEach(cat => {
      sel.innerHTML += `<option value="${cat.id}">${cat.icon || '📂'} ${cat.name}</option>`;
    });
    sel.value = currentVal;
  });
}

// =========================
// PRODUCTS MANAGEMENT
// =========================
window.openAddProductModal = function() {
  document.getElementById("editProductId").value = "";
  document.getElementById("productModalTitle").textContent = "➕ إضافة منتج جديد";
  document.getElementById("saveProductBtn").textContent = "💾 حفظ المنتج";
  document.getElementById("productName").value = "";
  document.getElementById("productPrice").value = "";
  document.getElementById("productCurrency").value = "د.ج";
  document.getElementById("productDescription").value = "";
  document.getElementById("productImage").value = "";
  document.getElementById("productTags").value = "";
  document.getElementById("productAvailable").checked = true;
  openModal("addProductModal");
};

window.editProduct = function(id) {
  const product = productsCache.find(p => p.id === id);
  if (!product) return;
  document.getElementById("editProductId").value = id;
  document.getElementById("productModalTitle").textContent = "✏️ تعديل المنتج";
  document.getElementById("saveProductBtn").textContent = "💾 حفظ التعديلات";
  document.getElementById("productCategory").value = product.categoryId || "";
  document.getElementById("productName").value = product.name || "";
  document.getElementById("productPrice").value = product.price || "";
  document.getElementById("productCurrency").value = product.currency || "د.ج";
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productImage").value = product.image || "";
  document.getElementById("productTags").value = (product.tags || []).join(", ");
  document.getElementById("productAvailable").checked = product.available !== false;
  openModal("addProductModal");
};

window.saveProduct = async function() {
  const editId = document.getElementById("editProductId").value;
  const categoryId = document.getElementById("productCategory").value;
  const name = document.getElementById("productName").value.trim();
  const price = parseFloat(document.getElementById("productPrice").value);
  const currency = document.getElementById("productCurrency").value.trim() || "د.ج";
  const description = document.getElementById("productDescription").value.trim();
  const image = document.getElementById("productImage").value.trim();
  const tags = document.getElementById("productTags").value.split(",").map(t => t.trim()).filter(Boolean);
  const available = document.getElementById("productAvailable").checked;

  if (!categoryId) { showToast("اختر الصنف", "error"); return; }
  if (!name) { showToast("أدخل اسم المنتج", "error"); return; }
  if (isNaN(price) || price < 0) { showToast("أدخل سعراً صحيحاً", "error"); return; }

  const category = categoriesCache.find(c => c.id === categoryId);
  const data = {
    categoryId,
    categoryName: category ? category.name : "",
    name,
    price,
    currency,
    description,
    image,
    tags,
    available,
    updatedAt: Date.now()
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "products", editId), data);
      showToast("تم تحديث المنتج", "success");
    } else {
      data.createdAt = Date.now();
      await addDoc(productsRef, data);
      showToast("تمت إضافة المنتج", "success");
    }
    closeModal("addProductModal");
  } catch (err) {
    showToast("خطأ: " + err.message, "error");
  }
};

window.deleteProduct = async function(id) {
  if (!confirm("حذف هذا المنتج؟")) return;
  try {
    // Delete variants of this product
    const q = query(variantsRef, where("productId", "==", id));
    const snap = await new Promise(resolve => {
      const unsub = onSnapshot(q, s => { unsub(); resolve(s); });
    });
    const promises = [];
    snap.forEach(d => promises.push(deleteDoc(doc(db, "variants", d.id))));
    await Promise.all(promises);
    await deleteDoc(doc(db, "products", id));
    showToast("تم حذف المنتج", "success");
  } catch (err) {
    showToast("خطأ: " + err.message, "error");
  }
};

window.toggleProductAvailability = async function(id, current) {
  try {
    await updateDoc(doc(db, "products", id), { available: !current, updatedAt: Date.now() });
    showToast(current ? "تم إخفاء المنتج" : "تم إظهار المنتج", "success");
  } catch (err) {
    showToast("خطأ: " + err.message, "error");
  }
};

function loadProducts() {
  const list = document.getElementById("productsList");
  if (!list) return;
  const q = query(productsRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    productsCache = [];
    snapshot.forEach(p => productsCache.push({ id: p.id, ...p.data() }));
    updateStat("statProducts", productsCache.length);
    filterProducts();
  });
}

window.filterProducts = function() {
  const list = document.getElementById("productsList");
  if (!list) return;
  const catFilter = document.getElementById("filterCategory")?.value || "all";
  const search = (document.getElementById("searchProduct")?.value || "").toLowerCase();

  let filtered = productsCache;
  if (catFilter !== "all") filtered = filtered.filter(p => p.categoryId === catFilter);
  if (search) filtered = filtered.filter(p => (p.name || "").toLowerCase().includes(search));

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🍽️</div><p>لا توجد منتجات</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(p => {
    const cat = categoriesCache.find(c => c.id === p.categoryId);
    const variantCount = variantsCache.filter(v => v.productId === p.id).length;
    return `
    <div class="product-card ${p.available === false ? 'unavailable' : ''}">
      <div class="product-image" style="background-image:url('${p.image || 'https://via.placeholder.com/300x200/222/ffd54f?text=🍽️'}')">
        ${p.available === false ? '<span class="badge badge-red">غير متاح</span>' : ''}
        ${p.tags && p.tags.includes('جديد') ? '<span class="badge badge-green">جديد</span>' : ''}
      </div>
      <div class="product-body">
        <div class="product-category">${cat ? cat.icon + ' ' + cat.name : '📂'}</div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description || 'لا يوجد وصف'}</p>
        <div class="product-price">${p.price} ${p.currency || 'د.ج'}</div>
        <div class="product-meta">
          <span>🔀 ${variantCount} خيار</span>
          ${p.tags && p.tags.length ? `<span>🏷️ ${p.tags.slice(0,2).join(', ')}</span>` : ''}
        </div>
      </div>
      <div class="product-actions">
        <button class="btn btn-sm btn-outline" onclick="toggleProductAvailability('${p.id}', ${p.available !== false})">
          ${p.available === false ? '✅ تفعيل' : '🚫 إخفاء'}
        </button>
        <button class="btn btn-sm btn-primary" onclick="editProduct('${p.id}')">✏️ تعديل</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">🗑️ حذف</button>
      </div>
    </div>
    `;
  }).join("");
};

// =========================
// VARIANTS MANAGEMENT
// =========================
let variantsCache = [];

window.saveVariant = async function() {
  const editId = document.getElementById("editVariantId").value;
  const productId = document.getElementById("variantProduct").value;
  const type = document.getElementById("variantType").value;
  const name = document.getElementById("variantName").value.trim();
  const price = parseFloat(document.getElementById("variantPrice").value) || 0;

  if (!productId) { showToast("اختر المنتج", "error"); return; }
  if (!name) { showToast("أدخل اسم الخيار", "error"); return; }

  const product = productsCache.find(p => p.id === productId);
  const data = {
    productId,
    productName: product ? product.name : "",
    type,
    name,
    price,
    updatedAt: Date.now()
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "variants", editId), data);
      showToast("تم تحديث الخيار", "success");
    } else {
      data.createdAt = Date.now();
      await addDoc(variantsRef, data);
      showToast("تمت إضافة الخيار", "success");
    }
    closeModal("addVariantModal");
    document.getElementById("editVariantId").value = "";
    document.getElementById("variantName").value = "";
    document.getElementById("variantPrice").value = "";
  } catch (err) {
    showToast("خطأ: " + err.message, "error");
  }
};

window.editVariant = function(id) {
  const v = variantsCache.find(x => x.id === id);
  if (!v) return;
  document.getElementById("editVariantId").value = id;
  document.getElementById("variantModalTitle").textContent = "✏️ تعديل الخيار";
  document.getElementById("saveVariantBtn").textContent = "💾 حفظ التعديلات";
  document.getElementById("variantProduct").value = v.productId;
  document.getElementById("variantType").value = v.type || "size";
  document.getElementById("variantName").value = v.name;
  document.getElementById("variantPrice").value = v.price || 0;
  openModal("addVariantModal");
};

window.deleteVariant = async function(id) {
  if (!confirm("حذف هذا الخيار؟")) return;
  try {
    await deleteDoc(doc(db, "variants", id));
    showToast("تم حذف الخيار", "success");
  } catch (err) {
    showToast("خطأ: " + err.message, "error");
  }
};

function loadVariants() {
  const list = document.getElementById("variantsList");
  if (!list) return;
  const q = query(variantsRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    variantsCache = [];
    snapshot.forEach(v => variantsCache.push({ id: v.id, ...v.data() }));
    updateVariantProductSelect();
    renderVariants();
  });
}

function updateVariantProductSelect() {
  const sel = document.getElementById("variantProduct");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">اختر المنتج</option>';
  productsCache.forEach(p => {
    const cat = categoriesCache.find(c => c.id === p.categoryId);
    sel.innerHTML += `<option value="${p.id}">${cat ? cat.icon + ' ' : ''}${p.name}</option>`;
  });
  sel.value = current;
}

function renderVariants() {
  const list = document.getElementById("variantsList");
  if (!list) return;
  if (variantsCache.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔀</div><p>لا توجد خيارات بعد</p><button class="btn btn-gold" onclick="openModal('addVariantModal')">➕ إضافة خيار</button></div>`;
    return;
  }
  // Group by product
  const grouped = {};
  variantsCache.forEach(v => {
    if (!grouped[v.productId]) grouped[v.productId] = [];
    grouped[v.productId].push(v);
  });

  list.innerHTML = Object.keys(grouped).map(pid => {
    const product = productsCache.find(p => p.id === pid);
    const variants = grouped[pid];
    const typeLabels = { size: "📏 حجم", extra: "➕ إضافة", option: "🔘 خيار" };
    return `
    <div class="variant-group">
      <div class="variant-group-header">
        <h3>${product ? product.name : 'منتج محذوف'}</h3>
        <span class="variant-count">${variants.length} خيار</span>
      </div>
      <div class="variant-list">
        ${variants.map(v => `
          <div class="variant-item">
            <div class="variant-info">
              <span class="variant-type-badge">${typeLabels[v.type] || '🔘'}</span>
              <span class="variant-name">${v.name}</span>
            </div>
            <div class="variant-price">
              ${v.price > 0 ? '+' : ''}${v.price || 0} ${product?.currency || 'د.ج'}
            </div>
            <div class="variant-actions">
              <button class="btn btn-sm btn-primary" onclick="editVariant('${v.id}')">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="deleteVariant('${v.id}')">🗑️</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
    `;
  }).join("");
}

// =========================
// STATS
// =========================
function updateStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function loadLoyalty() {
  const body = document.getElementById("loyaltyBody");
  if (!body) return;
  onSnapshot(loyaltyRef, (snap) => {
    let totalPoints = 0, totalFree = 0;
    const rows = [];
    snap.forEach(d => {
      const data = d.data();
      totalPoints += data.points || 0;
      totalFree += data.freeMeals || 0;
      rows.push(`
        <tr>
          <td><strong>${data.name || data.phone || 'زبون'}</strong></td>
          <td><span class="badge badge-gold">⭐ ${data.points || 0}</span></td>
          <td><span class="badge badge-green">🎁 ${data.freeMeals || 0}</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editLoyalty('${d.id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteLoyalty('${d.id}')">🗑️</button>
          </td>
        </tr>
      `);
    });
    updateStat("statCustomers", snap.size);
    updateStat("statPoints", totalPoints);
    updateStat("statFreeMeals", totalFree);
    body.innerHTML = rows.length ? rows.join("") : '<tr><td colspan="4" class="loading-cell">لا توجد بيانات</td></tr>';
  });
}

window.editLoyalty = function(id) {
  const newName = prompt("اسم الزبون:");
  if (newName === null) return;
  const newPoints = parseInt(prompt("النقاط:"));
  if (isNaN(newPoints)) return;
  const newFree = parseInt(prompt("الوجبات المجانية:"));
  if (isNaN(newFree)) return;
  updateDoc(doc(db, "loyalty", id), { name: newName, points: newPoints, freeMeals: newFree })
    .then(() => showToast("تم التحديث", "success"))
    .catch(e => showToast("خطأ: " + e.message, "error"));
};

window.deleteLoyalty = function(id) {
  if (!confirm("حذف هذا الزبون؟")) return;
  deleteDoc(doc(db, "loyalty", id))
    .then(() => showToast("تم الحذف", "success"))
    .catch(e => showToast("خطأ: " + e.message, "error"));
};

function loadWheelResults() {
  const body = document.getElementById("wheelResultsBody");
  if (!body) return;
  const q = query(wheelResultsRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach(d => {
      const data = d.data();
      const date = data.createdAt ? new Date(data.createdAt) : new Date();
      rows.push(`
        <tr>
          <td>${date.toLocaleString("ar-EG")}</td>
          <td><span class="badge badge-gold">${data.result || '-'}</span></td>
        </tr>
      `);
    });
    body.innerHTML = rows.length ? rows.join("") : '<tr><td colspan="2" class="loading-cell">لا توجد نتائج</td></tr>';
  });
}

window.saveWheelSchedule = async function() {
  const start = document.getElementById("wheelStart").value;
  const end = document.getElementById("wheelEnd").value;
  if (!start || !end) { showToast("أدخل الوقت الكامل", "error"); return; }
  try {
    await updateDoc(wheelScheduleRef, { start, end, updatedAt: Date.now() });
    showToast("تم حفظ التوقيت", "success");
  } catch (err) {
    try {
      const { setDoc } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js");
      await setDoc(wheelScheduleRef, { start, end, createdAt: Date.now() });
      showToast("تم حفظ التوقيت", "success");
    } catch (e2) {
      showToast("خطأ: " + e2.message, "error");
    }
  }
};

function loadEvents() {
  const list = document.getElementById("eventsList");
  if (!list) return;
  const q = query(eventsRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      list.innerHTML = `<div class="empty-state"><p>لا توجد إيفينمونات</p></div>`;
      return;
    }
    list.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const div = document.createElement("div");
      div.className = "event-card";
      div.innerHTML = `
        ${data.image ? `<img src="${data.image}" class="event-img" alt="">` : ''}
        <div class="event-body">
          <h3>${data.title || 'بدون عنوان'}</h3>
          <p>${data.description || ''}</p>
          <small>${new Date(data.createdAt).toLocaleString("ar-EG")}</small>
        </div>
        <button class="btn btn-sm btn-danger" onclick="deleteEvent('${d.id}')">🗑️</button>
      `;
      list.appendChild(div);
    });
  });
}

window.publishEvent = async function() {
  const title = document.getElementById("eventTitle").value.trim();
  const description = document.getElementById("eventDescription").value.trim();
  const image = document.getElementById("eventImage").value.trim();
  if (!title) { showToast("أدخل عنوان الإيفينمون", "error"); return; }
  try {
    await addDoc(eventsRef, { title, description, image, createdAt: Date.now() });
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDescription").value = "";
    document.getElementById("eventImage").value = "";
    showToast("تم نشر الإيفينمون", "success");
  } catch (err) {
    showToast("خطأ: " + err.message, "error");
  }
};

window.deleteEvent = async function(id) {
  if (!confirm("حذف هذا الإيفينمون؟")) return;
  try {
    await deleteDoc(doc(db, "events", id));
    showToast("تم الحذف", "success");
  } catch (err) {
    showToast("خطأ: " + err.message, "error");
  }
};

function loadLocations() {
  const body = document.getElementById("locationsBody");
  if (!body) return;
  const q = query(locationsRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    let all = [];
    let android = 0, ios = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    let todayCount = 0;
    snap.forEach(d => {
      const data = d.data();
      all.push({ id: d.id, ...data });
      const ua = (data.userAgent || "").toLowerCase();
      if (ua.includes("android")) android++;
      else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("mac")) ios++;
      if (data.createdAt && data.createdAt >= today.getTime()) todayCount++;
    });
    updateStat("statLocations", all.length);
    updateStat("statTodayLocations", todayCount);
    updateStat("statAndroid", android);
    updateStat("statIos", ios);
    renderLocations(all);
  });
}

function renderLocations(all) {
  const body = document.getElementById("locationsBody");
  if (!body) return;
  const now = Date.now();
  const day = 86400000;
  let filtered = all;
  if (currentLocationFilter === "today") {
    const today = new Date(); today.setHours(0,0,0,0);
    filtered = all.filter(l => l.createdAt >= today.getTime());
  } else if (currentLocationFilter === "7days") {
    filtered = all.filter(l => l.createdAt && (now - l.createdAt) <= 7 * day);
  } else if (currentLocationFilter === "30days") {
    filtered = all.filter(l => l.createdAt && (now - l.createdAt) <= 30 * day);
  }
  if (filtered.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="loading-cell">لا توجد بيانات</td></tr>';
    return;
  }
  body.innerHTML = filtered.map(l => {
    const d = l.createdAt ? new Date(l.createdAt) : new Date();
    const mapsUrl = l.lat && l.lng ? `https://www.google.com/maps?q=${l.lat},${l.lng}` : "#";
    return `
      <tr>
        <td>${d.toLocaleDateString("ar-EG")}</td>
        <td>${d.toLocaleTimeString("ar-EG")}</td>
        <td>${l.lat || '-'}</td>
        <td>${l.lng || '-'}</td>
        <td><a href="${mapsUrl}" target="_blank" class="btn btn-sm btn-primary">🗺️</a></td>
        <td><small>${l.browser || '-'}</small></td>
        <td><small>${l.device || '-'}</small></td>
      </tr>
    `;
  }).join("");
}

window.filterLocations = function(range, btn) {
  currentLocationFilter = range;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  loadLocations();
};

window.sendNotification = async function() {
  const title = document.getElementById("notifTitle").value.trim();
  const body = document.getElementById("notifBody").value.trim();
  if (!title || !body) { showToast("أدخل العنوان والنص", "error"); return; }
  try {
    await addDoc(notificationsRef, { title, body, createdAt: Date.now() });
    document.getElementById("notifTitle").value = "";
    document.getElementById("notifBody").value = "";
    showToast("تم إرسال الإشعار", "success");
  } catch (err) {
    showToast("خطأ: " + err.message, "error");
  }
};

// =========================
// INIT
// =========================
loadCategories();
loadProducts();
loadVariants();
loadLoyalty();
loadWheelResults();
loadEvents();
loadLocations();
