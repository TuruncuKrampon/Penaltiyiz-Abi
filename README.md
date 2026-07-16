# TURUNCU KRAMPON 🥾

2.5D çizgi film penaltı oyunu: dev turuncu kramponlu hamam böcekleri penaltı
kapışması yapar. İki mod: **Bilgisayara Karşı** (Kolay / Normal / Efsane) ve
**1v1 Aynı Cihazda** (sırayla atıcı ve kaleci olursunuz).

Phaser 3 + TypeScript + Vite ile yazıldı. Sunucu yok, hesap yok; statik site
olarak yayınlanır.

---

## Hiç kod bilmeyenler için: Oyunu internette ücretsiz yayınlama

Oyun, GitHub'daki bu depodan **Cloudflare Pages** ile ücretsiz yayınlanır.
Cloudflare her değişiklikte oyunu sizin yerinize derler — bilgisayarınıza
hiçbir şey kurmanız gerekmez.

1. [pages.cloudflare.com](https://pages.cloudflare.com) adresine gidin,
   ücretsiz bir Cloudflare hesabı açın (e-posta ile).
2. Giriş yaptıktan sonra **Workers & Pages → Create → Pages →
   "Connect to Git"** düğmesine tıklayın.
3. GitHub hesabınızı bağlayın ve bu depoyu (**Penaltiyiz-Abi**) seçin.
4. Ayarlar sorulduğunda şunları yazın:
   - **Build command** (derleme komutu): `npm run build`
   - **Build output directory** (çıktı klasörü): `dist`
5. **Save and Deploy**'a tıklayın. 1-2 dakika bekleyin.
6. Bitti! Cloudflare size `https://....pages.dev` gibi bir adres verir.
   Bu adresi telefonunuzdan da açabilir, arkadaşlarınıza gönderebilirsiniz.

Bundan sonra depoya eklenen her değişiklikte (örneğin yeni bir görsel ya da
ses dosyası) site 1-2 dakika içinde kendiliğinden güncellenir.

---

## "Babanız Beşiktaş ulan!" ses dosyasını ekleme

Siyah-beyaz formalı böcek gol atınca ekranda konuşma balonu çıkar ve bir ses
çalar. Kendi ses kaydınızı (örneğin bir yapay zekâ ses aracıyla ürettiğiniz
mp3'ü) şöyle eklersiniz:

1. Ses dosyanızın adının **tam olarak** `babaniz-besiktas.mp3` olduğundan
   emin olun (küçük harf, Türkçe karakter yok, tire ile).
2. GitHub'da bu depoda `src/assets/audio` klasörüne girin.
3. **Add file → Upload files** deyip mp3'ü sürükleyin, **Commit changes**'a
   tıklayın.
4. Site kendiliğinden güncellenir; artık golde sizin sesiniz çalar.

Dosya yoksa oyun bozulmaz: tarayıcının Türkçe seslendirmesi (tiz ve hızlı,
komik böcek tonunda) devreye girer; o da yoksa sadece konuşma balonu görünür.

---

## Karakter görsellerini ekleme (asset pipeline)

Oyun, görseller hiç olmadan da çalışır (renkli kapsül taslak karakterlerle).
Gerçek böcek görsellerini eklemek için akış şöyle:

1. Yapay zekâ görsel aracıyla **character sheet** üretin: aynı karakterin
   4-5 pozu, tek yatay sırada, bembeyaz arka plan üzerinde. (Poz listesi ve
   hazır promptlar proje sahibindeki brief belgesindedir.)
2. Bilgisayarınızda bir kez şunları kurun (Python gerekir):
   ```
   pip install rembg pillow onnxruntime
   ```
3. Sheet'i dilimleyin — örnek: siyah-beyaz (bw) takımın şutör sheet'i:
   ```
   python tools/slice.py sheet_bw_kicker.png src/assets/chars/bw \
       kicker_idle kicker_run_a kicker_run_b kicker_kick celebrate
   ```
   Kaleci sheet'i için:
   ```
   python tools/slice.py sheet_bw_keeper.png src/assets/chars/bw \
       keeper_idle keeper_dive keeper_save keeper_sad
   ```
   Script arka planı otomatik temizler, pozları ayırır ve doğru isimlerle
   doğru klasöre yazar. `bw` yerine `yn` (sarı-lacivert) veya `yr`
   (sarı-kırmızı) yazarak diğer takımlar için tekrarlayın.
4. Stadyum ve top görselleri: `src/assets/env/stadium_bg.png` ve
   `src/assets/env/ball.png`.
5. Dosyaları GitHub'a yükleyin (Add file → Upload files). Site kendini
   günceller. Eksik kalan her görsel için oyun taslak karakter kullanmaya
   devam eder — hiçbir şey bozulmaz.

Beklenen dosya yerleşimi:

```
src/assets/chars/{bw|yn|yr}/kicker_idle.png
src/assets/chars/{bw|yn|yr}/kicker_run_a.png
src/assets/chars/{bw|yn|yr}/kicker_run_b.png
src/assets/chars/{bw|yn|yr}/kicker_kick.png
src/assets/chars/{bw|yn|yr}/celebrate.png
src/assets/chars/{bw|yn|yr}/keeper_idle.png
src/assets/chars/{bw|yn|yr}/keeper_dive.png   (sola dalış; sağa dalış oyunda aynalanır)
src/assets/chars/{bw|yn|yr}/keeper_save.png
src/assets/chars/{bw|yn|yr}/keeper_sad.png
src/assets/env/stadium_bg.png
src/assets/env/ball.png
src/assets/audio/babaniz-besiktas.mp3         (isteğe bağlı)
```

---

## Geliştiriciler için

```
npm install       # bağımlılıklar
npm run dev       # http://localhost:5173 — 3 saniyede menü
npm run build     # tip kontrolü + üretim derlemesi → dist/
npm run preview   # dist/'i yerelde sunar
```

- **Tüm oynanış ayarları** `src/config/balance.ts` içindedir (olasılıklar,
  süreler, CPU ağırlıkları, boyutlar). Sahne kodunda sihirli sayı yoktur.
- **Tüm arayüz metinleri** `src/config/tr.ts` içindedir; İngilizce çeviri
  eklemek aynı şekildeki ikinci bir dosya demektir.
- Renk/font token'ları `src/config/theme.ts`.
- `?debug=1` → FPS sayacı + 3x2 bölge ızgarası. `?seed=123` → tekrarlanabilir
  rastgelelik (test için).
- Mimari ve milestone geçmişi: `PLAN.md`. Karar günlüğü: `DECISIONS.md`.

### Oynanış özeti

Her atış 5 fazdır: yön kilitle → yükseklik kilitle → güç barı (70-90 tatlı
nokta; üstü riskli, altı zayıf) → koşu sırasında kaleci köşe seçer
(← ↓ → / A S D veya ekrandaki SOL/ORTA/SAĞ) → sonuç. 5'er atış, eşitlikte
altın gol. Skorlar gerçek seri penaltı kurallarıyla erken bitebilir.

---

## v2 (bilinçli olarak kapsam dışı)

- Online multiplayer
- Turnuva modu
- Ek forma/karakter skinleri
- Tekrar (replay) kaydı/paylaşımı
