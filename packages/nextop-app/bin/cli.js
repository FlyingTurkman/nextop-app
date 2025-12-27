#!/usr/bin/env node

const concurrently = require('concurrently');
const waitOn = require('wait-on');
const { execSync } = require('child_process');

const command = process.argv[2];

if (command === 'dev') {
    // 0. Önceki kilitli kalmış süreçleri temizlemeye çalış (Windows için opsiyonel ama hayat kurtarır)
    try {
        console.log('🧹 Eski süreçler temizleniyor...');
        // Eğer windows kullanıyorsan port 3000'i tutan node işlemlerini durdurabilirsin
    } catch (e) {}

    console.log('🚀 NextOP Geliştirme Modu Başlatılıyor...');

    const { result } = concurrently([
        { 
            command: "npx next dev", // SADECE BU BAŞLATMALI
            name: "Next.js", 
            prefixColor: "cyan" 
        }
    ], {
        killOthers: 'failure',
    });

    const opts = {
        resources: ['http://localhost:3000'],
        timeout: 30000,
        // Next.js'in tamamen hazır olması için küçük bir gecikme ekleyelim
        delay: 1000 
    };

    waitOn(opts)
        .then(() => {
            console.log('⚡ Port 3000 hazır! Electron fırlatılıyor...');
            
            // ELECTRON'U ÇALIŞTIRIRKEN: 
            // 'npx electron .' bazen package.json içindeki scriptleri tetikler.
            // Bunun yerine doğrudan electron binary'sini çağırmak daha güvenlidir.
            concurrently([
                { 
                    command: "electron .", 
                    name: "Electron", 
                    prefixColor: "magenta",
                    // Electron'un içindeki süreçlerin Next'i tekrar başlatmasını engellemek için ENV set edelim
                    env: { NEXTOP_INTERNAL_START: 'true' } 
                }
            ], {
                killOthers: 'always'
            }).result.catch(() => {});
        })
        .catch((err) => {
            console.error('❌ Hata:', err);
        });

    result.catch(() => {});
}