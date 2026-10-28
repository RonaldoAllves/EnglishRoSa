(function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        window.firebaseError = 'A biblioteca do Firebase não foi carregada. O progresso ficará salvo neste dispositivo.';
        return;
    }

    const firebaseConfig = {
        apiKey: 'AIzaSyB68ABMAJJ1uFgPU5-rnJrU_Mt5CUJ_2z8',
        authDomain: 'englishrosa-a3e97.firebaseapp.com',
        databaseURL: 'https://englishrosa-a3e97-default-rtdb.firebaseio.com',
        projectId: 'englishrosa-a3e97',
        storageBucket: 'englishrosa-a3e97.firebasestorage.app',
        messagingSenderId: '968363251419',
        appId: '1:968363251419:web:585eb3baffa2589ad61efe',
        measurementId: 'G-C781KYMGD5'
    };

    try {
        const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
        const database = firebase.database(app);
        window.firebaseApp = app;
        window.firebaseDatabase = database;
        window.firebaseError = null;
        window.firebaseRef = (_database, path) => database.ref(path);
        window.firebaseSet = (ref, data) => ref.set(data);
        window.firebaseGet = (ref) => ref.once('value');
        window.firebaseUpdate = (ref, data) => ref.update(data);
        window.firebaseOnValue = (ref, callback) => ref.on('value', callback);
    } catch (error) {
        window.firebaseError = `Não foi possível inicializar o Firebase: ${error.message}`;
        console.error(window.firebaseError, error);
    }
})();
