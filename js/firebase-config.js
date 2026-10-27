/**
 * Configuração do Firebase
 * Gerencia conexão com Firebase Realtime Database
 */

// Importar Firebase (versão modular)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB68ABMAJJ1uFgPU5-rnJrU_Mt5CUJ_2z8",
    authDomain: "englishrosa-a3e97.firebaseapp.com",
    databaseURL: "https://englishrosa-a3e97-default-rtdb.firebaseio.com",
    projectId: "englishrosa-a3e97",
    storageBucket: "englishrosa-a3e97.firebasestorage.app",
    messagingSenderId: "968363251419",
    appId: "1:968363251419:web:585eb3baffa2589ad61efe",
    measurementId: "G-C781KYMGD5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

console.log('🔥 Firebase inicializado com sucesso!');

// Exportar para uso global
window.firebaseApp = app;
window.firebaseDatabase = database;
window.firebaseRef = ref;
window.firebaseSet = set;
window.firebaseGet = get;
window.firebaseUpdate = update;
window.firebaseOnValue = onValue;
