/*
 * stok-app.js — Logika Vue.js untuk halaman stok.html (Stok Bahan Ajar)
 *
 * Indikator yang diimplementasikan:
 *  1. Organisasi kode: data dummy terpisah di js/dataBahanAjar.js
 *  2. Menampilkan data: mustaches {{ }}, v-text, v-html, v-for (list rendering)
 *  3. Conditional: v-if / v-else-if / v-else, v-show
 *  4. Data binding: v-bind (one-way), v-model (two-way),
 *     computed property & methods untuk mengolah data
 *  5. Watcher: (1) filterUpbjj -> reset filterKategori (dependent options),
 *               (2) stok (deep) -> catat waktu perubahan terakhir
 */
var stokApp = new Vue({
  el: "#stok-app",

  data: {
    upbjjList: DATA_BAHAN_AJAR.upbjjList,
    kategoriList: DATA_BAHAN_AJAR.kategoriList,
    // Salin data dummy agar perubahan tidak mengubah konstanta bersama
    stok: JSON.parse(JSON.stringify(DATA_BAHAN_AJAR.stok)),

    // --- Filter & sort ---
    filterUpbjj: "",      // "" = semua UT-Daerah
    filterKategori: "",   // "" = semua kategori (muncul setelah pilih UT-Daerah)
    hanyaReorder: false,  // true = tampilkan hanya qty < safety (termasuk qty = 0)
    urutBerdasarkan: "judul", // judul | harga | qty
    arahUrut: "asc",          // asc | desc

    // --- Edit stok per baris ---
    modeEdit: null,   // kode item yang sedang diedit
    editQty: 0,
    editSafety: 0,
    errorEdit: "",

    // --- Form tambah bahan ajar baru ---
    tampilForm: false,
    form: {
      kode: "", judul: "", kategori: "", upbjj: "",
      lokasiRak: "", harga: "", qty: "", safety: "", catatan: ""
    },
    errorForm: {},
    pesanSukses: "",

    // Diisi otomatis oleh watcher setiap data stok berubah
    terakhirDiubah: "Belum ada perubahan"
  },

  computed: {
    // Opsi kategori yang tersedia mengikuti UT-Daerah terpilih (dependent options).
    // Computed bersifat cache: hanya dihitung ulang jika filterUpbjj/stok berubah,
    // sehingga filter tidak perlu "recompute" manual setiap render.
    kategoriTersedia: function () {
      var daftar = this.stok;
      if (this.filterUpbjj !== "") {
        daftar = daftar.filter(function (item) {
          return item.upbjj === this.filterUpbjj;
        }, this);
      }
      var unik = [];
      daftar.forEach(function (item) {
        if (unik.indexOf(item.kategori) === -1) unik.push(item.kategori);
      });
      return unik.sort();
    },

    // Daftar stok hasil filter + sort. Satu-satunya sumber data untuk tabel.
    stokTampil: function () {
      var hasil = this.stok;

      if (this.filterUpbjj !== "") {
        hasil = hasil.filter(function (item) {
          return item.upbjj === this.filterUpbjj;
        }, this);
      }
      if (this.filterKategori !== "") {
        hasil = hasil.filter(function (item) {
          return item.kategori === this.filterKategori;
        }, this);
      }
      if (this.hanyaReorder) {
        // Daftar pengingat re-order: stok di bawah safety, termasuk yang kosong
        hasil = hasil.filter(function (item) {
          return item.qty < item.safety;
        });
      }

      var kunci = this.urutBerdasarkan;
      var arah = this.arahUrut === "asc" ? 1 : -1;
      return hasil.slice().sort(function (a, b) {
        if (kunci === "judul") return a.judul.localeCompare(b.judul) * arah;
        return (a[kunci] - b[kunci]) * arah;
      });
    },

    // Ringkasan jumlah per status (untuk kartu ringkasan)
    ringkasan: function () {
      var r = { total: this.stok.length, aman: 0, menipis: 0, kosong: 0 };
      this.stok.forEach(function (item) {
        r[this.statusStok(item).kelas]++;
      }, this);
      return r;
    },

    // Jumlah item yang perlu di-reorder (qty < safety)
    jumlahReorder: function () {
      return this.stok.filter(function (item) {
        return item.qty < item.safety;
      }).length;
    },

    // Total nilai persediaan (qty x harga)
    totalNilaiStok: function () {
      return this.stok.reduce(function (total, item) {
        return total + item.qty * item.harga;
      }, 0);
    },

    // Apakah ada filter aktif (untuk tombol reset)
    adaFilterAktif: function () {
      return (
        this.filterUpbjj !== "" ||
        this.filterKategori !== "" ||
        this.hanyaReorder ||
        this.urutBerdasarkan !== "judul" ||
        this.arahUrut !== "asc"
      );
    }
  },

  watch: {
    // Watcher 1: saat filter UT-Daerah berubah, reset filter kategori
    // agar tidak tertinggal pilihan kategori dari daerah lain (dependent options).
    filterUpbjj: function () {
      this.filterKategori = "";
    },

    // Watcher 2: pantau seluruh perubahan data stok (deep) untuk
    // mencatat kapan terakhir kali data berubah.
    stok: {
      deep: true,
      handler: function () {
        this.terakhirDiubah = new Date().toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short"
        });
      }
    }
  },

  methods: {
    // Menentukan status stok: Kosong (qty=0) dicek dulu karena 0 < safety.
    statusStok: function (item) {
      if (item.qty === 0) return { label: "Kosong", kelas: "kosong" };
      if (item.qty < item.safety)
        return { label: "Menipis", kelas: "menipis" };
      return { label: "Aman", kelas: "aman" };
    },

    formatRupiah: function (angka) {
      return "Rp" + Number(angka).toLocaleString("id-ID");
    },

    resetFilter: function () {
      this.filterUpbjj = "";
      this.filterKategori = "";
      this.hanyaReorder = false;
      this.urutBerdasarkan = "judul";
      this.arahUrut = "asc";
    },

    // --- Edit stok ---
    mulaiEdit: function (item) {
      this.modeEdit = item.kode;
      this.editQty = item.qty;
      this.editSafety = item.safety;
      this.errorEdit = "";
    },
    batalEdit: function () {
      this.modeEdit = null;
      this.errorEdit = "";
    },
    simpanEdit: function (item) {
      var qty = Number(this.editQty);
      var safety = Number(this.editSafety);
      if (!Number.isInteger(qty) || qty < 0) {
        this.errorEdit = "Jumlah stok harus bilangan bulat >= 0.";
        return;
      }
      if (!Number.isInteger(safety) || safety < 0) {
        this.errorEdit = "Safety stock harus bilangan bulat >= 0.";
        return;
      }
      item.qty = qty;
      item.safety = safety;
      this.modeEdit = null;
      this.errorEdit = "";
    },

    // --- Tambah bahan ajar baru (dengan validasi sederhana) ---
    tambahBahanAjar: function () {
      var f = this.form;
      var err = {};

      if (!f.kode.trim()) err.kode = "Kode mata kuliah wajib diisi.";
      else if (
        this.stok.some(function (item) {
          return item.kode.toLowerCase() === f.kode.trim().toLowerCase();
        })
      )
        err.kode = "Kode sudah terdaftar, gunakan kode lain.";
      if (!f.judul.trim()) err.judul = "Judul wajib diisi.";
      if (!f.kategori) err.kategori = "Pilih kategori.";
      if (!f.upbjj) err.upbjj = "Pilih UT-Daerah.";
      if (!f.lokasiRak.trim()) err.lokasiRak = "Lokasi rak wajib diisi.";
      if (f.harga === "" || isNaN(Number(f.harga)) || Number(f.harga) <= 0)
        err.harga = "Harga harus angka lebih dari 0.";
      if (
        f.qty === "" ||
        !Number.isInteger(Number(f.qty)) ||
        Number(f.qty) < 0
      )
        err.qty = "Stok harus bilangan bulat >= 0.";
      if (
        f.safety === "" ||
        !Number.isInteger(Number(f.safety)) ||
        Number(f.safety) < 0
      )
        err.safety = "Safety stock harus bilangan bulat >= 0.";

      this.errorForm = err;
      if (Object.keys(err).length > 0) return; // gagal validasi

      this.stok.push({
        kode: f.kode.trim().toUpperCase(),
        judul: f.judul.trim(),
        kategori: f.kategori,
        upbjj: f.upbjj,
        lokasiRak: f.lokasiRak.trim().toUpperCase(),
        harga: Number(f.harga),
        qty: Number(f.qty),
        safety: Number(f.safety),
        catatanHTML: f.catatan.trim()
      });

      this.pesanSukses =
        "Bahan ajar " + f.kode.trim().toUpperCase() + " berhasil ditambahkan.";
      var self = this;
      setTimeout(function () {
        self.pesanSukses = "";
      }, 4000);

      // Reset form
      this.form = {
        kode: "", judul: "", kategori: "", upbjj: "",
        lokasiRak: "", harga: "", qty: "", safety: "", catatan: ""
      };
      this.tampilForm = false;
    }
  }
});
