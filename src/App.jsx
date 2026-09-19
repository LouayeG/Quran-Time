import React, { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  RECITERS,
  getAyahAudioUrl,
  getSurah,
  getSurahAudioUrl,
  getSurahList,
} from './api'
import { Icon } from './icons'
import { Dropdown } from './Dropdown'

const DEFAULT_SURAH = 1

function getInitialSurahNo() {
  const params = new URLSearchParams(window.location.search)
  const requestedSurah = Number.parseInt(params.get('surah') || '', 10)

  if (Number.isInteger(requestedSurah) && requestedSurah >= 1 && requestedSurah <= 114) {
    return requestedSurah
  }

  return DEFAULT_SURAH
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function useIsDesktop() {
  const query = '(min-width: 1024px)'
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

const TABS = [
  { id: 'read', label: 'قراءة', icon: 'book' },
  { id: 'listen', label: 'استماع', icon: 'headphones' },
  { id: 'surahs', label: 'السور', icon: 'list' },
  { id: 'settings', label: 'إعدادات', icon: 'gear' },
]

export default function App() {
  const audioRef = useRef(null)
  const isDesktop = useIsDesktop()

  const [tab, setTab] = useState('read')
  const [selectedSurahNo, setSelectedSurahNo] = useState(getInitialSurahNo)
  const [query, setQuery] = useState('')
  const [reciterId, setReciterId] = useState(RECITERS[0].id)
  const [track, setTrack] = useState(null)
  const [pendingPlay, setPendingPlay] = useState(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('qt-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number.parseFloat(localStorage.getItem('qt-font') || '')
    return Number.isFinite(saved) ? Math.min(1.5, Math.max(0.85, saved)) : 1
  })

  const selectedReciter =
    RECITERS.find((reciter) => reciter.id === reciterId) || RECITERS[0]

  const reciterGroups = useMemo(
    () => [
      {
        label: 'سور كاملة وآيات',
        items: RECITERS.filter((r) => r.supportsSurahAudio && r.supportsAyahAudio),
      },
      {
        label: 'آيات فقط',
        items: RECITERS.filter((r) => r.supportsAyahAudio && !r.supportsSurahAudio),
      },
      {
        label: 'سور كاملة فقط',
        items: RECITERS.filter((r) => r.supportsSurahAudio && !r.supportsAyahAudio),
      },
    ],
    [],
  )

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

  // Theme + PWA status bar colour.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1310' : '#15735a')
    localStorage.setItem('qt-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('qt-font', String(fontScale))
  }, [fontScale])

  // Sync selected surah with browser history.
  useEffect(() => {
    const handlePopState = () => setSelectedSurahNo(getInitialSurahNo())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Default track when the surah or reciter changes (no autoplay).
  useEffect(() => {
    if (!surah) return

    if (selectedReciter.supportsSurahAudio) {
      setTrack({
        kind: 'surah',
        title: `${surah.name} — السورة كاملة`,
        src: getSurahAudioUrl(surah.number, selectedReciter),
      })
    } else if (selectedReciter.supportsAyahAudio && surah.ayahs.length) {
      const firstAyah = surah.ayahs[0]
      setTrack({
        kind: 'ayah',
        ayahNumber: firstAyah.number,
        title: `${surah.name} — الآية ${firstAyah.numberInSurah}`,
        src: getAyahAudioUrl(firstAyah.number, selectedReciter),
      })
    } else {
      setTrack(null)
    }
  }, [surah, selectedReciter])

  // Fulfil a requested play after the <audio> src has been committed.
  useEffect(() => {
    if (!pendingPlay) return
    audioRef.current?.play().catch(() => {})
  }, [pendingPlay])

  // Update document metadata per surah.
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
    setCurrentTime(0)
    setPendingPlay((token) => token + 1)
  }

  const playFullSurah = () => {
    if (!surah || !selectedReciter.supportsSurahAudio) return
    playTrack({
      kind: 'surah',
      title: `${surah.name} — السورة كاملة`,
      src: getSurahAudioUrl(surah.number, selectedReciter),
    })
  }

  const playAyah = (ayah) => {
    if (!surah || !selectedReciter.supportsAyahAudio) return
    playTrack({
      kind: 'ayah',
      ayahNumber: ayah.number,
      title: `${surah.name} — الآية ${ayah.numberInSurah}`,
      src: getAyahAudioUrl(ayah.number, selectedReciter),
    })
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !track) return
    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    // Continuous recitation: advance to the next ayah when playing ayah-by-ayah.
    if (track?.kind === 'ayah' && surah) {
      const index = surah.ayahs.findIndex((a) => a.number === track.ayahNumber)
      const next = surah.ayahs[index + 1]
      if (next && selectedReciter.supportsAyahAudio) playAyah(next)
    }
  }

  const seek = (value) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
  }

  const selectSurah = (surahNo) => {
    setSelectedSurahNo(surahNo)
    setTab('read')
    const nextUrl = `${window.location.pathname}?surah=${surahNo}`
    window.history.pushState({ surahNo }, '', nextUrl)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToSurah = (offset) => {
    const next = selectedSurahNo + offset
    if (next >= 1 && next <= 114) selectSurah(next)
  }

  const shell = {
    tab,
    setTab,
    surah,
    isSurahLoading,
    surahError,
    reciter: selectedReciter,
    activeAyahNumber: track?.kind === 'ayah' ? track.ayahNumber : null,
    isPlaying,
    currentTime,
    duration,
    track,
    reciterGroups,
    reciterId,
    setReciterId,
    surahs: filteredSurahs,
    isSurahListLoading,
    surahListError,
    query,
    setQuery,
    selectedSurahNo,
    selectSurah,
    theme,
    setTheme,
    fontScale,
    setFontScale,
    playFullSurah,
    playAyah,
    togglePlay,
    seek,
    goToSurah,
  }

  return (
    <div
      className={`app ${isDesktop ? 'isDesktop' : 'isMobile'}`}
      dir="rtl"
      lang="ar"
      style={{ '--font-scale': fontScale }}
    >
      <audio
        ref={audioRef}
        src={track?.src || ''}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
      />

      {isDesktop ? <DesktopShell {...shell} /> : <MobileShell {...shell} />}
    </div>
  )
}

/* ---------------------------------------------------------------- Mobile */

function MobileShell(props) {
  const {
    tab,
    setTab,
    surah,
    reciter,
    track,
    isPlaying,
    currentTime,
    duration,
    theme,
    setTheme,
  } = props

  const showMiniPlayer = track && tab !== 'listen'

  return (
    <>
      <header className="topbar">
        <button
          className="iconButton"
          onClick={() => setTab('surahs')}
          aria-label="قائمة السور"
        >
          <Icon name="list" />
        </button>
        <div className="topbarTitle">
          <span className="topbarEyebrow">وقت القرآن</span>
          <strong>{surah ? surah.name : 'المصحف'}</strong>
        </div>
        <button
          className="iconButton"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="تبديل الوضع الليلي"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </header>

      <main className="screen">
        {tab === 'read' && <ReadView {...props} />}
        {tab === 'listen' && <ListenView {...props} />}
        {tab === 'surahs' && <SurahsView {...props} />}
        {tab === 'settings' && <SettingsView {...props} />}
      </main>

      <footer className="dock">
        {showMiniPlayer && (
          <button className="miniPlayer" onClick={() => setTab('listen')}>
            <span
              className={`miniPlayerToggle ${isPlaying ? 'playing' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                props.togglePlay()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  props.togglePlay()
                }
              }}
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} />
            </span>
            <span className="miniPlayerMeta">
              <strong>{track.title}</strong>
              <small>{reciter.name}</small>
            </span>
            <span className="miniPlayerProgress" aria-hidden="true">
              <span
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </span>
          </button>
        )}

        <nav className="tabbar" aria-label="التنقل">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={`tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </>
  )
}

/* --------------------------------------------------------------- Desktop */

function DesktopShell(props) {
  const { surah, theme, setTheme } = props
  const [panel, setPanel] = useState('read')

  const openSurah = (surahNo) => {
    props.selectSurah(surahNo)
    setPanel('read')
  }

  return (
    <div className="deskGrid">
      <aside className="deskSidebar">
        <div className="deskBrand">
          <div className="deskBrandText">
            <span className="topbarEyebrow">وقت القرآن</span>
            <strong>المصحف</strong>
          </div>
          <button
            className="iconButton"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="تبديل الوضع الليلي"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>

        <div className="deskSurahs">
          <SurahsView {...props} onSelectOverride={openSurah} />
        </div>

        <div className="deskSidebarFoot">
          <button
            className={`deskNavBtn ${panel === 'read' ? 'active' : ''}`}
            onClick={() => setPanel('read')}
          >
            <Icon name="book" />
            <span>القراءة</span>
          </button>
          <button
            className={`deskNavBtn ${panel === 'settings' ? 'active' : ''}`}
            onClick={() => setPanel('settings')}
          >
            <Icon name="gear" />
            <span>الإعدادات</span>
          </button>
        </div>
      </aside>

      <section className="deskWorkspace">
        <div className="deskMain">
          {panel === 'read' ? <ReadView {...props} /> : <SettingsView {...props} />}
        </div>
        <DesktopPlayerBar {...props} />
      </section>
    </div>
  )
}

function DesktopPlayerBar(props) {
  const {
    surah,
    track,
    reciter,
    reciterGroups,
    reciterId,
    setReciterId,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
    goToSurah,
    playFullSurah,
  } = props

  return (
    <footer className="deskPlayerBar">
      <div className="deskPlayerNow">
        <div className="deskPlayerThumb" aria-hidden="true">
          {surah ? surah.number : '﷽'}
        </div>
        <div className="deskPlayerMeta">
          <strong>{track?.title || 'اختر سورة'}</strong>
          <small>{reciter.name}</small>
        </div>
      </div>

      <div className="deskPlayerControls">
        <div className="transport" dir="ltr">
          <button
            className="transportButton small"
            onClick={() => goToSurah(-1)}
            aria-label="السورة السابقة"
          >
            <Icon name="prev" size={18} />
          </button>
          <button
            className={`playButton small ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={22} />
          </button>
          <button
            className="transportButton small"
            onClick={() => goToSurah(1)}
            aria-label="السورة التالية"
          >
            <Icon name="next" size={18} />
          </button>
        </div>
        <div className="deskScrubber" dir="ltr">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number.parseFloat(e.target.value))}
            aria-label="موضع التشغيل"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="deskPlayerRight">
        <Dropdown
          groups={reciterGroups}
          value={reciterId}
          onChange={setReciterId}
          direction="up"
        />
        {reciter.supportsSurahAudio && (
          <button
            className="iconButton accent"
            onClick={playFullSurah}
            disabled={!surah}
            aria-label="تشغيل السورة كاملة"
            title="تشغيل السورة كاملة"
          >
            <Icon name="play" />
          </button>
        )}
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ Views */

function ReadView({
  surah,
  isSurahLoading,
  surahError,
  reciter,
  activeAyahNumber,
  isPlaying,
  playFullSurah,
  playAyah,
}) {
  if (surahError) {
    return <div className="notice error">تعذر تحميل السورة. {surahError.message}</div>
  }

  if (isSurahLoading || !surah) {
    return <SkeletonReader />
  }

  return (
    <section className="reader">
      <div className="surahHeading">
        <span className={`revealBadge ${surah.revelationType === 'Meccan' ? 'meccan' : 'medinan'}`}>
          {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
        </span>
        <h1>{surah.name}</h1>
        <p>{surah.englishName} · {surah.numberOfAyahs} آية</p>
        {reciter.supportsSurahAudio && (
          <button className="chipButton" onClick={playFullSurah}>
            <Icon name="play" />
            تشغيل السورة كاملة
          </button>
        )}
        {!reciter.supportsAyahAudio && (
          <p className="hint">هذا القارئ يوفّر السورة كاملة فقط.</p>
        )}
      </div>

      <div className="ayahList">
        {surah.ayahs.map((ayah, index) => {
          const active = ayah.number === activeAyahNumber
          return (
            <article
              className={`ayahCard ${active ? 'active' : ''}`}
              key={ayah.number}
              style={{ '--i': Math.min(index, 12) }}
            >
              <div className="ayahTop">
                <span className="ayahNumber">{ayah.numberInSurah}</span>
                {reciter.supportsAyahAudio && (
                  <button
                    className="ayahPlay"
                    onClick={() => playAyah(ayah)}
                    aria-label={`تشغيل الآية ${ayah.numberInSurah}`}
                  >
                    <Icon name={active && isPlaying ? 'pause' : 'play'} />
                  </button>
                )}
              </div>
              <p className="arabic" dir="rtl" lang="ar">
                {ayah.arabic}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ListenView({
  surah,
  track,
  reciter,
  reciterGroups,
  reciterId,
  setReciterId,
  isPlaying,
  currentTime,
  duration,
  togglePlay,
  seek,
  goToSurah,
  playFullSurah,
}) {
  return (
    <section className="player">
      <div className="artwork">
        <span className="artworkGlyph">{surah ? surah.name : 'القرآن'}</span>
        <span className="artworkSub">{reciter.name}</span>
      </div>

      <div className="playerMeta">
        <strong>{track?.title || 'اختر سورة للاستماع'}</strong>
      </div>

      <div className="scrubber">
        <input
          type="range"
          dir="ltr"
          min={0}
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => seek(Number.parseFloat(e.target.value))}
          aria-label="موضع التشغيل"
        />
        <div className="scrubberTimes" dir="ltr">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="transport" dir="ltr">
        <button className="transportButton" onClick={() => goToSurah(-1)} aria-label="السورة السابقة">
          <Icon name="prev" />
        </button>
        <button
          className={`playButton ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={30} />
        </button>
        <button className="transportButton" onClick={() => goToSurah(1)} aria-label="السورة التالية">
          <Icon name="next" />
        </button>
      </div>

      <label className="field">
        <span>القارئ</span>
        <Dropdown
          groups={reciterGroups}
          value={reciterId}
          onChange={setReciterId}
          direction="up"
        />
      </label>

      {reciter.supportsSurahAudio ? (
        <button className="primaryButton" onClick={playFullSurah} disabled={!surah}>
          تشغيل السورة كاملة
        </button>
      ) : (
        <p className="hint">هذا القارئ يوفّر تلاوة الآيات فقط — اختر آية من شاشة القراءة.</p>
      )}
    </section>
  )
}

function SurahsView({
  surahs,
  isSurahListLoading,
  surahListError,
  query,
  setQuery,
  selectedSurahNo,
  selectSurah,
  onSelectOverride,
}) {
  const handleSelect = onSelectOverride || selectSurah
  return (
    <section className="surahs">
      <div className="searchBar">
        <Icon name="search" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم السورة أو رقمها"
          aria-label="البحث في السور"
        />
      </div>

      {surahListError && (
        <div className="notice error">تعذر تحميل قائمة السور. {surahListError.message}</div>
      )}
      {isSurahListLoading && <div className="notice">جاري تحميل القائمة…</div>}

      <div className="surahList">
        {surahs.map((item) => (
          <button
            key={item.number}
            className={`surahRow ${item.number === selectedSurahNo ? 'active' : ''}`}
            onClick={() => handleSelect(item.number)}
          >
            <span className="surahIndex">{item.number}</span>
            <span className="surahText">
              <strong>{item.name}</strong>
              <small>{item.englishName} · {item.numberOfAyahs} آية</small>
            </span>
            <Icon name="chevron" />
          </button>
        ))}
      </div>
    </section>
  )
}

function SettingsView({ theme, setTheme, fontScale, setFontScale }) {
  return (
    <section className="settings">
      <div className="settingCard">
        <h2>المظهر</h2>
        <div className="segmented">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
            نهاري
          </button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
            ليلي
          </button>
        </div>
      </div>

      <div className="settingCard">
        <h2>حجم الخط</h2>
        <div className="fontRow">
          <span className="fontSmall">أ</span>
          <input
            type="range"
            min="0.85"
            max="1.5"
            step="0.05"
            value={fontScale}
            onChange={(e) => setFontScale(Number.parseFloat(e.target.value))}
            aria-label="حجم خط الآيات"
          />
          <span className="fontLarge">أ</span>
        </div>
        <p className="arabic previewText" style={{ '--font-scale': fontScale }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
      </div>

      <div className="settingCard">
        <h2>عن التطبيق</h2>
        <p className="hint">
          نص القرآن من alquran.cloud، وملفات الصوت من شبكة islamic.network.
        </p>
      </div>
    </section>
  )
}

function SkeletonReader() {
  return (
    <section className="reader" aria-hidden="true">
      <div className="surahHeading">
        <div className="skel skelLine" style={{ width: '40%' }} />
        <div className="skel skelTitle" />
        <div className="skel skelLine" style={{ width: '55%' }} />
      </div>
      <div className="ayahList">
        {[0, 1, 2, 3].map((i) => (
          <article className="ayahCard" key={i}>
            <div className="ayahTop">
              <span className="skel skelDot" />
            </div>
            <div className="skel skelLine" style={{ width: '100%' }} />
            <div className="skel skelLine" style={{ width: '85%' }} />
            <div className="skel skelLine" style={{ width: '60%' }} />
          </article>
        ))}
      </div>
    </section>
  )
}
