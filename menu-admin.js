import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const categoriesRef = collection(db, "categories");
const productsRef = collection(db, "products");

window.addCategory = async function () {

    const input = document.getElementById("categoryName");

    const name = input.value.trim();

    if (!name) {
        alert("أدخل اسم الصنف");
        return;
    }

    await addDoc(categoriesRef, {

        name,

        createdAt: Date.now()

    });

    input.value = "";

};
