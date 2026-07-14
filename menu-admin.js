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
// =========================
// AFFICHAGE DES CATEGORIES
// =========================

function loadCategories(){

    const list = document.getElementById("categoriesList");

    if(!list) return;


    const q = query(
        categoriesRef,
        orderBy("createdAt","asc")
    );


    onSnapshot(q, (snapshot)=>{

        list.innerHTML = "";


        snapshot.forEach((cat)=>{

            const data = cat.data();


            list.innerHTML += `

            <div style="
                background:#222;
                padding:15px;
                margin:10px 0;
                border-radius:12px;
                border:1px solid #ffcc33;
            ">

                <h3 style="color:#ffcc33">
                    📂 ${data.name}
                </h3>


                <button onclick="deleteCategory('${cat.id}')">
                    🗑️ حذف
                </button>


            </div>

            `;


        });


    });

}


loadCategories();


// =========================
// SUPPRIMER CATEGORIE
// =========================

window.deleteCategory = async function(id){

    if(!confirm("حذف هذا الصنف؟"))
        return;


    await deleteDoc(
        doc(db,"categories",id)
    );

};
