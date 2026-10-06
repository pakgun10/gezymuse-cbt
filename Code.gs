/********************************************************************
 * CBT SEDERHANA — Backend Google Sheets (Google Apps Script)
 *
 * Cara pakai: lihat PANDUAN.md
 * - Sheet "Soal"   : bank soal (kolom: id | soal | a | b | c | d | kunci)
 * - Sheet "Token"  : token ujian (kolom: token | keterangan | aktif)
 * - Sheet "Hasil"  : jawaban tersimpan otomatis (kolom: waktu | token |
 *                    nama | kelas | no_absen | benar | total | skor | jawaban)
 * - Sheet "Config" : pengaturan (kolom: kunci | nilai), wajib ada baris:
 *                    guru_token | <token-rahasia-guru>
 *
 * Komunikasi memakai JSONP agar bisa dipanggil dari halaman statis
 * (GitHub Pages) tanpa masalah CORS.
 ********************************************************************/

var NAMA_SHEET = { soal: 'Soal', token: 'Token', hasil: 'Hasil', config: 'Config' };

/* ================= pintu masuk ================= */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var cb = String(p.callback || 'callback').replace(/[^a-zA-Z0-9_]/g, '');
  var out;
  try {
    var action = String(p.action || '').toLowerCase();
    if (action === 'mulai')       out = aksiMulai(p.token);
    else if (action === 'submit') out = aksiSubmit(p.data);
    else if (action === 'hasil')  out = aksiHasil(p.guru_token);
    else out = { ok: false, pesan: 'Aksi tidak dikenal.' };
  } catch (err) {
    out = { ok: false, pesan: 'Kesalahan server: ' + err.message };
  }
  return ContentService
    .createTextOutput(cb + '(' + JSON.stringify(out) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/* ================= util sheet ================= */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(nama) {
  var sh = ss_().getSheetByName(nama);
  if (!sh) throw new Error('Sheet "' + nama + '" tidak ditemukan.');
  return sh;
}

/** Ambil semua baris data (tanpa header). */
function baris_(nama) {
  var v = sheet_(nama).getDataRange().getValues();
  return v.length < 2 ? [] : v.slice(1);
}

function cfg_(kunci) {
  var rows = baris_(NAMA_SHEET.config);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === kunci) return String(rows[i][1]);
  }
  return '';
}

function str_(v) { return String(v === undefined || v === null ? '' : v).trim(); }

function fmtTanggal_(v) {
  try {
    if (Object.prototype.toString.call(v) === '[object Date]') {
      return Utilities.formatDate(v, 'Asia/Jakarta',
        'dd-MM-yyyy HH:mm');
    }
  } catch (e) {}
  return str_(v);
}

/* ================= aksi: mulai ================= */

function aksiMulai(token) {
  token = str_(token);
  if (!token) return { ok: false, pesan: 'Token ujian belum diisi.' };

  var cocok = null;
  baris_(NAMA_SHEET.token).forEach(function (r) {
    if (str_(r[0]) === token) cocok = r;
  });
  if (!cocok) return { ok: false, pesan: 'Token "' + token + '" tidak ditemukan. Periksa kembali.' };
  if (str_(cocok[2]).toUpperCase() !== 'YA')
    return { ok: false, pesan: 'Token ini sudah tidak aktif.' };

  // Kirim soal TANPA kunci jawaban — kunci hanya hidup di server.
  var soal = [];
  baris_(NAMA_SHEET.soal).forEach(function (r) {
    if (str_(r[0]) && str_(r[1])) {
      soal.push({ id: str_(r[0]), soal: str_(r[1]),
                  a: str_(r[2]), b: str_(r[3]), c: str_(r[4]), d: str_(r[5]) });
    }
  });
  if (!soal.length)
    return { ok: false, pesan: 'Belum ada soal di Sheet "Soal". Hubungi guru.' };

  return { ok: true, keterangan: str_(cocok[1]), jumlah: soal.length, soal: soal };
}

/* ================= aksi: submit ================= */

