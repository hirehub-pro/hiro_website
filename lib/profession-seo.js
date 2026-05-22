const PROFESSION_SEO_MAP = {
  plumber: {
    en: {
      title: 'Plumbers Near You',
      intro: 'Find trusted plumbers for leaks, clogs, pipe repairs, bathroom issues, and urgent plumbing jobs near you.',
      keywords: ['plumber', 'plumbers near me', 'emergency plumber', 'leak repair', 'drain unclogging', 'pipe repair'],
    },
    he: {
      title: 'אינסטלטורים לידכם',
      intro: 'מצאו אינסטלטורים אמינים לתיקון נזילות, פתיחת סתימות, תיקון צנרת, בעיות אמבטיה ועבודות אינסטלציה דחופות לידכם.',
      keywords: ['אינסטלטור', 'אינסטלטורים לידכם', 'אינסטלטור חירום', 'תיקון נזילות', 'פתיחת סתימות', 'תיקון צנרת'],
    },
    ar: {
      title: 'سباكين بالقرب منكم',
      intro: 'اعثروا على سباكين موثوقين لإصلاح التسربات، فتح الانسدادات، إصلاح الأنابيب، مشاكل الحمام وأعمال السباكة العاجلة بالقرب منكم.',
      keywords: ['سباك', 'سباك قريب', 'سباك طوارئ', 'إصلاح تسربات', 'فتح انسدادات', 'إصلاح أنابيب'],
    },
    ru: {
      keywords: ['сантехник', 'сантехники рядом', 'аварийный сантехник', 'ремонт протечек', 'прочистка засоров', 'ремонт труб'],
    },
    am: {
      keywords: ['ፕላምበር', 'በአቅራቢያ ያሉ ፕላምበሮች', 'አስቸኳይ ፕላምበር', 'የፍሳሽ ጥገና', 'መዝጊያ መክፈት', 'የቧንቧ ጥገና'],
    },
  },
  electrician: {
    en: {
      title: 'Electricians Near You',
      intro: 'Find trusted electricians for electrical repairs, urgent faults, lighting work, panel upgrades, and safe home installations.',
      keywords: ['electrician', 'electricians near me', 'emergency electrician', 'electrical repair', 'lighting installation', 'home electrical work'],
    },
    he: {
      title: 'חשמלאים לידכם',
      intro: 'מצאו חשמלאים אמינים לתיקוני חשמל, תקלות דחופות, עבודות תאורה, שדרוג לוחות חשמל והתקנות בטוחות לבית.',
      keywords: ['חשמלאי', 'חשמלאים לידכם', 'חשמלאי חירום', 'תיקון חשמל', 'התקנת תאורה', 'עבודות חשמל לבית'],
    },
    ar: {
      title: 'كهربائيين بالقرب منكم',
      intro: 'اعثروا على كهربائيين موثوقين لإصلاح الأعطال الكهربائية، المشاكل الطارئة، أعمال الإنارة، تحديث اللوحات والتركيبات المنزلية الآمنة.',
      keywords: ['كهربائي', 'كهربائي قريب', 'كهربائي طوارئ', 'إصلاح كهرباء', 'تركيب إنارة', 'أعمال كهرباء منزلية'],
    },
    ru: {
      keywords: ['электрик', 'электрики рядом', 'аварийный электрик', 'ремонт электрики', 'установка освещения', 'домашние электромонтажные работы'],
    },
    am: {
      keywords: ['ኤሌክትሪሽያን', 'በአቅራቢያ ያሉ ኤሌክትሪሽያኖች', 'አስቸኳይ ኤሌክትሪሽያን', 'የኤሌክትሪክ ጥገና', 'መብራት መግጠም', 'የቤት ኤሌክትሪክ ስራ'],
    },
  },
  painter: {
    en: {
      title: 'Painters Near You',
      intro: 'Find trusted painters for apartment painting, wall refreshes, interior projects, exterior work, and finishing touches.',
      keywords: ['painter', 'painters near me', 'house painter', 'wall painting', 'apartment painting', 'painting services'],
    },
    he: {
      title: 'צבעים לידכם',
      intro: 'מצאו צבעים אמינים לצביעת דירה, חידוש קירות, פרויקטים פנימיים, עבודות חוץ וגימורים.',
      keywords: ['צבעי', 'צבעים לידכם', 'צביעת דירה', 'צביעת קירות', 'עבודות צבע', 'צביעת בית'],
    },
    ar: {
      title: 'دهانين بالقرب منكم',
      intro: 'اعثروا على دهانين موثوقين لدهان الشقق، تجديد الجدران، المشاريع الداخلية، الأعمال الخارجية واللمسات النهائية.',
      keywords: ['دهان', 'دهان قريب', 'دهان منزل', 'دهان جدران', 'خدمات دهان', 'دهان شقة'],
    },
    ru: {
      keywords: ['маляр', 'маляры рядом', 'покраска стен', 'покраска квартиры', 'малярные работы', 'покраска дома'],
    },
    am: {
      keywords: ['ቀለም ባለሙያ', 'በአቅራቢያ ያሉ ቀለም ሰሪዎች', 'የግድግዳ ቀለም', 'የአፓርታማ ቀለም', 'የቀለም አገልግሎት', 'የቤት ቀለም'],
    },
  },
  carpenter: {
    en: {
      title: 'Carpenters Near You',
      intro: 'Find trusted carpenters for custom woodwork, cabinets, furniture repairs, installations, and home carpentry projects.',
      keywords: ['carpenter', 'carpenters near me', 'carpentry services', 'wood repair', 'custom cabinets', 'furniture carpenter'],
    },
    he: {
      title: 'נגרים לידכם',
      intro: 'מצאו נגרים אמינים לעבודות עץ, ארונות בהתאמה אישית, תיקון רהיטים, התקנות ופרויקטים לבית.',
      keywords: ['נגר', 'נגרים לידכם', 'עבודות נגרות', 'תיקון עץ', 'ארונות בהתאמה אישית', 'תיקון רהיטים'],
    },
    ar: {
      title: 'نجارين بالقرب منكم',
      intro: 'اعثروا على نجارين موثوقين للأعمال الخشبية، الخزائن المخصصة، إصلاح الأثاث، التركيبات ومشاريع النجارة المنزلية.',
      keywords: ['نجار', 'نجار قريب', 'أعمال نجارة', 'إصلاح خشب', 'خزائن مخصصة', 'إصلاح أثاث'],
    },
    ru: {
      keywords: ['плотник', 'столяр рядом', 'столярные работы', 'ремонт дерева', 'шкафы на заказ', 'ремонт мебели'],
    },
    am: {
      keywords: ['ካርፔንተር', 'በአቅራቢያ ያሉ ካርፔንተሮች', 'የእንጨት ስራ', 'የእንጨት ጥገና', 'ብጁ ካቢኔቶች', 'የፈርኒቸር ጥገና'],
    },
  },
  landscaper: {
    en: {
      title: 'Landscapers Near You',
      intro: 'Find trusted landscapers and gardeners for yard cleanup, plant care, irrigation fixes, and outdoor maintenance.',
      keywords: ['landscaper', 'gardener', 'garden maintenance', 'yard cleanup', 'irrigation repair', 'landscaping services'],
    },
    he: {
      title: 'גננים לידכם',
      intro: 'מצאו גננים אמינים לניקוי חצר, טיפול בצמחים, תיקון השקיה ותחזוקת חוץ.',
      keywords: ['גנן', 'גננים לידכם', 'עבודות גינון', 'תחזוקת גינה', 'ניקוי חצר', 'תיקון השקיה'],
    },
    ar: {
      title: 'بستانيين بالقرب منكم',
      intro: 'اعثروا على بستانيين موثوقين لتنظيف الساحات، العناية بالنباتات، إصلاح الري وصيانة المساحات الخارجية.',
      keywords: ['بستاني', 'بستاني قريب', 'أعمال حدائق', 'صيانة حديقة', 'تنظيف ساحة', 'إصلاح ري'],
    },
    ru: {
      keywords: ['садовник', 'ландшафтный специалист рядом', 'уход за садом', 'уборка двора', 'ремонт полива', 'ландшафтные услуги'],
    },
    am: {
      keywords: ['አትክልት ባለሙያ', 'በአቅራቢያ ያሉ ገነት ባለሙያዎች', 'የአትክልት እንክብካቤ', 'የግቢ ጽዳት', 'የውሃ ስርዓት ጥገና', 'የውጭ ጥገና'],
    },
  },
  cleaner: {
    en: {
      title: 'Cleaners Near You',
      intro: 'Find trusted cleaners for homes, offices, deep cleaning, regular maintenance, and move-in or move-out cleaning.',
      keywords: ['cleaner', 'cleaners near me', 'house cleaning', 'office cleaning', 'deep cleaning', 'cleaning services'],
    },
    he: {
      title: 'מנקות ומנקים לידכם',
      intro: 'מצאו מנקות ומנקים אמינים לבתים, משרדים, ניקיון יסודי, תחזוקה שוטפת וניקיון לפני או אחרי מעבר.',
      keywords: ['מנקה', 'מנקות לידכם', 'ניקיון בתים', 'ניקיון משרדים', 'ניקיון יסודי', 'שירותי ניקיון'],
    },
    ar: {
      title: 'عمال نظافة بالقرب منكم',
      intro: 'اعثروا على عمال نظافة موثوقين للمنازل، المكاتب، التنظيف العميق، الصيانة الدورية والتنظيف قبل أو بعد الانتقال.',
      keywords: ['عامل نظافة', 'تنظيف منازل', 'تنظيف مكاتب', 'تنظيف عميق', 'خدمات تنظيف', 'تنظيف بعد الانتقال'],
    },
    ru: {
      keywords: ['уборщик', 'клининг рядом', 'уборка дома', 'уборка офиса', 'генеральная уборка', 'клининговые услуги'],
    },
    am: {
      keywords: ['ንጽህና ሰራተኛ', 'በአቅራቢያ ያሉ ንጽህና ሰራተኞች', 'የቤት ጽዳት', 'የቢሮ ጽዳት', 'ጥልቅ ጽዳት', 'የጽዳት አገልግሎት'],
    },
  },
  'ac-technician': {
    en: {
      title: 'AC Technicians Near You',
      intro: 'Find trusted AC technicians for air conditioner repair, installation, maintenance, and cooling problems at home or work.',
      keywords: ['ac technician', 'air conditioner repair', 'ac installation', 'cooling service', 'air conditioning maintenance', 'hvac technician'],
    },
    he: {
      title: 'טכנאי מזגנים לידכם',
      intro: 'מצאו טכנאי מזגנים אמינים לתיקון מזגן, התקנת מזגן, תחזוקה ופתרון תקלות קירור בבית או בעסק.',
      keywords: ['טכנאי מזגנים', 'תיקון מזגנים', 'התקנת מזגן', 'שירות קירור', 'תחזוקת מזגן', 'תיקון מזגן'],
    },
    ar: {
      title: 'فنيي تكييف بالقرب منكم',
      intro: 'اعثروا على فنيي تكييف موثوقين لإصلاح المكيفات، التركيب، الصيانة وحل مشاكل التبريد في البيت أو العمل.',
      keywords: ['فني تكييف', 'إصلاح مكيف', 'تركيب مكيف', 'صيانة تكييف', 'خدمة تبريد', 'فني تكييف قريب'],
    },
    ru: {
      keywords: ['техник по кондиционерам', 'ремонт кондиционера', 'установка кондиционера', 'обслуживание кондиционера', 'сервис охлаждения', 'hvac мастер'],
    },
    am: {
      keywords: ['የኤሲ ቴክኒሺያን', 'የአየር ማቀዝቀዣ ጥገና', 'ኤሲ መግጠም', 'የማቀዝቀዣ አገልግሎት', 'የኤሲ ጥገና', 'hvac ባለሙያ'],
    },
  },
  handyman: {
    en: {
      title: 'Handymen Near You',
      intro: 'Find trusted handymen for small home repairs, installations, mounting, maintenance, and general household fixes.',
      keywords: ['handyman', 'handyman near me', 'home repair', 'small repairs', 'maintenance services', 'general repair'],
    },
    he: {
      title: 'הנדימנים לידכם',
      intro: 'מצאו הנדימנים אמינים לתיקונים קטנים בבית, התקנות, תלייה, תחזוקה ועבודות כלליות לבית.',
      keywords: ['הנדימן', 'הנדימנים לידכם', 'תיקונים לבית', 'תיקונים קטנים', 'עבודות תחזוקה', 'עבודות כלליות לבית'],
    },
    ar: {
      title: 'عمال صيانة بالقرب منكم',
      intro: 'اعثروا على عمال صيانة موثوقين للإصلاحات المنزلية الصغيرة، التركيبات، التعليق، الصيانة والأعمال العامة للمنزل.',
      keywords: ['عامل صيانة', 'عامل صيانة قريب', 'إصلاحات منزلية', 'إصلاحات صغيرة', 'خدمات صيانة', 'أعمال منزلية عامة'],
    },
    ru: {
      keywords: ['мастер на час', 'мастер рядом', 'ремонт дома', 'мелкий ремонт', 'услуги по обслуживанию', 'общий ремонт'],
    },
    am: {
      keywords: ['ሀንዲማን', 'በአቅራቢያ ያሉ ሀንዲማኖች', 'የቤት ጥገና', 'ትንሽ ጥገና', 'የጥገና አገልግሎት', 'አጠቃላይ ጥገና'],
    },
  },
  mover: {
    en: {
      title: 'Movers Near You',
      intro: 'Find trusted movers for apartment moves, furniture transport, packing help, and local moving services.',
      keywords: ['mover', 'moving services', 'apartment moving', 'furniture moving', 'local movers', 'transport service'],
    },
    he: {
      title: 'מובילים לידכם',
      intro: 'מצאו מובילים אמינים להובלת דירה, הובלת רהיטים, עזרה באריזה ושירותי הובלה מקומיים.',
      keywords: ['מוביל', 'הובלות', 'הובלת דירה', 'הובלת רהיטים', 'מובילים מקומיים', 'שירות הובלה'],
    },
    ar: {
      title: 'خدمات نقل بالقرب منكم',
      intro: 'اعثروا على خدمات نقل موثوقة لنقل الشقق، نقل الأثاث، المساعدة في التغليف وخدمات النقل المحلية.',
      keywords: ['نقل عفش', 'خدمات نقل', 'نقل شقة', 'نقل أثاث', 'ناقل قريب', 'خدمة نقل محلية'],
    },
    ru: {
      keywords: ['перевозчик', 'услуги переезда', 'переезд квартиры', 'перевозка мебели', 'местные грузчики', 'транспортные услуги'],
    },
    am: {
      keywords: ['ሞቨር', 'የመንቀሳቀስ አገልግሎት', 'የአፓርታማ መንቀሳቀስ', 'የፈርኒቸር መጓጓዣ', 'አካባቢ ሞቨሮች', 'የጓጓዣ አገልግሎት'],
    },
  },
  'pest-control': {
    en: {
      title: 'Pest Control Near You',
      intro: 'Find trusted pest control professionals for bugs, cockroaches, rodents, termites, and home pest treatment.',
      keywords: ['pest control', 'exterminator', 'bug treatment', 'cockroach treatment', 'rodent control', 'home pest control'],
    },
    he: {
      title: 'מדבירים לידכם',
      intro: 'מצאו מדבירים אמינים לטיפול במזיקים, ג׳וקים, מכרסמים, טרמיטים והדברה לבית.',
      keywords: ['הדברה', 'מדביר', 'טיפול במזיקים', 'הדברת ג׳וקים', 'הדברת מכרסמים', 'הדברה לבית'],
    },
    ar: {
      title: 'مكافحة آفات بالقرب منكم',
      intro: 'اعثروا على مختصي مكافحة آفات موثوقين للحشرات، الصراصير، القوارض، النمل الأبيض ومعالجة الآفات المنزلية.',
      keywords: ['مكافحة آفات', 'مبيد حشرات', 'علاج حشرات', 'مكافحة صراصير', 'مكافحة قوارض', 'مكافحة آفات منزلية'],
    },
    ru: {
      keywords: ['дезинсектор', 'борьба с вредителями', 'обработка от тараканов', 'борьба с грызунами', 'уничтожение насекомых', 'обработка дома от вредителей'],
    },
    am: {
      keywords: ['የተባይ ቁጥጥር', 'ተባይ አጥፊ', 'የትንኝ ሕክምና', 'የበረሮ ሕክምና', 'የአይጥ ቁጥጥር', 'የቤት ተባይ ቁጥጥር'],
    },
  },
  roofer: {
    en: {
      title: 'Roofers Near You',
      intro: 'Find trusted roofers for roof repair, sealing, waterproofing, drainage issues, and roofing maintenance.',
      keywords: ['roofer', 'roof repair', 'roof sealing', 'waterproofing', 'roof maintenance', 'roof leak repair'],
    },
    he: {
      title: 'קבלני גגות לידכם',
      intro: 'מצאו קבלני גגות אמינים לתיקון גג, איטום, פתרונות ניקוז ותחזוקת גגות.',
      keywords: ['קבלן גגות', 'תיקון גג', 'איטום גגות', 'תחזוקת גג', 'תיקון נזילות בגג', 'עבודות גג'],
    },
    ar: {
      title: 'مقاولي أسقف بالقرب منكم',
      intro: 'اعثروا على مقاولي أسقف موثوقين لإصلاح الأسطح، العزل، مقاومة المياه، مشاكل التصريف وصيانة الأسقف.',
      keywords: ['مقاول أسقف', 'إصلاح سقف', 'عزل أسطح', 'مقاومة المياه', 'صيانة الأسقف', 'إصلاح تسرب سقف'],
    },
    ru: {
      keywords: ['кровельщик', 'ремонт крыши', 'герметизация крыши', 'гидроизоляция', 'обслуживание крыши', 'ремонт протечки крыши'],
    },
    am: {
      keywords: ['የጣሪያ ባለሙያ', 'የጣሪያ ጥገና', 'የጣሪያ ማሸጊያ', 'ውሃ መከላከያ', 'የጣሪያ ጥገና እና እንክብካቤ', 'የጣሪያ ፍሳሽ ጥገና'],
    },
  },
  locksmith: {
    en: {
      title: 'Locksmiths Near You',
      intro: 'Find trusted locksmiths for door opening, lock repair, key replacement, lock changes, and urgent entry problems.',
      keywords: ['locksmith', 'emergency locksmith', 'door opening', 'lock repair', 'key replacement', 'lock change'],
    },
    he: {
      title: 'מנעולנים לידכם',
      intro: 'מצאו מנעולנים אמינים לפריצת דלת, תיקון מנעולים, החלפת מפתחות, החלפת צילינדר ופתרונות חירום.',
      keywords: ['מנעולן', 'מנעולן חירום', 'פריצת דלת', 'תיקון מנעולים', 'החלפת מפתח', 'החלפת צילינדר'],
    },
    ar: {
      title: 'فنيي أقفال بالقرب منكم',
      intro: 'اعثروا على فنيي أقفال موثوقين لفتح الأبواب، إصلاح الأقفال، استبدال المفاتيح، تغيير الأقفال وحالات الطوارئ.',
      keywords: ['فني أقفال', 'فني أقفال طوارئ', 'فتح باب', 'إصلاح قفل', 'استبدال مفتاح', 'تغيير قفل'],
    },
    ru: {
      keywords: ['слесарь по замкам', 'аварийный locksmith', 'вскрытие двери', 'ремонт замков', 'замена ключа', 'замена цилиндра'],
    },
    am: {
      keywords: ['ሎክስሚዝ', 'አስቸኳይ ሎክስሚዝ', 'የበር መክፈት', 'የመቆለፊያ ጥገና', 'ቁልፍ መቀየር', 'መቆለፊያ መቀየር'],
    },
  },
};

function humanizeSlug(slug) {
  return String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getProfessionSeoData(slug, locale = 'en') {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  const professionData = PROFESSION_SEO_MAP[normalizedSlug];
  const selectedLocale = ['en', 'he', 'ar'].includes(locale) ? locale : 'en';

  if (!professionData) {
    const readableName = humanizeSlug(normalizedSlug);
    return {
      title: `${readableName} Near You | Hiro`,
      description: `Find trusted ${readableName.toLowerCase()} professionals near you on Hiro. Compare local profiles, reviews, and availability with confidence.`,
      intro: `Find trusted ${readableName.toLowerCase()} professionals near you and compare local profiles, reviews, and availability on Hiro.`,
      keywords: readableName ? [readableName, `${readableName} near you`, 'local professionals', 'home services'] : ['local professionals', 'home services'],
    };
  }

  const localizedData = professionData[selectedLocale] || professionData.en;
  const allKeywords = ['en', 'he', 'ar', 'ru', 'am']
    .flatMap((key) => professionData[key]?.keywords || [])
    .filter(Boolean);

  return {
    title: `${localizedData.title} | Hiro`,
    description: localizedData.intro,
    intro: localizedData.intro,
    keywords: allKeywords,
  };
}
