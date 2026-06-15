import React, { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  RECITERS,
  getAyahAudioUrl,
  getSurah,
  getSurahAudioUrl,
  getSurahList,
} from './api'

const DEFAULT_SURAH = 1

function getInitialSurahNo() {
  const params = new URLSearchParams(window.location.search)
  const requestedSurah = Number.parseInt(params.get('surah') || '', 10)

  if (Number.isInteger(requestedSurah) && requestedSurah >= 1 && requestedSurah <= 114) {
    return requestedSurah
  }

  return DEFAULT_SURAH
}

export default function App() {
  const audioRef = useRef(null)
  const [selectedSurahNo, setSelectedSurahNo] = useState(getInitialSurahNo)
  const [query, setQuery] = useState('')
  const [reciterId, setReciterId] = useState(RECITERS[0].id)
  const [track, setTrack] = useState(null)

  const selectedReciter =
    RECITERS.find((reciter) => reciter.id === reciterId) || RECITERS[0]

  const {
    data: surahs = [],
    error: surahListError,
    isLoading: isSurahListLoading,
  } = useSWR('surah-list', getSurahList, {
    revalidateOnFocus: false,
    dedupingInterval: 1000 * 60 * 60,
  })

  const {
    data: surah,
    error: surahError,
    isLoading: isSurahLoading,
  } = useSWR(['surah', selectedSurahNo], () => getSurah(selectedSurahNo), {
    revalidateOnFocus: false,
  })

  const filteredSurahs = useMemo(() => {
    const normalizedQuery = query.trim()
    const normalizedEnglishQuery = normalizedQuery.toLowerCase()

    if (!normalizedQuery) return surahs

    return surahs.filter((item) => {
      return (
        String(item.number).startsWith(normalizedQuery) ||
        item.englishName.toLowerCase().includes(normalizedEnglishQuery) ||
        item.name.includes(query.trim())
      )
    })
  }, [query, surahs])

  useEffect(() => {
    const handlePopState = () => {
      setSelectedSurahNo(getInitialSurahNo())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!surah) return

    setTrack({
      title: `${surah.name} - السورة كاملة`,
      src: getSurahAudioUrl(surah.number, selectedReciter),
    })
  }, [surah, selectedReciter])

  useEffect(() => {
    if (!surah) return

    const title = `${surah.name} | وقت القرآن`
    const description = `استمع إلى ${surah.name} واقرأ آياتها كاملة بتصميم عربي سهل ومباشر.`
    const canonical = `${window.location.origin}${window.location.pathname}?surah=${surah.number}`

    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical)
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
  }, [surah])

  const playTrack = (nextTrack) => {
    setTrack(nextTrack)

    window.setTimeout(() => {
      audioRef.current?.play().catch(() => {})
    }, 0)
  }

  const playFullSurah = () => {
    if (!surah) return

    playTrack({
      title: `${surah.name} - السورة كاملة`,
      src: getSurahAudioUrl(surah.number, selectedReciter),
    })
  }

  const playAyah = (ayah) => {
    playTrack({
      title: `${surah.name} - الآية ${ayah.numberInSurah}`,
      src: getAyahAudioUrl(ayah.number, selectedReciter),
    })
  }

  const selectSurah = (surahNo) => {
    setSelectedSurahNo(surahNo)
    const nextUrl = `${window.location.pathname}?surah=${surahNo}`
    window.history.pushState({ surahNo }, '', nextUrl)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="appShell" dir="rtl" lang="ar">
      <main className="reader">
        <section className="content">
          <header className="hero">
            <p className="eyebrow">وقت القرآن</p>
            <h1>{surah ? surah.name : 'مشغل القرآن'}</h1>
            <p className="subtitle">
              {surah
                ? `${surah.numberOfAyahs} آية`
                : 'اختر سورة للقراءة والاستماع.'}
            </p>
          </header>

          <section className="playerCard" aria-label="مشغل القرآن الصوتي">
            <div className="playerTop">
              <div>
                <span className="label">التلاوة الحالية</span>
                <strong>{track?.title || 'اختر سورة'}</strong>
              </div>

              <label className="reciterSelect">
                <span>القارئ</span>
                <select
                  value={reciterId}
                  onChange={(event) => setReciterId(event.target.value)}
                >
                  {RECITERS.map((reciter) => (
                    <option key={reciter.id} value={reciter.id}>
                      {reciter.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <audio
              ref={audioRef}
              className="audio"
              controls
              preload="metadata"
              src={track?.src || ''}
            />

            <button className="primaryButton" onClick={playFullSurah} disabled={!surah}>
              تشغيل السورة كاملة
            </button>
          </section>

          {surahError && (
            <div className="notice error">
              تعذر تحميل السورة. {surahError.message}
            </div>
          )}

          {isSurahLoading && <div className="notice">جاري تحميل السورة...</div>}

          {surah && (
            <section className="ayahList" aria-label={`آيات ${surah.name}`}>
              {surah.ayahs.map((ayah) => (
                <article className="ayahCard" key={ayah.number}>
                  <div className="ayahNumber">{ayah.numberInSurah}</div>
                  <div className="ayahBody">
                    <p className="arabic" dir="rtl" lang="ar">
                      {ayah.arabic}
                    </p>
                    <button className="textButton" onClick={() => playAyah(ayah)}>
                      تشغيل الآية
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>

        <aside className="surahPanel" aria-label="قائمة السور">
          <div className="panelHeader">
            <h2>السور</h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم السورة أو رقمها"
              aria-label="البحث في السور"
            />
          </div>

          {surahListError && (
            <div className="notice error">
              تعذر تحميل قائمة السور. {surahListError.message}
            </div>
          )}

          {isSurahListLoading && <div className="notice">جاري تحميل القائمة...</div>}

          <div className="surahList">
            {filteredSurahs.map((item) => (
              <button
                key={item.number}
                className={`surahButton ${
                  item.number === selectedSurahNo ? 'active' : ''
                }`}
                onClick={() => selectSurah(item.number)}
              >
                <span className="surahIndex">{item.number}</span>
                <span className="surahMeta">
                  <strong>{item.name}</strong>
                  <small>{item.numberOfAyahs} آية</small>
                </span>
                <span className="surahArabic" dir="rtl">
                  استماع
                </span>
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}
