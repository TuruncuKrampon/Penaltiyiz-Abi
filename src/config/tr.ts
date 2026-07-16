/**
 * All user-facing strings (Turkish). Keep keys semantic so an English
 * locale swap later only means providing a second file with this shape.
 */

export const TR = {
  title: 'TURUNCU KRAMPON',
  tagline: '2.5D Penaltı Kapışması',

  menu: {
    vsCpu: 'Bilgisayara Karşı',
    hotSeat: '1v1 Aynı Cihazda',
    difficulty: 'Zorluk',
    difficulties: {
      easy: 'Kolay',
      normal: 'Normal',
      legend: 'Efsane'
    } as Record<string, string>,
    start: 'Başla'
  },

  select: {
    heading: 'Formanı Seç',
    player1: 'Oyuncu 1',
    player2: 'Oyuncu 2',
    cpu: 'Bilgisayar',
    skins: {
      bw: 'Siyah-Beyaz',
      yn: 'Sarı-Lacivert',
      yr: 'Sarı-Kırmızı'
    } as Record<string, string>,
    sameSkinWarning: 'İki oyuncu aynı formayı seçemez!',
    continue: 'Devam'
  },

  match: {
    handOverTitle: 'Sıra sende!',
    handOverShooter: (name: string) => `${name} penaltıyı kullanacak`,
    handOverKeeper: (name: string) => `${name} kaleye geçiyor`,
    handOverTap: 'Hazır olunca dokun',
    phaseAimX: 'Yönü kilitle!',
    phaseAimY: 'Yüksekliği kilitle!',
    phasePower: 'Gücü ayarla!',
    phaseRunup: 'Kaleci: yönünü seç!',
    keeperLeft: 'SOL',
    keeperCenter: 'ORTA',
    keeperRight: 'SAĞ',
    announcerGoal: 'GOOOL!',
    announcerSave: 'KURTARDI!',
    announcerPost: 'DİREK!',
    announcerMiss: 'DIŞARI!',
    suddenDeath: 'ALTIN GOL!',
    besiktasLine: 'BABANIZ BEŞİKTAŞ ULAN!',
    besiktasTts: 'Babanız Beşiktaş ulan!',
    shotCounter: (n: number, total: number) => `Atış ${n} / ${total}`
  },

  result: {
    winner: (name: string) => `${name} KAZANDI!`,
    finalScore: 'Maç Sonucu',
    rematch: 'Tekrar Oyna',
    mainMenu: 'Ana Menü',
    streak: (n: number) => `Seri: ${n} galibiyet`
  }
} as const;
