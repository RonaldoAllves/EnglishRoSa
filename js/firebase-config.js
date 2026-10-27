/**
 * Configuração do Firebase
 * Gerencia conexão com Firebase Realtime Database
 */

// Firebase será carregado via CDN no HTML
// Este arquivo apenas inicializa após o carregamento

(function() {
    // Aguardar Firebase carregar
    function initFirebase() {
        if (typeof firebase === 'undefined') {
            setTimeout(initFirebase, 100);
            return;
        }

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
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        console.log('🔥 Firebase inicializado com sucesso!');

        // Exportar para uso global
        window.firebaseApp = firebase.app();
        window.firebaseDatabase = database;
        window.firebaseRef = (db, path) => firebase.database().ref(path);
        window.firebaseSet = (ref, data) => ref.set(data);
        window.firebaseGet = (ref) => ref.once('value');
        window.firebaseUpdate = (ref, data) => ref.update(data);
        window.firebaseOnValue = (ref, callback) => ref.on('value', callback);
    }

    initFirebase();
})();
