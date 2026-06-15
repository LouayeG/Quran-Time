const API_BASE = 'https://api.alquran.cloud/v1'
const CDN_BASE = 'https://cdn.islamic.network/quran'

export const RECITERS = [
  {
    id: 'ar.alafasy',
    name: 'مشاري راشد العفاسي',
    bitrate: 128,
    supportsAyahAudio: true,
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
  return `${CDN_BASE}/audio-surah/${reciter.bitrate}/${reciter.id}/${surahNo}.mp3`
}

export function getAyahAudioUrl(globalAyahNo, reciter = RECITERS[0]) {
  return `${CDN_BASE}/audio/${reciter.bitrate}/${reciter.id}/${globalAyahNo}.mp3`
}

export default {
  RECITERS,
  getSurahList,
  getSurah,
  getSurahAudioUrl,
  getAyahAudioUrl,
}
