const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Firebase Admin SDK Kurulumu (Güvenli Alan)
if (process.env.FIREBASE_CONFIG) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    console.error("KRİTİK HATA: FIREBASE_CONFIG bulunamadı!");
}

const db = admin.firestore();

// --- GÜVENLİ API: REKLAM ÖDÜLÜ ---
app.post('/api/reward', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).send("ID Gerekli");

    try {
        const userRef = db.collection('users').doc(userId.toString());
        // Miktar burada sabitlenmiştir, kullanıcı frontend'den değiştiremez!
        await userRef.update({
            balance: admin.firestore.FieldValue.increment(0.0005),
            lastAdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true, reward: 0.0005 });
    } catch (e) {
        res.status(500).json({ error: "Bakiye eklenemedi" });
    }
});

// --- GÜVENLİ API: ÇEKİM TALEBİ ---
app.post('/api/withdraw', async (req, res) => {
    const { userId, address, amount } = req.body;
    try {
        const userRef = db.collection('users').doc(userId.toString());
        const userDoc = await userRef.get();
        
        if (userDoc.data().balance >= amount) {
            await db.collection('withdrawals').add({
                userId, address, amount, status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            res.json({ success: true });
        } else {
            res.status(400).json({ error: "Yetersiz bakiye" });
        }
    } catch (e) { res.status(500).send(e.message); }
});

app.listen(process.env.PORT || 3000, () => console.log("Secure Backend Online"));
