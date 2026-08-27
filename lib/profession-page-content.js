import { getProfessionLabel } from './profession-catalog';
import { getHebrewProfessionEditorial } from './profession-editorial-content';
import { PROFESSION_EDITORIAL_TRANSLATIONS } from './profession-editorial-translations.generated';

const COPY = {
  en: {
    title: (name) => `${name} near you | Reviews and profiles | Hiro`,
    description: (name) => `Compare ${name} profiles near you on Hiro. Check real ratings, service areas and experience, then contact the professional who fits your needs.`,
    editorialDescription: (name, services, isLocal) => `Need ${name.toLowerCase()} services${isLocal ? ' near you' : ''}? Find professionals for ${services} on Hiro. Compare ratings, experience${isLocal ? ' and service areas' : ''}, then contact them directly.`,
    compactDescription: (name, isLocal) => `Find ${name.toLowerCase()} professionals${isLocal ? ' near you' : ''} on Hiro. Compare ratings, relevant experience${isLocal ? ' and service areas' : ''}, then contact the right provider directly.`,
    eyebrow: 'Trusted local professionals',
    h1: (name) => `${name} services near you`,
    intro: (name) => `Compare local professionals offering ${name} services in one place. Review experience, ratings, service areas and recent work before you make contact.`,
    editorialIntro: (name, services) => `${name} can help with ${services} and the additional services below. Check relevant experience, required credentials, previous work and reviews before choosing.`,
    trust: ['Public profiles', 'Customer ratings', 'Direct contact'],
    results: (name) => `Professionals offering ${name.toLowerCase()} services`,
    servicesTitle: 'Services you can request',
    servicesIntro: (name) => `Describe the ${name} service you need and confirm the scope, timing and price before work begins.`,
    howTitle: 'How to choose with confidence',
    how: [
      ['Compare relevant experience', 'Look for completed work and experience that matches your specific request.'],
      ['Read recent feedback', 'Review both the rating and the details customers share about quality, timing and communication.'],
      ['Confirm the details', 'Agree on scope, availability, location and price before booking the service.'],
    ],
    questionsTitle: 'Questions worth asking',
    questions: (name) => [
      [`What should I send before booking ${name.toLowerCase()} services?`, 'Share a clear description, relevant photos, your location and preferred time so the professional can assess the request.'],
      ['How should I compare professionals?', 'Compare relevant experience, recent reviews, service area, availability and a clearly explained quote.'],
      ['Is the displayed price final?', 'Always confirm what is included, whether materials or travel are extra, and how changes to the work will be approved.'],
    ],
    related: 'Related professionals',
    breadcrumbHome: 'Home',
    breadcrumbSearch: 'Professionals',
    showMore: 'Show more',
    showLess: 'Show less',
  },
  he: {
    title: (name) => `${name} באזור שלכם | דירוגים ופרופילים | הירו`,
    description: (name) => `השוו פרופילים של ${name} באזור שלכם בהירו. בדקו דירוגים אמיתיים, אזורי שירות וניסיון ופנו ישירות לבעל המקצוע המתאים.`,
    editorialDescription: (name, services, isLocal) => `מחפשים ${name}${isLocal ? ' באזורכם' : ''}? מצאו בהירו בעלי מקצוע לשירותי ${services}. השוו דירוגים, ניסיון${isLocal ? ' ואזורי שירות' : ''} ופנו ישירות לבעל המקצוע המתאים.`,
    compactDescription: (name, isLocal) => `מצאו ${name}${isLocal ? ' באזורכם' : ''} בהירו. השוו דירוגים, ניסיון${isLocal ? ' ואזורי שירות' : ''} ופנו ישירות לבעל המקצוע המתאים.`,
    eyebrow: 'בעלי מקצוע מקומיים שאפשר להכיר',
    h1: (name) => `${name} באזור שלכם`,
    intro: (name) => `השוו פרופילים של ${name} במקום אחד. בדקו ניסיון, דירוגים, אזורי שירות ועבודות אחרונות לפני שיוצרים קשר.`,
    editorialIntro: (name, services) => `${name} יכולים לסייע ב${services} ובשירותים נוספים שמופיעים בהמשך. בדקו ניסיון רלוונטי, רישוי כשנדרש, עבודות קודמות וחוות דעת לפני שמחליטים.`,
    trust: ['פרופילים ציבוריים', 'דירוגי לקוחות', 'יצירת קשר ישירה'],
    results: (name) => `בעלי מקצוע בתחום ${name}`,
    servicesTitle: 'שירותים שאפשר לבקש',
    servicesIntro: (name) => `תארו את הצורך שלכם בתחום ${name} וסכמו מראש את היקף העבודה, לוח הזמנים והמחיר.`,
    howTitle: 'איך בוחרים בביטחון',
    how: [
      ['משווים ניסיון רלוונטי', 'חפשו ניסיון ועבודות קודמות שמתאימים בדיוק לסוג השירות שאתם צריכים.'],
      ['קוראים משוב עדכני', 'בדקו גם את הציון וגם את הפרטים שלקוחות משתפים על איכות, זמנים ותקשורת.'],
      ['מסכמים את כל הפרטים', 'ודאו מראש את היקף העבודה, הזמינות, אזור השירות והמחיר.'],
    ],
    questionsTitle: 'שאלות שכדאי לשאול',
    questions: (name) => [
      [`מה כדאי לשלוח לפני הזמנת שירות בתחום ${name}?`, 'שלחו תיאור ברור, תמונות רלוונטיות, מיקום וזמן מועדף כדי לאפשר הערכה טובה יותר.'],
      ['איך משווים בין בעלי מקצוע?', 'השוו ניסיון רלוונטי, ביקורות עדכניות, אזור שירות, זמינות והצעת מחיר ברורה.'],
      ['האם המחיר שמופיע הוא סופי?', 'תמיד כדאי לוודא מה כלול, האם חומרים או נסיעה כרוכים בתוספת וכיצד מאשרים שינוי בעבודה.'],
    ],
    related: 'בעלי מקצוע קשורים',
    breadcrumbHome: 'בית',
    breadcrumbSearch: 'בעלי מקצוע',
    showMore: 'הצג עוד',
    showLess: 'הצג פחות',
  },
  ar: {
    title: (name) => `${name} بالقرب منكم | تقييمات وملفات شخصية | هيرو`,
    description: (name) => `قارنوا ملفات ${name} بالقرب منكم على هيرو. راجعوا التقييمات ومناطق الخدمة والخبرة وتواصلوا مباشرة مع المختص المناسب.`,
    editorialDescription: (name, services, isLocal) => `تبحثون عن ${name}${isLocal ? ' بالقرب منكم' : ''}؟ اعثروا على هيرو على مختصين في ${services}. قارنوا التقييمات والخبرة${isLocal ? ' ومناطق الخدمة' : ''} وتواصلوا مباشرة.`,
    compactDescription: (name, isLocal) => `اعثروا على ${name}${isLocal ? ' بالقرب منكم' : ''} على هيرو. قارنوا التقييمات والخبرة${isLocal ? ' ومناطق الخدمة' : ''} وتواصلوا مباشرة مع المختص المناسب.`,
    eyebrow: 'مختصون محليون موثوقون',
    h1: (name) => `${name} موصى بهم بالقرب منكم`,
    intro: (name) => `قارنوا ملفات ${name} في مكان واحد. راجعوا الخبرة والتقييمات ومناطق الخدمة والأعمال الأخيرة قبل التواصل.`,
    editorialIntro: (name, services) => `يمكن أن يساعدكم ${name} في ${services} والخدمات الإضافية أدناه. تحققوا من الخبرة والتراخيص المطلوبة والأعمال السابقة والتقييمات قبل الاختيار.`,
    trust: ['ملفات عامة', 'تقييمات العملاء', 'تواصل مباشر'],
    results: (name) => `${name} متاحون`,
    servicesTitle: 'خدمات يمكنكم طلبها',
    servicesIntro: (name) => `اشرحوا احتياجكم إلى ${name} واتفقوا مسبقاً على نطاق العمل والموعد والسعر.`,
    howTitle: 'كيف تختارون بثقة',
    how: [
      ['قارنوا الخبرة المناسبة', 'ابحثوا عن خبرة وأعمال سابقة تتوافق مع نوع الخدمة المطلوبة.'],
      ['اقرؤوا التقييمات الحديثة', 'راجعوا التقييم والتفاصيل التي يشاركها العملاء عن الجودة والوقت والتواصل.'],
      ['أكدوا جميع التفاصيل', 'اتفقوا على نطاق العمل والتوفر ومنطقة الخدمة والسعر قبل الحجز.'],
    ],
    questionsTitle: 'أسئلة مهمة قبل الحجز',
    questions: (name) => [
      [`ماذا أرسل إلى ${name} قبل الحجز؟`, 'أرسلوا وصفاً واضحاً وصوراً مناسبة والموقع والوقت المفضل للحصول على تقييم أدق.'],
      ['كيف أقارن بين المختصين؟', 'قارنوا الخبرة المناسبة والتقييمات الحديثة ومنطقة الخدمة والتوفر وعرض السعر الواضح.'],
      ['هل السعر المعروض نهائي؟', 'تأكدوا مما يشمله السعر وما إذا كانت المواد أو تكاليف الوصول إضافية وكيف تتم الموافقة على أي تغيير.'],
    ],
    related: 'مختصون ذوو صلة',
    breadcrumbHome: 'الرئيسية',
    breadcrumbSearch: 'المختصون',
    showMore: 'عرض المزيد',
    showLess: 'عرض أقل',
  },
  am: {
    title: (name) => `${name} በአቅራቢያዎ | ደረጃዎችና መገለጫዎች | Hiro`,
    description: (name) => `በHiro ላይ በአቅራቢያዎ ያሉ ${name} መገለጫዎችን ያወዳድሩ። ደረጃ፣ የአገልግሎት አካባቢና ልምድ ይመልከቱ።`,
    editorialDescription: (name, services, isLocal) => `${name}${isLocal ? ' በአቅራቢያዎ' : ''} ይፈልጋሉ? በHiro ላይ ለ${services} ባለሙያዎችን ያግኙ፣ ደረጃንና ልምድን${isLocal ? ' እንዲሁም የአገልግሎት አካባቢን' : ''} ያወዳድሩ እና በቀጥታ ያነጋግሩ።`,
    compactDescription: (name, isLocal) => `${name}${isLocal ? ' በአቅራቢያዎ' : ''} በHiro ላይ ያግኙ። ደረጃንና ልምድን${isLocal ? ' እንዲሁም የአገልግሎት አካባቢን' : ''} ያወዳድሩ እና በቀጥታ ያነጋግሩ።`,
    eyebrow: 'የታመኑ የአካባቢ ባለሙያዎች',
    h1: (name) => `${name} በአቅራቢያዎ ያግኙ`,
    intro: (name) => `የ${name} መገለጫዎችን በአንድ ቦታ ያወዳድሩ። ከመገናኘትዎ በፊት ልምድ፣ ደረጃ፣ የአገልግሎት አካባቢና የቅርብ ጊዜ ሥራ ይመልከቱ።`,
    editorialIntro: (name, services) => `${name} በ${services} እና ከዚህ በታች ባሉ ተጨማሪ አገልግሎቶች ሊረዱዎት ይችላሉ። ከመምረጥዎ በፊት ልምድን፣ አስፈላጊ ፈቃድንና ግምገማዎችን ያረጋግጡ።`,
    trust: ['ይፋዊ መገለጫዎች', 'የደንበኛ ደረጃዎች', 'ቀጥታ ግንኙነት'],
    results: (name) => `የሚገኙ ${name} ባለሙያዎች`,
    servicesTitle: 'ሊጠይቋቸው የሚችሉ አገልግሎቶች',
    servicesIntro: (name) => `ፍላጎትዎን ለ${name} ያብራሩ እና የሥራውን ወሰን፣ ጊዜና ዋጋ አስቀድመው ያረጋግጡ።`,
    howTitle: 'በእምነት እንዴት እንደሚመርጡ',
    how: [
      ['ተዛማጅ ልምድን ያወዳድሩ', 'ከፍላጎትዎ ጋር የሚዛመድ ልምድና የተጠናቀቀ ሥራ ይፈልጉ።'],
      ['የቅርብ ጊዜ አስተያየት ያንብቡ', 'ስለ ጥራት፣ ጊዜና ግንኙነት ደንበኞች ያጋሩትን ይመልከቱ።'],
      ['ዝርዝሮቹን ያረጋግጡ', 'ከማስያዝዎ በፊት የሥራ ወሰን፣ ጊዜ፣ ቦታና ዋጋ ይስማሙ።'],
    ],
    questionsTitle: 'መጠየቅ ያለብዎት ጥያቄዎች',
    questions: (name) => [
      [`ከማስያዝ በፊት ለ${name} ምን ልላክ?`, 'ግልጽ መግለጫ፣ ተዛማጅ ፎቶዎች፣ ቦታና የሚመችዎትን ጊዜ ያጋሩ።'],
      ['ባለሙያዎችን እንዴት ላወዳድር?', 'ልምድ፣ የቅርብ ጊዜ አስተያየት፣ አካባቢ፣ ጊዜና ግልጽ ዋጋ ያወዳድሩ።'],
      ['የታየው ዋጋ የመጨረሻ ነው?', 'ምን እንደተካተተ፣ ቁሳቁስ ወይም ጉዞ ተጨማሪ መሆኑንና ለውጥ እንዴት እንደሚፀድቅ ያረጋግጡ።'],
    ],
    related: 'ተዛማጅ ባለሙያዎች',
    breadcrumbHome: 'መነሻ',
    breadcrumbSearch: 'ባለሙያዎች',
    showMore: 'ተጨማሪ አሳይ',
    showLess: 'ያነሰ አሳይ',
  },
  ru: {
    title: (name) => `${name} рядом с вами | Рейтинги и профили | Hiro`,
    description: (name) => `Сравните профили специалистов категории «${name}» рядом с вами на Hiro. Изучите рейтинг, район работы и опыт и выберите подходящего специалиста.`,
    editorialDescription: (name, services, isLocal) => `Ищете специалиста «${name}»${isLocal ? ' рядом с вами' : ''}? Найдите на Hiro исполнителей для ${services}. Сравните рейтинг, опыт${isLocal ? ' и район работы' : ''} и свяжитесь напрямую.`,
    compactDescription: (name, isLocal) => `Найдите специалиста «${name}»${isLocal ? ' рядом с вами' : ''} на Hiro. Сравните рейтинг, подходящий опыт${isLocal ? ' и район работы' : ''}, затем свяжитесь напрямую.`,
    eyebrow: 'Надёжные местные специалисты',
    h1: (name) => `${name} рядом с вами`,
    intro: (name) => `Сравните профили специалистов категории «${name}» в одном месте. Изучите опыт, рейтинги, районы обслуживания и недавние работы перед обращением.`,
    editorialIntro: (name, services) => `Специалист «${name}» может помочь с такими задачами, как ${services}, а также с другими услугами ниже. Перед выбором проверьте опыт, необходимые лицензии, прошлые работы и отзывы.`,
    trust: ['Открытые профили', 'Оценки клиентов', 'Прямая связь'],
    results: (name) => `Доступные специалисты: ${name}`,
    servicesTitle: 'Какие услуги можно заказать',
    servicesIntro: (name) => `Опишите задачу в категории «${name}» и заранее согласуйте объём работы, сроки и стоимость.`,
    howTitle: 'Как выбрать уверенно',
    how: [
      ['Сравните подходящий опыт', 'Ищите выполненные работы и опыт, соответствующие вашей конкретной задаче.'],
      ['Читайте свежие отзывы', 'Учитывайте оценку и подробности об уровне работы, сроках и общении.'],
      ['Согласуйте детали', 'До заказа подтвердите объём работы, доступность, район обслуживания и стоимость.'],
    ],
    questionsTitle: 'Что стоит спросить',
    questions: (name) => [
      [`Что отправить специалисту ${name} до заказа?`, 'Отправьте понятное описание, подходящие фотографии, адрес и удобное время для более точной оценки.'],
      ['Как сравнить специалистов?', 'Сравните подходящий опыт, свежие отзывы, район работы, доступность и понятность предложения.'],
      ['Указанная цена окончательная?', 'Уточните, что входит в цену, оплачиваются ли материалы и выезд отдельно и как согласуются изменения.'],
    ],
    related: 'Похожие специалисты',
    breadcrumbHome: 'Главная',
    breadcrumbSearch: 'Специалисты',
    showMore: 'Показать ещё',
    showLess: 'Свернуть',
  },
};

