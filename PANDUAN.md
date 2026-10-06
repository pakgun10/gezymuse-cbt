# CBT Sederhana — Google Sheets + GitHub Pages

Prototipe ujian pilihan ganda: halaman web statis (GitHub Pages) + Google Sheets
sebagai database, dijembatani Google Apps Script. Tanpa sistem login.

**Alur:** isi Token + Nama + Kelas + No. Absen → kerjakan soal → kumpulkan →
lihat skor & pembahasan. Guru mengunduh nilai lewat "Mode Guru" di halaman
atau langsung dari Google Sheets.

---

## Langkah 1 — Buat Google Sheet (10 menit)

1. Buka [sheets.new](https://sheets.new) → buat spreadsheet baru, beri nama mis. `CBT-Kelas-7`.
2. Buat **4 sheet** (klik `+` di bawah, klik kanan → Rename) dengan header persis
   seperti ini (baris 1):

**Sheet `Soal`**

| id | soal | a | b | c | d | kunci |
|---|---|---|---|---|---|---|
| *(lihat blok TSV siap-tempel di bawah — 10 soal pecahan SMP)* |

> Kolom `kunci` diisi huruf A/B/C/D sesuai urutan kolom a–d **di Sheet**
> (urutan yang dilihat siswa diacak otomatis oleh aplikasi).
>
> **Notasi pecahan:** tulis `[[3/4]]` di sel mana pun (soal/opsi) — di layar
> siswa tampil sebagai pecahan bertingkat ³⁄₄ yang rapi. Contoh:
> `Hasil dari [[2/3]] × [[9/10]] adalah …`

**10 soal pecahan (siap tempel):** blokir/copy seluruh blok di bawah ini,
lalu paste ke Sheet `Soal` mulai sel **A2** (di bawah header) — kolom
terisi otomatis dengan benar karena formatnya TSV:

```tsv
1	Hasil dari [[12/18]] jika disederhanakan adalah …	[[2/3]]	[[3/4]]	[[4/9]]	[[5/6]]	A
2	Hasil dari [[2/5]] + [[3/5]] adalah …	[[5/10]]	1	[[6/5]]	[[1/5]]	B
3	Hasil dari [[3/4]] − [[1/8]] adalah …	[[1/2]]	[[5/8]]	[[3/8]]	[[2/3]]	B
4	Hasil dari [[2/3]] × [[9/10]] adalah …	[[11/13]]	[[2/5]]	[[3/5]]	[[18/13]]	C
5	Hasil dari [[5/6]] ÷ [[2/3]] adalah …	[[10/18]]	1 [[1/4]]	[[5/9]]	[[7/6]]	B
6	Hasil dari 2 [[1/2]] + 1 [[3/4]] adalah …	3 [[3/4]]	4 [[1/2]]	4 [[1/4]]	3 [[1/4]]	C
7	Bentuk pecahan dari 0,75 adalah …	[[3/4]]	[[1/4]]	[[3/5]]	[[7/10]]	A
8	Bentuk pecahan paling sederhana dari 40% adalah …	[[1/4]]	[[4/5]]	[[2/5]]	[[2/3]]	C
9	Urutan pecahan [[2/5]], [[1/2]], [[3/4]] dari yang terkecil adalah …	[[2/5]], [[1/2]], [[3/4]]	[[3/4]], [[1/2]], [[2/5]]	[[1/2]], [[2/5]], [[3/4]]	[[2/5]], [[3/4]], [[1/2]]	A
10	Ibu memiliki [[3/4]] kg gula pasir, lalu memakai [[1/2]] kg untuk membuat kue. Sisa gula ibu adalah …	[[1/2]] kg	[[1/4]] kg	[[3/8]] kg	[[1/8]] kg	B
```

> Semua kunci jawaban sudah diverifikasi (penyederhanaan, operasi campuran,
> desimal↔pecahan↔persen, urutan, dan soal cerita).

**Sheet `Token`**

| token | keterangan | aktif |
|---|---|---|
| UTS-7A-01 | UTS Matematika Kelas 7A | YA |

> Satu baris = satu sesi ujian. Ubah `aktif` menjadi `TIDAK` untuk menutup sesi.

**Sheet `Hasil`**

| waktu | token | nama | kelas | no_absen | benar | total | skor | jawaban |
|---|---|---|---|---|---|---|---|---|

> Kosongkan saja — terisi otomatis setiap ada yang mengumpulkan jawaban.

**Sheet `Config`**

| kunci | nilai |
|---|---|
| guru_token | GANTI-DENGAN-TOKEN-RAHASIA |

> Token ini untuk "Mode Guru" (melihat & mengunduh nilai). Buat yang sulit ditebak.

---

## Langkah 2 — Pasang kode server (5 menit)

1. Di spreadsheet: menu **Extensions → Apps Script**.
2. Hapus isi editor, lalu **copy seluruh isi file `Code.gs`** dari paket ini dan paste.
3. Simpan (Ctrl+S), beri nama project mis. `CBT-Backend`.

---

## Langkah 3 — Deploy sebagai Web App (5 menit)

1. Di editor Apps Script: **Deploy → New deployment**.
2. Ikon gerigi → pilih **Web app**.
3. Isi:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
4. Klik **Deploy** → **Authorize access** → pilih akun Google → *Advanced* →
   *Go to … (unsafe)* → **Allow**.
5. **Salin URL Web App** yang muncul (bentuknya
   `https://script.google.com/macros/s/xxxx/exec`).

> ⚠ Setiap kali mengubah `Code.gs` di kemudian hari: **Deploy → Manage
> deployments → ✏️ → Version: New version → Deploy** agar perubahan aktif.

---

## Langkah 4 — Hubungkan halaman web (2 menit)

1. Buka file `index.html` dari paket ini dengan text editor.
2. Cari baris:
   ```js
   const SCRIPT_URL = "https://script.google.com/macros/s/PASTE_ID_ANDA/exec";
   ```
3. Ganti URL-nya dengan URL Web App dari langkah 3. Simpan.

---

## Langkah 5 — Naikkan ke GitHub Pages (5 menit)

1. Buat repo **baru** di GitHub (mis. `gezymuse-cbt`), **jangan** centang
   "Add a README".
2. Tambahkan deploy key repo ini (file `gezymuse-cbt-deploy-key.pub` dari
   paket — beri akses **write**), lalu push isi paket ke branch `main`:
   ```bash
   git init -b main
   git remote add origin git@github-gezymuse-cbt:pakgun10/gezymuse-cbt.git
   git add -A && git commit -m "CBT pecahan v1.0" && git push -u origin main
   ```
   *(File `Code.gs` dan `PANDUAN.md` ikut ter-push — tidak masalah, keduanya
   memang untuk dibaca/dicopy dan tidak berisi rahasia. Token guru tersimpan
   di Sheet, bukan di file.)*
3. Di repo: **Settings → Pages → Build and deployment → Source:
   GitHub Actions** → tunggu workflow hijau.
4. Buka `https://pakgun10.github.io/gezymuse-cbt/` — CBT siap dipakai.

Siswa cukup buka link itu dari HP. Tidak perlu install apa pun.

---

## Cara pakai harian

**Guru:**
- Buat token baru per ulangan di sheet `Token`.
- Pantau / unduh nilai: buka halaman CBT → klik **Mode Guru** (paling bawah) →
  masukkan token guru → **⬇ Unduh Nilai (CSV)**. File CSV langsung terbuka
  rapi di Excel.
- Alternatif: unduh langsung dari Google Sheets (*File → Download*).

**Siswa:**
- Buka link → isi Token, Nama, Kelas, No. Absen → **Mulai Ujian**.
- Urutan soal & pilihan jawaban **diacak** tiap peserta.
- Tombol **Kumpulkan Jawaban** → skor langsung tampil + pembahasan per soal.

---

## Batasan yang perlu diketahui (jujur)

- **Bukan untuk ujian berisiko tinggi.** Token terlihat siapa pun yang tahu;
  tidak ada pengunci browser anti-nyontek. Cocok untuk ulangan harian, latihan,
  dan kuis kelas.
- **Satu pengumpulan per nama+no.absen** per token (dicegah server, tidak
  tercatat ganda). Kalau respons Kumpulkan hilang karena timeout lalu siswa
  menekan Kumpulkan lagi, server mengembalikan skor yang sudah tersimpan.
  Kalau siswa terputus sebelum menekan Kumpulkan, ia bisa masuk lagi dan
  mengulang — jawaban tersimpan hanya saat dikumpulkan.
- **Kuota gratis Apps Script** cukup untuk puluhan siswa; ratusan siswa
  serentak bisa antre. Untuk skala besar, naikkan ke Google Workspace berbayar
  atau pakai backend beneran.
- **Kunci jawaban aman**: penilaian dilakukan di server (Apps Script), kunci
  tidak pernah dikirim ke browser — siswa yang intip source code tidak akan
  menemukannya.
- Jangan taruh data sensitif (NISN, dsb.) di sheet ini melebihi kebutuhan.

---

## Isi paket

| File | Fungsi |
|---|---|
| `index.html` | Halaman CBT (form peserta → soal → hasil → mode guru) |
| `Code.gs` | Backend Apps Script (validasi token, penilaian, simpan nilai) |
| `PANDUAN.md` | File ini |
| `.github/workflows/deploy.yml` | Deploy otomatis ke GitHub Pages |
| `gezymuse-cbt-deploy-key.pub` | Public deploy key untuk repo GitHub |

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Alert "Konfigurasi belum lengkap" | `SCRIPT_URL` di `index.html` masih placeholder — ikuti Langkah 4 |
| "Token tidak ditemukan" | Token salah ketik, atau belum ada di sheet `Token`, atau kolom `aktif` bukan `YA` |
| "Token guru salah" | Tidak sama dengan `guru_token` di sheet `Config` (perhatikan spasi) |
| "Belum ada soal" | Sheet `Soal` kosong — tempel 10 soal dari Langkah 1 mulai sel A2 |
| Perubahan `Code.gs` tidak berpengaruh | Wajib **Deploy → Manage deployments → New version** (Langkah 3) |
