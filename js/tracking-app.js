/*
 * tracking-app.js — Logika Vue.js untuk halaman tracking.html (Tracking DO)
 *
 * Indikator yang diimplementasikan:
 *  1. Organisasi kode: data dummy terpisah di js/dataBahanAjar.js
 *  2. Menampilkan data: mustaches {{ }}, v-text, v-for (list rendering)
 *  3. Conditional: v-if / v-else-if / v-else, v-show
 *  4. Data binding: v-bind (one-way, mis. :value & :class), v-model (two-way),
 *     computed property & methods untuk mengolah data
 *  5. Watcher: (1) form.paketKode -> isi total harga otomatis dari data paket,
 *               (2) cariDO -> reset hasil saat kolom pencarian dikosongkan
 */
var trackingApp = new Vue({
  el: "#tracking-app",

  data: {
    pengirimanList: DATA_BAHAN_AJAR.pengirimanList,
    paket: DATA_BAHAN_AJAR.paket,
    // Salin data dummy agar perubahan tidak mengubah konstanta bersama
    tracking: JSON.parse(JSON.stringify(DATA_BAHAN_AJAR.tracking)),

    // --- Pencarian DO ---
    cariDO: "",
    hasilCari: null,   // null = belum/belum ketemu, object = data DO ditemukan
    sudahMencari: false,

    // --- Form tambah DO baru ---
    tampilFormDO: false,
    form: {
      nim: "",
      nama: "",
      ekspedisi: "",
      paketKode: "",
      tanggalKirim: ""
    },
    formTotal: 0, // diisi otomatis oleh watcher saat paket dipilih
    errorFormDO: {},
    pesanSuksesDO: ""
  },

  computed: {
    tahunBerjalan: function () {
      return new Date().getFullYear();
    },

    // Nomor DO otomatis: DO<TAHUN>-<sequence 3 digit>.
    // Sequence = nomor terbesar di tahun berjalan + 1, mis. DO2026-001.
    nomorDOBaru: function () {
      var prefix = "DO" + this.tahunBerjalan + "-";
      var maks = 0;
      Object.keys(this.tracking).forEach(function (nomor) {
        if (nomor.indexOf(prefix) === 0) {
          var seq = parseInt(nomor.slice(prefix.length), 10);
          if (!isNaN(seq) && seq > maks) maks = seq;
        }
      });
      var berikut = String(maks + 1);
      while (berikut.length < 3) berikut = "0" + berikut;
      return prefix + berikut;
    },

    // Detail paket yang dipilih pada form (kode + nama + isi + harga)
    paketTerpilih: function () {
      var kode = this.form.paketKode;
      return (
        this.paket.find(function (p) {
          return p.kode === kode;
        }) || null
      );
    },

    // Daftar semua DO sebagai array, urut tanggal kirim terbaru
    daftarDO: function () {
      var self = this;
      return Object.keys(this.tracking)
        .map(function (nomor) {
          return Object.assign({ nomor: nomor }, self.tracking[nomor]);
        })
        .sort(function (a, b) {
          return b.tanggalKirim.localeCompare(a.tanggalKirim);
        });
    },

    jumlahDO: function () {
      return Object.keys(this.tracking).length;
    }
  },

  watch: {
    // Watcher 1: setiap paket dipilih/diubah, total harga mengikuti
    // harga dari data paket (tanpa perlu tombol hitung manual).
    "form.paketKode": function (kodeBaru) {
      var p = this.paket.find(function (item) {
        return item.kode === kodeBaru;
      });
      this.formTotal = p ? p.harga : 0;
    },

    // Watcher 2: jika kolom pencarian dikosongkan, hasil pencarian ikut direset.
    cariDO: function (nilaiBaru) {
      if (nilaiBaru.trim() === "") {
        this.hasilCari = null;
        this.sudahMencari = false;
      }
    }
  },

  methods: {
    formatRupiah: function (angka) {
      return "Rp" + Number(angka).toLocaleString("id-ID");
    },

    tanggalHariIni: function () {
      var t = new Date();
      var bln = String(t.getMonth() + 1);
      var hrg = String(t.getDate());
      if (bln.length < 2) bln = "0" + bln;
      if (hrg.length < 2) hrg = "0" + hrg;
      return t.getFullYear() + "-" + bln + "-" + hrg;
    },

    waktuSekarang: function () {
      var t = new Date();
      function dua(n) {
        return (n < 10 ? "0" : "") + n;
      }
      return (
        t.getFullYear() + "-" + dua(t.getMonth() + 1) + "-" + dua(t.getDate()) +
        " " + dua(t.getHours()) + ":" + dua(t.getMinutes()) + ":" + dua(t.getSeconds())
      );
    },

    namaEkspedisi: function (kode) {
      var e = this.pengirimanList.find(function (item) {
        return item.kode === kode;
      });
      return e ? e.nama : kode;
    },

    namaPaket: function (kode) {
      var p = this.paket.find(function (item) {
        return item.kode === kode;
      });
      return p ? p.kode + " — " + p.nama : kode;
    },

    // Kelas badge berdasarkan status pengiriman
    kelasStatus: function (status) {
      if (status === "Diterima") return "aman";
      if (status === "Dalam Perjalanan") return "menipis";
      return ""; // "Diproses" -> badge biru default
    },

    // --- Pencarian tracking ---
    cariTracking: function () {
      var kunci = this.cariDO.trim().toUpperCase();
      this.sudahMencari = true;
      if (this.tracking[kunci]) {
        this.hasilCari = Object.assign({ nomor: kunci }, this.tracking[kunci]);
      } else {
        this.hasilCari = null;
      }
    },

    // --- Tambah DO baru (dengan validasi sederhana) ---
    tambahDO: function () {
      var f = this.form;
      var err = {};

      if (!f.nim.trim()) err.nim = "NIM wajib diisi.";
      else if (!/^[0-9]+$/.test(f.nim.trim()))
        err.nim = "NIM hanya boleh berisi angka.";
      if (!f.nama.trim()) err.nama = "Nama wajib diisi.";
      if (!f.ekspedisi) err.ekspedisi = "Pilih layanan ekspedisi.";
      if (!f.paketKode) err.paketKode = "Pilih paket bahan ajar.";
      if (!f.tanggalKirim) err.tanggalKirim = "Tanggal kirim wajib diisi.";

      this.errorFormDO = err;
      if (Object.keys(err).length > 0) return; // gagal validasi

      var nomor = this.nomorDOBaru;
      // Vue.set agar properti baru pada object tracking tetap reaktif
      Vue.set(this.tracking, nomor, {
        nim: f.nim.trim(),
        nama: f.nama.trim(),
        status: "Diproses",
        ekspedisi: this.namaEkspedisi(f.ekspedisi),
        tanggalKirim: f.tanggalKirim,
        paket: f.paketKode,
        total: this.formTotal,
        perjalanan: [
          {
            waktu: this.waktuSekarang(),
            keterangan: "DO dibuat oleh operator, menunggu penjemputan"
          }
        ]
      });

      this.pesanSuksesDO = "Delivery Order " + nomor + " berhasil dibuat.";
      var self = this;
      setTimeout(function () {
        self.pesanSuksesDO = "";
      }, 4000);

      // Reset form
      this.form = { nim: "", nama: "", ekspedisi: "", paketKode: "", tanggalKirim: this.tanggalHariIni() };
      this.formTotal = 0;
      this.tampilFormDO = false;
    },

    isiTanggalHariIni: function () {
      this.form.tanggalKirim = this.tanggalHariIni();
    }
  },

  // Isi default tanggal kirim = hari ini (fungsi Date / local time)
  created: function () {
    this.form.tanggalKirim = this.tanggalHariIni();
  }
});