const SERVICE_GROUPS = {
  home: ['electrician', 'plumber', 'carpenter', 'painter', 'ac-technician', 'blacksmith', 'cleaner', 'gardener', 'mover', 'appliance-technician', 'construction-worker', 'tiler', 'handyman', 'maintenance-technician', 'aluminum-worker', 'glass-technician', 'locksmith', 'pest-control-specialist', 'cctv-technician', 'electric-gate-technician', 'elevator-technician', 'solar-panel-technician', 'insulation-technician', 'roofer', 'carpet-cleaner', 'pool-technician'],
  vehicle: ['mechanic', 'driver', 'car-painter', 'car-washer', 'tire-technician', 'delivery-driver', 'driving-instructor'],
  personal: ['barber', 'hair-stylist', 'tailor', 'fitness-trainer', 'nail-technician', 'beautician', 'yoga-instructor', 'massage-therapist'],
  care: ['dentist', 'babysitter', 'elderly-caregiver', 'veterinarian', 'nutritionist', 'physiotherapist', 'psychologist'],
  creative: ['graphic-designer', 'developer', 'app-developer', 'video-editor', 'web-designer', 'photographer', 'wedding-planner', 'interior-designer'],
  learning: ['private-teacher', 'translator', 'coach', 'swimming-instructor', 'dog-trainer', 'pet-groomer'],
};

