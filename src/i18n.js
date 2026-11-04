// Every visible word in two languages, like the series (EN and ID versions).
const T = {
  id: {
    locale: "id-ID", population: "PENDUDUK", peoplesHouse: "RUMAH RAKYAT", jobsOpen: "LOWONGAN", jobsCount: "19.000.000", jobOffice: "KANTOR LOWONGAN",
    decreeTitle: "DEKRET PRESIDEN No. {n}", noDecree: "belum ada hukum. tulis yang pertama di kolom komentar!", noDecreeBy: "top komen = hukum",
    title: "CITIZENESIA", subtitle: "negara yang penduduknya lahir dari penonton", yourName: "nama warga", namePh: "namamu",
    look: "LOOK: desain dirimu", cap: "topi", band: "ikat kepala", glasses: "kacamata", stache: "kumis", helmet: "helm astronot", none: "tanpa",
    play: "LAHIR SEKARANG", freeMode: "mode bebas (semua blok gratis)",
    lvCell: "SEL", lvBaby: "BAYI", lvCitizen: "WARGA", coins: "koin",
    hintBorn: "Berenang ke RUMAH RAKYAT untuk lahir 🏛️", hintWork: "Ke KANTOR LOWONGAN untuk cari kerja 💼", hintBuild: "Tekan BANGUN untuk menaruh blok 🧱",
    born: "Selamat! Kamu lahir. Sekarang… cari kerja.", talkPresident: "Presiden", act: "AKSI", jump: "LOMPAT", build: "BANGUN", place: "PASANG", del: "HAPUS", done: "SELESAI",
    needBorn: "Lahir dulu, baru kerja. Itu aturan negara.", reject: "DITOLAK: butuh pengalaman 5 tahun. Usiamu: 0 hari.", hired: "Oke, kamu diterima sebagai MAGANG ABADI.",
    working: "Kerja… (mengisi formulir lowongan)", paid: "+{n} koin. Gaji dibayar… setengah.", broke: "Koin kurang. Kerja dulu di Kantor Lowongan.",
    noBuildHere: "Tidak boleh membangun di sini.", saved: "Tersimpan", menu: "MENU", reset: "Mulai ulang dunia", resetAsk: "Hapus semua bangunan dan mulai dari sel lagi?",
    edit: "Ubah karakter", lang: "EN", presidentSays: ["Selamat datang di Citizenesia!", "Penduduk kita: {pop}. Lapangan kerja: 19 juta.", "Hukum hari ini: “{decree}”", "Bangun apa saja. Asal bayar."],
    cost: "1 blok = 1 koin", free: "gratis",
  },
  en: {
    locale: "en-US", population: "POPULATION", peoplesHouse: "THE PEOPLE'S HOUSE", jobsOpen: "JOBS OPEN", jobsCount: "19,000,000", jobOffice: "JOB OFFICE",
    decreeTitle: "PRESIDENTIAL DECREE No. {n}", noDecree: "no law yet. write the first one in the comments!", noDecreeBy: "top comment = law",
    title: "CITIZENESIA", subtitle: "a country whose people are born from its viewers", yourName: "citizen name", namePh: "yourname",
    look: "LOOK: design yourself", cap: "cap", band: "headband", glasses: "glasses", stache: "mustache", helmet: "astronaut helmet", none: "none",
    play: "GET BORN", freeMode: "free mode (every block is free)",
    lvCell: "CELL", lvBaby: "BABY", lvCitizen: "CITIZEN", coins: "coins",
    hintBorn: "Swim to THE PEOPLE'S HOUSE to be born 🏛️", hintWork: "Go to the JOB OFFICE to find a job 💼", hintBuild: "Press BUILD to place blocks 🧱",
    born: "Congrats! You're born. Now… find a job.", talkPresident: "President", act: "ACTION", jump: "JUMP", build: "BUILD", place: "PLACE", del: "REMOVE", done: "DONE",
    needBorn: "Get born first, then work. National rule.", reject: "REJECTED: needs 5 years of experience. Your age: 0 days.", hired: "Fine, you're hired as an ETERNAL INTERN.",
    working: "Working… (filling in job forms)", paid: "+{n} coins. Salary paid… halfway.", broke: "Not enough coins. Work at the Job Office first.",
    noBuildHere: "You can't build here.", saved: "Saved", menu: "MENU", reset: "Restart the world", resetAsk: "Delete every build and start again as a cell?",
    edit: "Edit character", lang: "ID", presidentSays: ["Welcome to Citizenesia!", "Our population: {pop}. Jobs: 19 million.", "Today's law: “{decree}”", "Build anything. As long as you pay."],
    cost: "1 block = 1 coin", free: "free",
  },
};
let lang = (navigator.language || "").toLowerCase().startsWith("id") ? "id" : "en";
try { lang = localStorage.getItem("citizenesia.lang") || lang; } catch {}
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem("citizenesia.lang", l); } catch {} }
export function t9n(k, vars = {}) {
  let s = T[lang][k] ?? T.en[k] ?? k;
  if (typeof s === "string") for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b);
  return s;
}
