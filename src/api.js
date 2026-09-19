const API_BASE = 'https://api.alquran.cloud/v1'
const CDN_BASE = 'https://cdn.islamic.network/quran'

// Bitrates and capability flags below are verified against the
// cdn.islamic.network CDN: many reciters expose only per-ayah audio or only
// full-surah audio, and the two can live at different bitrates.
export const RECITERS = [
  // Full support: per-ayah AND full-surah audio.
  {
    id: 'ar.alafasy',
    name: 'مشاري راشد العفاسي',
    ayahBitrate: 128,
    surahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: true,
  },
  {
    id: 'ar.abdulbasitmurattal',
    name: 'عبد الباسط عبد الصمد (مرتّل)',
    ayahBitrate: 64,
    surahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: true,
  },
  {
    id: 'ar.abdullahbasfar',
    name: 'عبد الله بصفر',
    ayahBitrate: 64,
    surahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: true,
  },
  // Per-ayah audio only.
  {
    id: 'ar.husary',
    name: 'محمود خليل الحصري',
    ayahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.minshawi',
    name: 'محمد صديق المنشاوي',
    ayahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.mahermuaiqly',
    name: 'ماهر المعيقلي',
    ayahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.abdurrahmaansudais',
    name: 'عبد الرحمن السديس',
    ayahBitrate: 64,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.saoodshuraym',
    name: 'سعود الشريم',
    ayahBitrate: 64,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.shaatree',
    name: 'أبو بكر الشاطري',
    ayahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.ahmedajamy',
    name: 'أحمد بن علي العجمي',
    ayahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.hudhaify',
    name: 'علي بن عبد الرحمن الحذيفي',
    ayahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.muhammadayyoub',
    name: 'محمد أيوب',
    ayahBitrate: 128,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  {
    id: 'ar.hanirifai',
    name: 'هاني الرفاعي',
    ayahBitrate: 64,
    supportsAyahAudio: true,
    supportsSurahAudio: false,
  },
  // Full-surah audio only.
  {
    id: 'ar.yasseraldossari',
    name: 'ياسر الدوسري',
    surahBitrate: 128,
    supportsAyahAudio: false,
    supportsSurahAudio: true,
  },
  {
    id: 'ar.nasseralqatami',
    name: 'ناصر القطامي',
    surahBitrate: 128,
    supportsAyahAudio: false,
    supportsSurahAudio: true,
  },
  {
    id: 'ar.abdullahawadaljuhani',
    name: 'عبد الله عواد الجهني',
    surahBitrate: 128,
    supportsAyahAudio: false,
    supportsSurahAudio: true,
  },
]

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`)

  if (!response.ok) {
    let body = ''
    try {
      body = await response.text()
    } catch {
      body = ''
    }
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`)
  }

  const payload = await response.json()

  if (payload.status && payload.status !== 'OK') {
    throw new Error(payload.status)
  }

  return payload.data
}

export async function getSurahList() {
  return fetchJson('/surah')
}

export async function getSurah(surahNo) {
  const editions = await fetchJson(`/surah/${surahNo}/editions/quran-uthmani`)
  const arabic = editions.find((edition) => edition.edition.identifier === 'quran-uthmani')

  if (!arabic) {
    throw new Error('تعذر تحميل نص السورة.')
  }

  return {
    number: arabic.number,
    name: arabic.name,
    englishName: arabic.englishName,
    englishNameTranslation: arabic.englishNameTranslation,
    revelationType: arabic.revelationType,
    numberOfAyahs: arabic.numberOfAyahs,
    ayahs: arabic.ayahs.map((ayah) => ({
      number: ayah.number,
      numberInSurah: ayah.numberInSurah,
      arabic: ayah.text.replace(/^\uFEFF/, ''),
    })),
  }
}

export function getSurahAudioUrl(surahNo, reciter = RECITERS[0]) {
  return `${CDN_BASE}/audio-surah/${reciter.surahBitrate}/${reciter.id}/${surahNo}.mp3`
}

export function getAyahAudioUrl(globalAyahNo, reciter = RECITERS[0]) {
  return `${CDN_BASE}/audio/${reciter.ayahBitrate}/${reciter.id}/${globalAyahNo}.mp3`
}

export default {
  RECITERS,
  getSurahList,
  getSurah,
  getSurahAudioUrl,
  getAyahAudioUrl,
}