function aksiSubmit(dataStr) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { /* lanjut tanpa lock */ }
  try {
    return submitInti_(dataStr);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function submitInti_(dataStr) {
  var d;
  try { d = JSON.parse(dataStr || '{}'); }
  catch (e) { return { ok: false, pesan: 'Data jawaban rusak.' }; }

  var token = str_(d.token), nama = str_(d.nama),
      kelas = str_(d.kelas), absen = str_(d.absen);
  if (!token || !nama || !kelas || !absen)
    return { ok: false, pesan: 'Data peserta tidak lengkap.' };

  // 1. token harus valid & aktif
  var tokenOk = false;
  baris_(NAMA_SHEET.token).forEach(function (r) {
    if (str_(r[0]) === token && str_(r[2]).toUpperCase() === 'YA') tokenOk = true;
  });
  if (!tokenOk) return { ok: false, pesan: 'Token tidak valid atau sudah tidak aktif.' };

  // 2. cegah pengumpulan ganda (satu nama+kelas+absen per token).
  //    Kalau barisnya sudah ada (mis. respons submit pertama hilang
  //    karena timeout), kembalikan hasil yang tersimpan agar siswa
  //    tetap bisa melihat skornya, bukan mentok di layar ujian.
  var barisGanda = null;
  baris_(NAMA_SHEET.hasil).forEach(function (r) {
    if (str_(r[1]) === token &&
        str_(r[2]).toLowerCase() === nama.toLowerCase() &&
        str_(r[3]) === kelas && str_(r[4]) === absen) barisGanda = r;
  });
  if (barisGanda) return hasilTersimpan_(barisGanda);

  // 3. nilai di SERVER (kunci tidak pernah dikirim ke browser)
  var kunciMap = {}, bank = [];
  baris_(NAMA_SHEET.soal).forEach(function (r) {
    if (str_(r[0]) && str_(r[1])) {
      bank.push(r);
      kunciMap[str_(r[0])] = str_(r[6]).toUpperCase();
    }
  });
  var jawab = d.jawaban || {}, benar = 0, review = [];
  bank.forEach(function (r) {
    var id = str_(r[0]);
    var kunci = kunciMap[id] || '';
    var j = str_(jawab[id]).toUpperCase();
    var ok = !!(j && kunci && j === kunci);
    if (ok) benar++;
    review.push({
      id: id, soal: str_(r[1]),
      opsi: { A: str_(r[2]), B: str_(r[3]), C: str_(r[4]), D: str_(r[5]) },
      jawab: j || '-', kunci: kunci, benar: ok
    });
  });
  var total = bank.length;
  var skor = total ? Math.round(benar / total * 100) : 0;

  // 4. simpan ke Sheet "Hasil"
  sheet_(NAMA_SHEET.hasil).appendRow(
    [new Date(), token, nama, kelas, absen, benar, total, skor, JSON.stringify(jawab)]);

  return { ok: true, skor: skor, benar: benar, total: total, review: review };
}

/* ================= aksi: hasil (guru) ================= */

/** Kembalikan hasil dari baris "Hasil" yang sudah tersimpan
 *  (dipakai saat siswa menekan Kumpulkan dua kali, atau respons
 *  submit pertama hilang karena timeout). Skor dihitung ulang dari
 *  jawaban tersimpan (kolom ke-9) memakai bank soal saat ini. */
function hasilTersimpan_(r) {
  var bank = [];
  baris_(NAMA_SHEET.soal).forEach(function (rr) {
    if (str_(rr[0]) && str_(rr[1])) bank.push(rr);
  });
  var jawab = {};
  try { jawab = JSON.parse(str_(r[8]) || '{}'); } catch (e) {}
  var benar = 0, review = [];
  bank.forEach(function (rr) {
    var id = str_(rr[0]);
    var kunci = str_(rr[6]).toUpperCase();
    var j = str_(jawab[id]).toUpperCase();
    var ok = !!(j && kunci && j === kunci);
    if (ok) benar++;
    review.push({ id: id, soal: str_(rr[1]),
      opsi: { A: str_(rr[2]), B: str_(rr[3]), C: str_(rr[4]), D: str_(rr[5]) },
      jawab: j || '-', kunci: kunci, benar: ok });
  });
  var total = bank.length;
  return { ok: true, tersimpanUlang: true,
           skor: total ? Math.round(benar / total * 100) : 0,
           benar: benar, total: total, review: review };
}

function aksiHasil(guruToken) {
  var benar = cfg_('guru_token');
  if (!benar || str_(guruToken) !== benar)
    return { ok: false, pesan: 'Token guru salah.' };

  var data = baris_(NAMA_SHEET.hasil).map(function (r) {
    return [fmtTanggal_(r[0]), str_(r[1]), str_(r[2]), str_(r[3]),
            str_(r[4]), r[5], r[6], r[7]];
  });
  return { ok: true, jumlah: data.length, data: data };
}