const GROUP_SERVICES = {
  en: {
    home: ['Assessment and troubleshooting', 'Installation and setup', 'Repairs and replacement', 'Ongoing maintenance'],
    vehicle: ['Inspection and diagnosis', 'Routine service', 'Repair or replacement', 'Scheduled assistance'],
    personal: ['Initial consultation', 'Personalized service', 'Scheduled appointment', 'Follow-up care'],
    care: ['Initial assessment', 'Personalized appointment', 'Clear care plan', 'Follow-up support'],
    creative: ['Brief and consultation', 'Custom proposal', 'Project delivery', 'Revisions and support'],
    learning: ['Needs assessment', 'Personalized session', 'Progress plan', 'Ongoing guidance'],
    professional: ['Initial consultation', 'Needs assessment', 'Tailored solution', 'Ongoing support'],
  },
  he: {
    home: ['אבחון התקלה', 'התקנה והכנה', 'תיקון או החלפה', 'תחזוקה שוטפת'],
    vehicle: ['בדיקה ואבחון', 'טיפול שוטף', 'תיקון או החלפה', 'סיוע מתוזמן'],
    personal: ['ייעוץ ראשוני', 'שירות מותאם אישית', 'פגישה מתוזמנת', 'ליווי לאחר השירות'],
    care: ['הערכה ראשונית', 'פגישה מותאמת', 'תוכנית טיפול ברורה', 'מעקב וליווי'],
    creative: ['אפיון וייעוץ', 'הצעה מותאמת', 'ביצוע הפרויקט', 'תיקונים וליווי'],
    learning: ['הערכת צרכים', 'מפגש אישי', 'תוכנית התקדמות', 'ליווי שוטף'],
    professional: ['ייעוץ ראשוני', 'הערכת צרכים', 'פתרון מותאם', 'ליווי שוטף'],
  },
  ar: {
    home: ['فحص وتشخيص', 'تركيب وتجهيز', 'إصلاح أو استبدال', 'صيانة دورية'],
    vehicle: ['فحص وتشخيص', 'خدمة دورية', 'إصلاح أو استبدال', 'مساعدة مجدولة'],
    personal: ['استشارة أولية', 'خدمة مخصصة', 'موعد منظم', 'متابعة بعد الخدمة'],
    care: ['تقييم أولي', 'موعد مخصص', 'خطة واضحة', 'متابعة ودعم'],
    creative: ['تحديد الاحتياج', 'اقتراح مخصص', 'تنفيذ المشروع', 'تعديلات ودعم'],
    learning: ['تقييم الاحتياج', 'جلسة مخصصة', 'خطة تقدم', 'إرشاد مستمر'],
    professional: ['استشارة أولية', 'تقييم الاحتياج', 'حل مخصص', 'دعم مستمر'],
 
  },
  am: {
    home: ['ምርመራና ችግኝ መለየት', 'መጫንና ማዘጋጀት', 'ጥገና ወይም መቀየር', 'መደበኛ ጥገና'],
    vehicle: ['ምርመራና ምልከታ', 'መደበኛ አገልግሎት', 'ጥገና ወይም መቀየር', 'በቀጠሮ እገዛ'],
    personal: ['የመጀመሪያ ምክክር', 'ግላዊ አገልግሎት', 'የቀጠሮ አገልግሎት', 'ክትትል'],
    care: ['የመጀመሪያ ግምገማ', 'ግላዊ ቀጠሮ', 'ግልጽ እቅድ', 'ክትትልና ድጋፍ'],
    creative: ['ፍላጎት መለየት', 'ብጁ ሀሳብ', 'ፕሮጀክት ማጠናቀቅ', 'ማሻሻያና ድጋፍ'],
    learning: ['ፍላጎት ግምገማ', 'ግላዊ ክፍለ ጊዜ', 'የእድገት እቅድ', 'ቀጣይ መመሪያ'],
    professional: ['የመጀመሪያ ምክክር', 'ፍላጎት ግምገማ', 'ብጁ መፍትሔ', 'ቀጣይ ድጋፍ'],
  },
  ru: {
    home: ['Осмотр и диагностика', 'Установка и настройка', 'Ремонт или замена', 'Регулярное обслуживание'],
    vehicle: ['Осмотр и диагностика', 'Плановое обслуживание', 'Ремонт или замена', 'Помощь по записи'],
    personal: ['Первая консультация', 'Персональная услуга', 'Приём по записи', 'Последующий уход'],
    care: ['Первичная оценка', 'Индивидуальный приём', 'Понятный план', 'Наблюдение и поддержка'],
    creative: ['Бриф и консультация', 'Индивидуальное предложение', 'Выполнение проекта', 'Правки и поддержка'],
    learning: ['Оценка потребностей', 'Индивидуальное занятие', 'План развития', 'Постоянная поддержка'],
    professional: ['Первая консультация', 'Оценка потребностей', 'Индивидуальное решение', 'Постоянная поддержка'],
  },
};

function getServiceGroup(slug) {
  return Object.entries(SERVICE_GROUPS).find(([, slugs]) => slugs.includes(slug))?.[0] || 'professional';
}

function formatLocalizedList(values, locale) {
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(values);
  } catch {
    return values.join(', ');
  }
}

export function getProfessionPageContent(profession, locale = 'he') {
  const selectedLocale = COPY[locale] ? locale : 'en';
  const copy = COPY[selectedLocale];
  const rawName = getProfessionLabel(profession, selectedLocale);
  const name = selectedLocale === 'en'
    ? rawName.replace(/^./, (letter) => letter.toUpperCase())
    : rawName;
  const group = getServiceGroup(profession?.slug);
  const editorial = selectedLocale === 'he'
    ? getHebrewProfessionEditorial(profession?.slug)
    : PROFESSION_EDITORIAL_TRANSLATIONS[selectedLocale]?.[profession?.slug] || null;
  const services = editorial?.services || GROUP_SERVICES[selectedLocale][group];
  const questions = editorial?.questions || copy.questions(name);
  const featuredServices = formatLocalizedList(services.slice(0, 3), selectedLocale);
  const isLocalProfession = profession?.bookingMode !== 'online';
  let editorialDescription = copy.description(name);
  if (editorial) {
    const twoServices = formatLocalizedList(services.slice(0, 2), selectedLocale);
    editorialDescription = copy.editorialDescription(name, twoServices, isLocalProfession);

    if ([...editorialDescription].length > 180) {
      editorialDescription = copy.editorialDescription(name, services[0], isLocalProfession);
    }

    if ([...editorialDescription].length > 180) {
      editorialDescription = copy.compactDescription(name, isLocalProfession);
    }
  }
  const editorialIntro = editorial
    ? copy.editorialIntro(name, featuredServices)
    : copy.intro(name);

  return {
    name,
    title: copy.title(name),
    description: editorialDescription,
    eyebrow: copy.eyebrow,
    h1: copy.h1(name),
    intro: editorialIntro,
    trust: copy.trust,
    results: copy.results(name),
    servicesTitle: copy.servicesTitle,
    servicesIntro: copy.servicesIntro(name),
    services,
    howTitle: copy.howTitle,
    how: copy.how,
    questionsTitle: copy.questionsTitle,
    questions,
    related: copy.related,
    breadcrumbHome: copy.breadcrumbHome,
    breadcrumbSearch: copy.breadcrumbSearch,
    showMore: copy.showMore,
    showLess: copy.showLess,
  };
}
