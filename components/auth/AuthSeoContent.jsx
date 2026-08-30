import Link from 'next/link';
import {
  HiArrowNarrowLeft,
  HiBriefcase,
  HiCalendar,
  HiChartBar,
  HiChatAlt2,
  HiCheckCircle,
  HiClipboardList,
  HiDocumentText,
  HiLocationMarker,
  HiOutlineQuestionMarkCircle,
  HiOutlineUserGroup,
  HiSearch,
  HiShieldCheck,
  HiSparkles,
  HiStar,
} from 'react-icons/hi';

const icons = {
  analytics: HiChartBar,
  business: HiBriefcase,
  calendar: HiCalendar,
  chat: HiChatAlt2,
  documents: HiDocumentText,
  location: HiLocationMarker,
  profile: HiOutlineUserGroup,
  requests: HiClipboardList,
  search: HiSearch,
  security: HiShieldCheck,
  reviews: HiStar,
};

const copy = {
  he: {
    dir: 'rtl',
    shared: {
      breadcrumbHome: 'עמוד הבית',
      sectionBadge: 'כל מה שאפשר לעשות עם Hiro',
      customersLabel: 'ללקוחות',
      professionalsLabel: 'לבעלי מקצוע ולעסקים',
      featuresTitle: 'פחות מעברים בין מערכות. יותר סדר מהחיפוש ועד סיום העבודה.',
      featuresIntro: 'Hiro מרכזת את הדרך שבה לקוחות מוצאים שירות ואת הכלים שבעלי מקצוע צריכים כדי להציג את העסק, לתקשר ולעבוד מסודר.',
      customerTitle: 'בחירה טובה יותר מתחילה במידע ברור',
      customerBody: 'חפשו לפי תחום ואזור, הכירו את בעל המקצוע לפני הפנייה והמשיכו את כל התהליך מחשבון אחד.',
      customerPoints: [
        'פרופילים ציבוריים עם תחומי שירות, אזור פעילות, תיק עבודות ודירוגים',
        'בקשת עבודה מפורטת עם מועד, מיקום ותמונות או סרטונים',
        'שיחה ישירה, מעקב אחר סטטוס הבקשה וגישה נוחה להיסטוריה',
      ],
      professionalTitle: 'נוכחות מקצועית וכלי עבודה לעסק',
      professionalBody: 'בנו אמון עוד לפני השיחה הראשונה, קבלו פניות רלוונטיות ונהלו את הצד התפעולי בלי לפזר מידע בין אפליקציות.',
      professionalPoints: [
        'פרופיל עסקי, אזורי שירות, זמינות, פרויקטים וחוות דעת',
        'ניהול פניות, שיחות, לקוחות ומדדי פעילות במקום אחד',
        'הפקת מסמכים עסקיים, שמירה, הדפסה, שליחה ושיתוף',
      ],
      features: [
        {
          icon: 'search',
          title: 'חיפוש לפי הצורך האמיתי',
          body: 'בחרו מקצוע, השתמשו במיקום וסננו לפי אזור השירות כדי להתמקד בבעלי מקצוע רלוונטיים.',
        },
        {
          icon: 'reviews',
          title: 'משווים לפני שפונים',
          body: 'פרופילים, עבודות קודמות, דירוגים וחוות דעת נותנים הקשר חשוב לפני קבלת החלטה.',
        },
        {
          icon: 'requests',
          title: 'בקשת עבודה מסודרת',
          body: 'מתארים את העבודה, מצרפים מדיה, מיקום ומועד מועדף ועוקבים אחר בקשות שנשלחו או התקבלו.',
        },
        {
          icon: 'chat',
          title: 'תקשורת ישירה ועשירה',
          body: 'שולחים הודעות, תמונות, סרטונים, קבצים והודעות קוליות ושומרים את ההקשר של השיחה.',
        },
        {
          icon: 'profile',
          title: 'כרטיס עסקי שעובד בשבילכם',
          body: 'מציגים תיאור, תחומי התמחות, פרטי קשר, אזור פעילות, פרויקטים וביקורות בפרופיל ציבורי אחד.',
        },
        {
          icon: 'calendar',
          title: 'זמינות ולוח זמנים',
          body: 'לקוחות יכולים לראות זמינות, ובעלי מקצוע יכולים לעדכן את לוח הזמנים ולצמצם תיאומים מיותרים.',
        },
        {
          icon: 'analytics',
          title: 'תמונה ברורה של הפעילות',
          body: 'דשבורד מקצועי מרכז צפיות, עבודות, דירוגים, מדדי איכות והמלצות לצמיחה על בסיס הפעילות בחשבון.',
        },
        {
          icon: 'documents',
          title: 'לקוחות ומסמכים עסקיים',
          body: 'מנהלים לקוחות ומפיקים הצעות מחיר, הזמנות עבודה, קבלות, חשבוניות, מסמכי זיכוי וחשבון עסקה לפי סוג העסק וההרשאות.',
        },
      ],
      documentsEyebrow: 'מסמכים דיגיטליים לעסק',
      documentsTitle: 'מהצעת המחיר ועד המסמך הסופי — בלי לבנות כל מסמך מחדש',
      documentsIntro: 'בעלי מקצוע יכולים לבחור את סוג המסמך המתאים, להוסיף לקוח ופריטים, לחשב מע״מ והנחות, להציג תצוגה מקדימה ולשמור מסמך PDF מסודר. סוגי המסמכים הזמינים תלויים בסוג העסק, באימות ובהגדרות החשבון.',
      documentTypes: [
        ['הצעת מחיר', 'מציגים ללקוח את השירותים, הכמויות, המחירים, המע״מ, ההנחה וההערות לפני אישור העבודה. לאחר השמירה אפשר לשלוח קישור לחתימה.'],
        ['הזמנת עבודה', 'מתעדים בצורה ברורה את העבודה שסוכמה ואת פרטי הלקוח. גם הזמנת עבודה שמורה יכולה להישלח ללקוח לחתימה.'],
        ['קבלה', 'מתעדים תשלום שהתקבל, כולל אמצעי התשלום והפרטים הרלוונטיים כמו העברה, כרטיס, המחאה, Bit או PayBox.'],
        ['חשבונית מס', 'מפיקים מסמך חיוב הכולל פריטים, סכומים ומע״מ לעסקים המורשים להפיק חשבוניות מס. במקרים הרלוונטיים Hiro בודקת אם נדרש מספר הקצאה.'],
        ['חשבונית מס/קבלה', 'מרכזים במסמך אחד גם את פרטי העסקה והמע״מ וגם את פרטי התשלום שהתקבל, בהתאם לסוג העסק ולהגדרות.'],
        ['חשבון עסקה', 'מציגים ללקוח את פרטי העסקה והסכום לתשלום במסמך מסחרי נפרד, לפני הפקת מסמך המס המתאים לתשלום בפועל.'],
        ['תעודת זיכוי', 'מתעדים זיכוי או תיקון ושומרים את הקישור למספר ולמסמך המקור כאשר הפרטים קיימים במערכת.'],
      ],
      documentCapabilities: [
        ['מספור נפרד ורציף', 'במסמכים המשתמשים במספור, מגדירים מספר פתיחה לכל סוג וממשיכים את הרצף. האחריות לבחור מספר שממשיך את ספרי העסק נשארת בידי המשתמש.'],
        ['לקוחות ופריטים שמורים', 'בוחרים לקוח קיים או מוסיפים חדש, מוסיפים שורות שירות, כמויות, מחיר, מטבע, מצב מע״מ, הנחה והערות.'],
        ['תצוגה מקדימה וארכיון', 'בודקים את המסמך לפני שמירה, מפיקים PDF ושומרים את המסמכים באזור המסמכים לצפייה חוזרת.'],
        ['שליחה, שיתוף והדפסה', 'לאחר השמירה אפשר לפתוח את ה-PDF, לשלוח בדוא״ל, לשתף דרך המכשיר או להעתיק קישור כשאפשר, ולהדפיס.'],
      ],
      allocationTitle: 'מספרי הקצאה דרך „חשבוניות ישראל”',
      allocationBody: 'בחשבונית מס או בחשבונית מס/קבלה ללקוח עסקי, Hiro בודקת את הסכום לפני מע״מ ואת מספר העוסק של הלקוח. כאשר התנאים והסף המוגדר מתקיימים, המערכת מבקשת לחבר את חשבון רשות המסים, שולחת בקשה ומוסיפה למסמך את מספר ההקצאה שהוחזר.',
      allocationSteps: [
        'מאמתים בחשבון Hiro מספר עוסק בן 9 ספרות וסוג עסק שמורשה להפיק את המסמך.',
        'מחברים את רשות המסים בהרשאה מאובטחת; פרטי העסק בחשבונית חייבים להתאים לעסק המאומת.',
        'מזינים מספר עוסק של הלקוח. הבדיקה מתבצעת רק במסמכי חשבונית מס רלוונטיים ומעל הסף המוגדר.',
        'לאחר אישור רשות המסים, מספר ההקצאה נשמר בנפרד ממספר החשבונית ומופיע במסמך הסופי.',
      ],
      allocationNote: 'נכון לאוגוסט 2026, רשות המסים מציינת שסף החובה הוא בעסקאות מעל 5,000 ₪ לפני מע״מ, בכפוף לתנאים שבדין. הספים והכללים עשויים להשתנות; המידע הרשמי והדין גוברים.',
      allocationLinkLabel: 'למידע הרשמי על מספרי הקצאה באתר רשות המסים',
      allocationLinkHref: 'https://www.gov.il/he/service/request-assignment-number-for-tax-invoice',
      signingTitle: 'חתימה על הצעת מחיר או הזמנת עבודה',
      signingBody: 'אחרי ששומרים הצעת מחיר או הזמנת עבודה, אפשר ליצור קישור חתימה ייעודי ולשלוח אותו ללקוח. כך הלקוח מקבל מסמך ברור לחתימה בלי להדפיס, לסרוק ולהחזיר קובץ ידנית.',
      signingSteps: [
        'יוצרים את המסמך, בודקים את התצוגה המקדימה ושומרים אותו.',
        'לוחצים על „שליחה לחתימה”; Hiro יוצרת קישור ייעודי למסמך השמור.',
        'משתפים מהטלפון, מעתיקים את הקישור או פותחים הודעת דוא״ל מוכנה.',
        'אם כבר נוצר קישור לאותו מסמך, Hiro משתמשת בו שוב במקום ליצור קישור מיותר.',
      ],
      signingNote: 'בגרסה הנוכחית של Hiro, קישור חתימה זמין להצעות מחיר ולהזמנות עבודה. חשבוניות, קבלות ומסמכי זיכוי נשלחים או משותפים כמסמכים שמורים, ללא כפתור החתימה הזה.',
      documentsDisclaimer: 'Hiro מספקת כלי הפקה וניהול ואינה מחליפה ייעוץ של רואה חשבון, יועץ מס או עורך דין. בעל העסק אחראי לבחור את סוג המסמך, המספור והדיווח המתאימים לעסקה.',
      workflowTitle: 'איך Hiro עובדת?',
      workflow: [
        ['מגדירים מי אתם ומה אתם צריכים', 'לקוחות בוחרים תחום ומיקום; בעלי מקצוע מגדירים מקצועות, אזור שירות ופרטי עסק.'],
        ['מקבלים תמונה מלאה לפני שמתקדמים', 'עוברים על פרופילים, ניסיון, עבודות, דירוגים, פרטי קשר וזמינות.'],
        ['מרכזים את התקשורת והעבודה', 'פותחים בקשה, משתפים פרטים ומדיה, משוחחים ועוקבים אחר הסטטוס מתוך החשבון.'],
        ['מסיימים בצורה מסודרת', 'בעלי מקצוע יכולים לנהל את הלקוח, להפיק מסמך מתאים, לשמור אותו ולשלוח או לשתף אותו.'],
      ],
      priceEyebrow: 'מחיר ברור לפני שמתחילים',
      priceTitle: 'כמה עולה להצטרף ל-Hiro?',
      customerPrice: 'חשבון לקוח',
      customerPriceValue: 'חינם',
      customerPriceBody: 'פתיחת חשבון לקוח והשימוש בכלי החיפוש והפנייה אינם דורשים תשלום בהרשמה.',
      proPrice: 'Hiro Pro לבעלי מקצוע',
      proPriceValue: '120.90 ₪',
      proPriceBody: 'מחיר המנוי כולל מע״מ. תקופת החיוב והתנאים הסופיים מוצגים לפני אישור התשלום.',
      priceNote: 'Hiro אינה קובעת את מחיר העבודה של בעל המקצוע. מומלץ לסכם מראש את ההיקף, המחיר, החומרים, הזמנים ותנאי התשלום.',
      questionsTitle: 'שאלות אמיתיות לפני שמצטרפים',
      questionsIntro: 'תשובות קצרות ושקופות על החשבון, השימוש וההתאמה של Hiro.',
    },
    signup: {
      hero: {
        badge: 'מצטרפים ל-Hiro',
        title: 'חשבון אחד שמחבר בין שירות טוב לניהול עסק חכם',
        body: 'לקוחות מוצאים בעלי מקצוע ומתנהלים בביטחון; בעלי מקצוע בונים נוכחות, מקבלים פניות ומנהלים את העבודה מהטלפון או מהמחשב.',
        cards: [
          ['profile', 'פרופיל מקצועי', 'תחומי שירות, אזור פעילות, עבודות, זמינות וחוות דעת.'],
          ['search', 'חשבון לקוח', 'חיפוש, השוואה, בקשות ושיחות במקום אחד.'],
        ],
      },
      form: {
        intro: 'ממלאים כמה פרטים, בוחרים סוג חשבון ומאמתים את מספר הטלפון.',
        customerRoleHelp: 'חיפוש ופנייה לבעלי מקצוע',
        professionalRoleHelp: 'הצגת שירותים וניהול העסק',
        locationPlaceholder: 'לחצו לבחירת העיר על המפה',
        locationHelp: 'העיר והנקודה שתאשרו ישמשו להתאמת תוצאות ושירותים באזורכם.',
        termsPrefix: 'אני מאשר/ת את',
        termsLabel: 'תנאי השימוש',
        termsJoin: 'ואת',
        privacyLabel: 'מדיניות הפרטיות',
      },
      breadcrumb: 'הרשמה',
      heading: 'למה כדאי לפתוח חשבון Hiro?',
      intro: 'כי מציאת בעל מקצוע וניהול עבודה לא צריכים להרגיש כמו שרשרת של טלפונים, הודעות וקבצים אבודים. Hiro בונה מסלול ברור לשני הצדדים.',
      faq: [
        ['מה זה Hiro?', 'Hiro היא פלטפורמה שמחברת בין לקוחות שמחפשים שירות לבין בעלי מקצוע ועסקים. היא כוללת חיפוש לפי תחום ומיקום, פרופילים, בקשות עבודה, הודעות וכלים לניהול הפעילות העסקית.'],
        ['למי Hiro מתאימה?', 'ללקוחות פרטיים שמחפשים בעל מקצוע באזור שלהם, ולבעלי מקצוע שרוצים להציג את העבודה שלהם, לקבל פניות ולרכז לקוחות, זמינות ומסמכים במקום אחד.'],
        ['כמה עולה להשתמש ב-Hiro?', 'פתיחת חשבון לקוח היא בחינם. לבעלי מקצוע מוצע חשבון Hiro Pro במחיר 120.90 ₪ למנוי, כולל מע״מ. תקופת החיוב והתנאים הסופיים מוצגים לפני אישור התשלום.'],
        ['מה מקבלים בחשבון לקוח?', 'אפשר לחפש בעלי מקצוע, לעיין בפרופילים ובעבודות, לקרוא דירוגים וחוות דעת, לשלוח בקשות עם פרטים ומדיה, לנהל שיחות ולעקוב אחר הבקשות שנשלחו.'],
        ['מה מקבלים בעלי מקצוע ב-Hiro Pro?', 'פרופיל ציבורי, תיק עבודות, אזורי שירות ולוח זמינות, פניות ושיחות, דשבורד פעילות, ניהול לקוחות וכלים להפקה, שמירה ושיתוף של מסמכים עסקיים.'],
        ['אילו מסמכים עסקיים אפשר להפיק?', 'המערכת כוללת הצעות מחיר, הזמנות עבודה, קבלות, חשבוניות מס, חשבוניות מס-קבלה, חשבון עסקה ומסמכי זיכוי. האפשרויות בפועל תלויות בסוג העסק, בהגדרות החשבון ובאימותים הנדרשים.'],
        ['מהו מספר הקצאה?', 'זהו מספר ייחודי בן 9 ספרות שרשות המסים מחזירה עבור חשבונית מס מסוימת במסגרת מודל „חשבוניות ישראל”. הוא מופיע בנוסף למספר החשבונית הפנימי של העסק ואינו מחליף אותו.'],
        ['מתי Hiro מבקשת מספר הקצאה?', 'רק עבור חשבונית מס או חשבונית מס/קבלה רלוונטית, כאשר הוזן מספר עוסק ללקוח והסכום לפני מע״מ גבוה מהסף המוגדר במערכת. נכון לאוגוסט 2026 הסף הרשמי הוא מעל 5,000 ₪ לפני מע״מ, בכפוף לשאר התנאים.'],
        ['מה צריך כדי לקבל מספר הקצאה דרך Hiro?', 'נדרש חשבון עסק מאומת עם מספר עוסק בן 9 ספרות וסוג עסק מתאים, מספר עוסק של הלקוח וחיבור מורשה לחשבון רשות המסים. פרטי העסק במסמך חייבים להתאים לפרטים המאומתים.'],
        ['איך שולחים הצעת מחיר לחתימה?', 'יוצרים הצעת מחיר או הזמנת עבודה, בודקים ושומרים אותה, ואז בוחרים שליחה לחתימה. Hiro יוצרת קישור ייעודי שאפשר לשתף מהטלפון, להעתיק או לשלוח בדוא״ל.'],
        ['האם אפשר לשלוח כל מסמך לחתימה?', 'לא. בגרסה הנוכחית קישור החתימה מיועד להצעות מחיר ולהזמנות עבודה. חשבוניות, קבלות ותעודות זיכוי ניתנות לשמירה, שליחה, שיתוף והדפסה ללא פעולת החתימה הזו.'],
        ['איך עובד מספור המסמכים?', 'לכל סוג מסמך ממוספר נשמר רצף משלו. בהפעלה הראשונה המשתמש מגדיר מספר פתיחה שחייב להמשיך את הרצף האמיתי של העסק. הצעות מחיר והזמנות עבודה אינן משתמשות במונה הזה.'],
        ['האם Hiro מבטיחה שבעל מקצוע מסוים מתאים לי?', 'לא. Hiro מספקת מידע וכלים להשוואה ולתקשורת, אך הבחירה והסיכום המסחרי הם בין הלקוח לבעל המקצוע. מומלץ לבדוק ניסיון רלוונטי, חוות דעת, זמינות, מחיר ותנאים לפני הזמנה.'],
        ['למה נדרש אימות טלפון?', 'אימות טלפון עוזר להגן על הגישה לחשבון ולצמצם התחזות. בהרשמה ובכניסה נשלח קוד SMS למספר שהוזן.'],
        ['אפשר להשתמש ב-Hiro גם בנייד וגם במחשב?', 'כן. אפשר להשתמש באתר ממחשב או מדפדפן בנייד, וקיימות גם אפליקציות Hiro ל-iPhone ולאנדרואיד.'],
        ['איך מתחילים?', 'ממלאים פרטים בסיסיים, בוחרים סוג חשבון, מאשרים את המדיניות ומאמתים את מספר הטלפון. בעלי מקצוע ממשיכים דרך האפליקציה להגדרת החשבון המקצועי.'],
      ],
      ctaTitle: 'מוכנים להתחיל בצורה מסודרת יותר?',
      ctaBody: 'פתחו חשבון לקוח בחינם, או הצטרפו כבעלי מקצוע ובנו נוכחות מקצועית שממשיכה גם אחרי השיחה הראשונה.',
      ctaLabel: 'פתיחת חשבון',
      ctaHref: '/auth/signup',
      secondaryLabel: 'כבר רשומים? כניסה לחשבון',
      secondaryHref: '/auth/signin',
    },
    signin: {
      hero: {
        badge: 'החשבון שלכם מחכה',
        title: 'חוזרים ל-Hiro וממשיכים בדיוק מהמקום שבו עצרתם',
        body: 'התחברו כדי לראות בקשות ושיחות, לנהל את הפרופיל והלקוחות ולהשתמש בכלי העבודה ששומרים את כל התהליך במקום אחד.',
        cards: [
          ['security', 'כניסה מאובטחת', 'סיסמה ואימות SMS מסייעים להגן על הגישה לחשבון.'],
          ['requests', 'רצף עבודה', 'הבקשות, השיחות והפרטים החשובים נשארים זמינים בחשבון.'],
          ['profile', 'גישה מכל מכשיר', 'ממשיכים מהדפדפן, מהטלפון או מאפליקציית Hiro.'],
        ],
      },
      form: {
        phoneStep: '1. טלפון',
        codeStep: '2. קוד',
        credentialsHelp: 'הזינו מספר טלפון וסיסמה כדי להמשיך.',
        codeHelp: 'הזינו את הקוד ששלחנו למספר הטלפון שלכם.',
        forgotPassword: 'שכחת סיסמה?',
        getApp: 'Hiro גם באפליקציה',
        resetTitle: 'איפוס סיסמה',
        resetBody: 'הזינו את כתובת הדוא״ל המקושרת למספר הטלפון לפני שנשלח קישור לאיפוס.',
        emailOnAccount: 'הדוא״ל בחשבון:',
        closeReset: 'סגירת חלון איפוס הסיסמה',
        sendReset: 'שליחת קישור',
      },
      breadcrumb: 'כניסה לחשבון',
      heading: 'למה כדאי להתחבר ולא להישאר אורחים?',
      intro: 'גלישה כאורח טובה להיכרות ראשונית. חשבון Hiro הופך את החיפוש והעבודה לתהליך שאפשר לשמור, לעקוב אחריו ולהמשיך מכל מכשיר.',
      faq: [
        ['מה זה Hiro?', 'Hiro היא פלטפורמה למציאת בעלי מקצוע ולניהול הקשר בין לקוחות לעסקים: חיפוש, פרופילים, בקשות עבודה, הודעות, זמינות וכלים עסקיים לבעלי מקצוע.'],
        ['מה נשמר בחשבון שלי?', 'בהתאם לסוג החשבון נשמרים פרטי הפרופיל, מיקומים, בקשות שנשלחו או התקבלו, שיחות, התראות והפעילות העסקית הרלוונטית.'],
        ['אפשר להמשיך כאורח?', 'כן, אפשר לעיין בחלקים הציבוריים של Hiro כאורח. פעולות אישיות כמו שליחת בקשה, ניהול שיחה, כתיבת חוות דעת או גישה לכלי העסק דורשות חשבון פעיל.'],
        ['איך נכנסים לחשבון?', 'מזינים את מספר הטלפון והסיסמה, ולאחר בדיקתם מאשרים קוד בן שש ספרות שנשלח ב-SMS.'],
        ['שכחתי את הסיסמה — מה עושים?', 'הזינו תחילה את מספר הטלפון ולחצו על „שכחת סיסמה?”. לאחר התאמת כתובת הדוא״ל המקושרת לחשבון תוכלו לבקש קישור לאיפוס.'],
        ['למה יש גם סיסמה וגם קוד SMS?', 'שתי הבדיקות מוסיפות שכבת הגנה לגישה לחשבון ומוודאות שהכניסה מתבצעת גם עם פרטי החשבון וגם עם גישה למספר הטלפון.'],
        ['כמה עולה Hiro?', 'חשבון לקוח נפתח בחינם. לבעלי מקצוע קיים חשבון Hiro Pro במחיר 120.90 ₪ למנוי, כולל מע״מ. תקופת החיוב והתנאים הסופיים מופיעים לפני אישור התשלום.'],
        ['אני בעל מקצוע — מה זמין לי אחרי הכניסה?', 'אפשר לנהל פרופיל ותיק עבודות, זמינות, פניות ושיחות, לקוחות, מדדי פעילות ומסמכים עסקיים בהתאם להרשאות ולהגדרות החשבון.'],
        ['איפה נמצאים המסמכים ששמרתי?', 'מסמכים שנשמרו זמינים באזור המסמכים השמורים. אפשר לפתוח שוב את קובץ ה-PDF, לחפש ולסנן לפי סוג מסמך, ולשלוח, לשתף או להדפיס לפי האפשרויות הזמינות.'],
        ['מה ההבדל בין מספר חשבונית למספר הקצאה?', 'מספר החשבונית הוא המספר הרציף של העסק. מספר הקצאה הוא מספר נפרד בן 9 ספרות שמתקבל מרשות המסים עבור חשבונית מס מסוימת כאשר התנאים חלים. המסמך יכול להציג את שניהם.'],
        ['מתי תופיע בקשה לחבר את רשות המסים?', 'כאשר שומרים חשבונית מס או חשבונית מס/קבלה עם מספר עוסק ללקוח והסכום לפני מע״מ עובר את הסף המוגדר. אם החשבון אינו מחובר, Hiro מציגה הסבר וקישור לתהליך ההרשאה.'],
        ['אפשר לחתום על הצעת מחיר מרחוק?', 'כן. לאחר שהצעת המחיר או הזמנת העבודה נשמרת, אפשר ליצור קישור חתימה ולשתף אותו עם הלקוח מהטלפון, בהעתקה או בדוא״ל.'],
        ['למה חשוב להגדיר נכון את המספר הראשון?', 'המספור הוא חלק מרישומי העסק. Hiro ממשיכה את הרצף מהמספר שהוגדר, ולכן בעל העסק אחראי לוודא שהוא מתאים לרצף הקיים לפני יצירת המסמך הראשון מכל סוג.'],
        ['האם Hiro קובעת את המחיר או אחראית על העבודה?', 'לא. המחיר, היקף העבודה והתנאים נקבעים ישירות בין הלקוח לבעל המקצוע. Hiro מספקת את סביבת החיפוש, המידע, התקשורת והניהול.'],
        ['איפה אפשר לקבל עזרה?', 'אם אין לכם גישה לדוא״ל המקושר או שהכניסה עדיין לא מצליחה, אפשר לעבור לעמוד יצירת הקשר ולשלוח בקשת תמיכה.'],
      ],
      ctaTitle: 'עדיין אין לכם חשבון Hiro?',
      ctaBody: 'הרשמה קצרה פותחת גישה לבקשות, שיחות, מיקומים שמורים וכלי עבודה שמתאימים ללקוחות ולבעלי מקצוע.',
      ctaLabel: 'הרשמה ל-Hiro',
      ctaHref: '/auth/signup',
      secondaryLabel: 'רוצים להכיר קודם? חיפוש בעלי מקצוע',
      secondaryHref: '/search',
    },
  },
  en: {
    dir: 'ltr',
    shared: {
      breadcrumbHome: 'Home',
      sectionBadge: 'Everything you can do with Hiro',
      customersLabel: 'For customers',
      professionalsLabel: 'For professionals and businesses',
      featuresTitle: 'Fewer disconnected tools. A clearer journey from search to completed work.',
      featuresIntro: 'Hiro brings together the way customers find services and the tools professionals need to present, communicate, and run their work.',
      customerTitle: 'Better decisions start with clearer information',
      customerBody: 'Search by profession and location, understand who you are contacting, and manage the journey from one account.',
      customerPoints: [
        'Public profiles with services, coverage area, projects, ratings, and reviews',
        'Detailed work requests with preferred time, location, photos, or video',
        'Direct chat, request status, and convenient access to your history',
      ],
      professionalTitle: 'A professional presence with practical business tools',
      professionalBody: 'Build confidence before the first call, receive relevant enquiries, and keep operations from being scattered across apps.',
      professionalPoints: [
        'Business profile, service areas, availability, projects, and reviews',
        'Requests, conversations, customers, and activity insights in one place',
        'Create, save, print, send, and share business documents',
      ],
      features: [
        { icon: 'search', title: 'Search around the real need', body: 'Choose a profession, use location, and filter by service coverage to focus on relevant professionals.' },
        { icon: 'reviews', title: 'Compare before contacting', body: 'Profiles, completed work, ratings, and reviews add useful context before you decide.' },
        { icon: 'requests', title: 'Structured work requests', body: 'Describe the work, attach media, location, and preferred time, then follow sent or received requests.' },
        { icon: 'chat', title: 'Direct, flexible communication', body: 'Exchange messages, images, video, files, and voice notes while keeping the conversation context.' },
        { icon: 'profile', title: 'A profile that works for the business', body: 'Present expertise, contact details, coverage, projects, availability, and reviews in one public profile.' },
        { icon: 'calendar', title: 'Availability and scheduling', body: 'Customers can view availability while professionals keep their schedule current and reduce coordination.' },
        { icon: 'analytics', title: 'A clear activity overview', body: 'The professional dashboard brings together views, jobs, ratings, quality indicators, and growth guidance.' },
        { icon: 'documents', title: 'Customers and business documents', body: 'Manage customers and create quotes, work orders, receipts, invoices, credit notes, and transaction accounts based on setup and permissions.' },
      ],
      documentsEyebrow: 'Digital business documents',
      documentsTitle: 'From quote to final document—without rebuilding every record',
      documentsIntro: 'Professionals can choose a document type, add the customer and line items, calculate VAT and discounts, preview the result, and save an organized PDF. Available types depend on business status, verification, and account settings.',
      documentTypes: [
        ['Quote', 'Present services, quantities, prices, VAT, discounts, and notes before the work is approved. Once saved, the quote can be sent through a signing link.'],
        ['Work order', 'Record the agreed work and customer details clearly. A saved work order can also be sent to the customer for signature.'],
        ['Receipt', 'Record a payment received, including the payment method and relevant transfer, card, cheque, Bit, or PayBox details.'],
        ['Tax invoice', 'Create a charge document with line items, amounts, and VAT for businesses permitted to issue tax invoices. Hiro checks for an allocation number when relevant.'],
        ['Tax invoice/receipt', 'Combine transaction and VAT information with the payment received, according to business type and account configuration.'],
        ['Transaction account', 'Present transaction and payment-due details in a separate commercial document before issuing the appropriate tax document for payment.'],
        ['Credit note', 'Record a credit or correction and retain a reference to the original document and number when those details are available.'],
      ],
      documentCapabilities: [
        ['Separate sequential numbering', 'For numbered document types, set a starting number and continue the sequence. The user remains responsible for choosing a number that continues the business records.'],
        ['Saved customers and line items', 'Choose or add a customer, then enter services, quantities, price, currency, VAT mode, discount, and notes.'],
        ['Preview and archive', 'Review the document before saving, generate a PDF, and keep saved documents available for later viewing.'],
        ['Send, share, and print', 'After saving, open the PDF, prepare an email, use device sharing or copy a link when available, and print.'],
      ],
      allocationTitle: 'Allocation numbers through “Israel Invoices”',
      allocationBody: 'For a tax invoice or tax invoice/receipt issued to a business customer, Hiro checks the amount before VAT and the customer VAT number. When the configured conditions and threshold apply, Hiro asks for a Tax Authority connection, submits the request, and adds the returned allocation number to the document.',
      allocationSteps: [
        'Verify a nine-digit business VAT ID and an eligible business type in Hiro.',
        'Connect the Tax Authority through secure authorization; invoice business details must match the verified business.',
        'Enter the customer VAT number. The check runs only for relevant tax-invoice documents above the configured threshold.',
        'After Tax Authority approval, the allocation number is stored separately from the invoice number and shown on the final document.',
      ],
      allocationNote: 'As of August 2026, the Tax Authority states that the mandatory threshold is above ₪5,000 before VAT, subject to the statutory conditions. Thresholds and rules can change; official guidance and applicable law prevail.',
      allocationLinkLabel: 'Official Tax Authority guidance on allocation numbers',
      allocationLinkHref: 'https://www.gov.il/en/service/request-assignment-number-for-tax-invoice',
      signingTitle: 'Signing a quote or work order',
      signingBody: 'After saving a quote or work order, create a dedicated signing link and send it to the customer. The customer receives a clear document to sign without manually printing, scanning, and returning a file.',
      signingSteps: [
        'Create the document, review its preview, and save it.',
        'Choose “Send for signature”; Hiro creates a dedicated URL for the saved document.',
        'Share it from a mobile device, copy the URL, or open a prepared email.',
        'If a URL already exists for the document, Hiro reuses it rather than creating an unnecessary duplicate.',
      ],
      signingNote: 'In the current Hiro version, signing links are available for quotes and work orders. Invoices, receipts, and credit notes can be sent or shared as saved documents but do not show this signing action.',
      documentsDisclaimer: 'Hiro provides document creation and management tools; it does not replace advice from an accountant, tax adviser, or lawyer. The business remains responsible for selecting the correct document, numbering, and reporting treatment.',
      workflowTitle: 'How does Hiro work?',
      workflow: [
        ['Define who you are and what you need', 'Customers choose a field and location; professionals define expertise, service area, and business details.'],
        ['Get context before moving forward', 'Review profiles, experience, projects, ratings, contact details, and availability.'],
        ['Keep communication and work together', 'Create a request, share details and media, chat, and follow the status from your account.'],
        ['Finish with an organized record', 'Professionals can manage the customer, create the right document, save it, and send or share it.'],
      ],
      priceEyebrow: 'Clear pricing before you begin',
      priceTitle: 'How much does it cost to join Hiro?',
      customerPrice: 'Customer account',
      customerPriceValue: 'Free',
      customerPriceBody: 'Opening a customer account and using search and enquiry tools requires no signup payment.',
      proPrice: 'Hiro Pro for professionals',
      proPriceValue: '₪120.90',
      proPriceBody: 'The subscription price includes VAT. The billing period and final terms appear before payment approval.',
      priceNote: 'Hiro does not set a professional’s job price. Agree on scope, price, materials, timing, and payment terms before work begins.',
      questionsTitle: 'Real questions before you join',
      questionsIntro: 'Short, transparent answers about accounts, features, and fit.',
    },
    signup: {
      hero: {
        badge: 'Join Hiro',
        title: 'One account connecting better service with smarter business management',
        body: 'Customers find professionals and stay informed; professionals build their presence, receive enquiries, and manage work from mobile or desktop.',
        cards: [
          ['profile', 'Professional profile', 'Services, coverage, work, availability, and customer feedback.'],
          ['search', 'Customer account', 'Search, compare, request, and communicate in one place.'],
        ],
      },
      form: {
        intro: 'Enter a few details, choose an account type, and verify your phone number.',
        customerRoleHelp: 'Find and contact professionals',
        professionalRoleHelp: 'Present services and manage the business',
        locationPlaceholder: 'Choose your city on the map',
        locationHelp: 'The confirmed city and map point help tailor nearby results and services.',
        termsPrefix: 'I agree to the',
        termsLabel: 'Terms of Service',
        termsJoin: 'and',
        privacyLabel: 'Privacy Policy',
      },
      breadcrumb: 'Sign up',
      heading: 'Why create a Hiro account?',
      intro: 'Finding a professional and managing a job should not feel like a chain of calls, scattered messages, and lost files. Hiro creates a clear path for both sides.',
      faq: [
        ['What is Hiro?', 'Hiro is a platform connecting customers who need services with professionals and businesses. It combines profession and location search, profiles, work requests, messaging, and business-management tools.'],
        ['Who is Hiro for?', 'It is for people looking for a professional nearby and for professionals who want to present their work, receive enquiries, and manage customers, availability, and documents in one place.'],
        ['How much does Hiro cost?', 'Creating a customer account is free. Professionals can activate Hiro Pro for ₪120.90 including VAT. The billing period and final terms are presented before payment approval.'],
        ['What does a customer account include?', 'Customers can search, review profiles and projects, read ratings and reviews, submit detailed requests with media, chat, and track sent requests.'],
        ['What does Hiro Pro include?', 'A public profile, portfolio, service areas and availability, requests and conversations, an activity dashboard, customer management, and tools to create, save, and share business documents.'],
        ['Which business documents are available?', 'The system includes quotes, work orders, receipts, tax invoices, invoice-receipts, transaction accounts, and credit notes. Availability depends on business type, account settings, and required verification.'],
        ['What is an allocation number?', 'It is a unique nine-digit number returned by the Israel Tax Authority for a specific tax invoice under the “Israel Invoices” model. It appears in addition to the business invoice number and does not replace it.'],
        ['When does Hiro request an allocation number?', 'Only for a relevant tax invoice or tax invoice/receipt when a customer VAT number is present and the amount before VAT exceeds the configured threshold. As of August 2026, the official threshold is above ₪5,000 before VAT, subject to the other conditions.'],
        ['What is required for allocation through Hiro?', 'You need a verified business account with a nine-digit VAT ID and eligible business type, the customer VAT number, and an authorized Tax Authority connection. Document business details must match the verified identity.'],
        ['How do I send a quote for signature?', 'Create and review a quote or work order, save it, then choose the signing action. Hiro creates a dedicated URL that can be shared from mobile, copied, or placed in a prepared email.'],
        ['Can every document be signed?', 'No. In the current version, signing links are for quotes and work orders. Invoices, receipts, and credit notes can be saved, sent, shared, and printed without this signing action.'],
        ['How does document numbering work?', 'Each numbered document type keeps its own sequence. On first use, the user sets a starting number that must continue the real business records. Quotes and work orders do not use this counter.'],
        ['Does Hiro guarantee that a professional is right for me?', 'No. Hiro provides information, comparison, and communication tools, while the choice and commercial agreement remain between customer and professional. Check relevant experience, reviews, availability, price, and terms.'],
        ['Why is phone verification required?', 'Phone verification helps protect account access and reduce impersonation. A text-message code is sent during registration and sign-in.'],
        ['Can I use Hiro on mobile and desktop?', 'Yes. Hiro works in desktop and mobile browsers, and apps are available for iPhone and Android.'],
        ['How do I begin?', 'Enter your basic details, choose an account type, accept the policies, and verify your phone. Professionals continue in the app to configure their professional account.'],
      ],
      ctaTitle: 'Ready for a more organized way to get things done?',
      ctaBody: 'Create a free customer account, or join as a professional and build a presence that keeps working after the first conversation.',
      ctaLabel: 'Create an account',
      ctaHref: '/auth/signup',
      secondaryLabel: 'Already registered? Sign in',
      secondaryHref: '/auth/signin',
    },
    signin: {
      hero: {
        badge: 'Your account is ready',
        title: 'Return to Hiro and continue exactly where you stopped',
        body: 'Sign in to see requests and conversations, manage your profile and customers, and use the tools that keep the full journey in one place.',
        cards: [
          ['security', 'Protected access', 'Password and SMS verification help protect your account.'],
          ['requests', 'Continuity', 'Requests, conversations, and important details remain available.'],
          ['profile', 'Access on every device', 'Continue from your browser, phone, or the Hiro app.'],
        ],
      },
      form: {
        phoneStep: '1. Phone',
        codeStep: '2. Code',
        credentialsHelp: 'Enter your phone number and password to continue.',
        codeHelp: 'Enter the code sent to your phone number.',
        forgotPassword: 'Forgot password?',
        getApp: 'Get the Hiro app',
        resetTitle: 'Reset password',
        resetBody: 'Enter the email connected to this phone number before we send a reset link.',
        emailOnAccount: 'Email on this account:',
        closeReset: 'Close password reset',
        sendReset: 'Send reset link',
      },
      breadcrumb: 'Sign in',
      heading: 'Why sign in instead of staying a guest?',
      intro: 'Guest browsing is useful for exploring. A Hiro account turns discovery and work into a journey you can save, follow, and continue on another device.',
      faq: [
        ['What is Hiro?', 'Hiro is a platform for finding professionals and managing customer-business communication, including search, profiles, work requests, messaging, availability, and business tools.'],
        ['What is saved in my account?', 'Depending on account type, Hiro keeps profile details, locations, sent or received requests, conversations, notifications, and relevant business activity.'],
        ['Can I continue as a guest?', 'Yes, public areas can be browsed as a guest. Personal actions such as sending requests, managing chats, writing reviews, or accessing business tools require an active account.'],
        ['How do I sign in?', 'Enter your phone number and password, then confirm the six-digit code sent by SMS.'],
        ['What if I forgot my password?', 'Enter your phone number first and select “Forgot password?”. After matching the email connected to your account, you can request a reset link.'],
        ['Why do I need both a password and an SMS code?', 'The two checks add protection by requiring both account credentials and access to the registered phone number.'],
        ['How much does Hiro cost?', 'Customer accounts are free to create. Hiro Pro is available for professionals for ₪120.90 including VAT. The billing period and final terms are displayed before approval.'],
        ['What can a professional access after sign-in?', 'Professionals can manage their profile and portfolio, availability, enquiries, conversations, customers, activity insights, and business documents according to account settings.'],
        ['Where are my saved documents?', 'Saved documents are available in the document archive. You can reopen the PDF, search and filter by document type, and use the available send, share, or print actions.'],
        ['What is the difference between an invoice number and an allocation number?', 'The invoice number belongs to the business’s sequential records. An allocation number is a separate nine-digit Tax Authority number for a specific tax invoice when the conditions apply. A document can show both.'],
        ['When will Hiro ask me to connect the Tax Authority?', 'When saving a tax invoice or tax invoice/receipt with a customer VAT number and an amount before VAT above the configured threshold. If the account is not connected, Hiro explains the requirement and opens the authorization flow.'],
        ['Can a quote be signed remotely?', 'Yes. Once the quote or work order is saved, you can create a signing link and share it with the customer from mobile, by copying it, or through email.'],
        ['Why must the first document number be correct?', 'Document numbering is part of the business records. Hiro continues from the number you provide, so the business is responsible for confirming that it matches the existing sequence before creating the first document of each type.'],
        ['Does Hiro set the price or take responsibility for the work?', 'No. The scope, price, and terms are agreed directly between the customer and professional. Hiro provides the search, information, communication, and management environment.'],
        ['Where can I get help?', 'If you cannot access the connected email or still cannot sign in, visit the contact page and send a support request.'],
      ],
      ctaTitle: 'Still do not have a Hiro account?',
      ctaBody: 'A short registration unlocks requests, conversations, saved locations, and tools designed for both customers and professionals.',
      ctaLabel: 'Join Hiro',
      ctaHref: '/auth/signup',
      secondaryLabel: 'Explore first: find professionals',
      secondaryHref: '/search',
    },
  },
};

function getLanguage(locale) {
  return locale === 'he' ? 'he' : 'en';
}

export function getAuthMarketingCopy(locale = 'he', variant = 'signup') {
  const language = getLanguage(locale);
  const languageCopy = copy[language];
  return {
    dir: languageCopy.dir,
    ...languageCopy.shared,
    ...languageCopy[variant],
  };
}

export function getAuthFaqStructuredData(variant = 'signup') {
  const pageCopy = getAuthMarketingCopy('he', variant);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pageCopy.faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

function FeatureCard({ feature }) {
  const Icon = icons[feature.icon] || HiSparkles;
  return (
    <article className="group rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-card">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary transition group-hover:bg-primary group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-950">{feature.title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{feature.body}</p>
    </article>
  );
}

function AudienceCard({ eyebrow, title, body, points, professional = false }) {
  return (
    <article className={`overflow-hidden rounded-[30px] border p-6 sm:p-7 ${professional ? 'border-primary/20 bg-primary-50/70' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
      <ul className="mt-5 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-700">
            <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function AuthSeoContent({ locale = 'he', variant = 'signup' }) {
  const content = getAuthMarketingCopy(locale, variant);

  return (
    <main className="relative overflow-hidden bg-white px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16" dir={content.dir}>
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky-50 to-white" />
      <div className="absolute -right-24 top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
          <Link href="/" className="transition hover:text-primary">{content.breadcrumbHome}</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-800">{content.breadcrumb}</span>
        </nav>

        <header className="mt-8 max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <HiSparkles className="h-4 w-4" />
            {content.sectionBadge}
          </p>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {content.heading}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{content.intro}</p>
        </header>

        <section aria-label={content.featuresTitle} className="mt-10 grid gap-5 lg:grid-cols-2">
          <AudienceCard
            eyebrow={content.customersLabel}
            title={content.customerTitle}
            body={content.customerBody}
            points={content.customerPoints}
          />
          <AudienceCard
            eyebrow={content.professionalsLabel}
            title={content.professionalTitle}
            body={content.professionalBody}
            points={content.professionalPoints}
            professional
          />
        </section>

        <section aria-labelledby={`${variant}-features-title`} className="mt-16">
          <div className="max-w-3xl">
            <h2 id={`${variant}-features-title`} className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {content.featuresTitle}
            </h2>
            <p className="mt-3 text-base leading-8 text-slate-600">{content.featuresIntro}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.features.map((feature) => <FeatureCard key={feature.title} feature={feature} />)}
          </div>
        </section>

        <section aria-labelledby={`${variant}-documents-title`} className="mt-16">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.documentsEyebrow}</p>
            <h2 id={`${variant}-documents-title`} className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {content.documentsTitle}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">{content.documentsIntro}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.documentTypes.map(([title, body], index) => (
              <article
                key={title}
                className={`rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm ${index === content.documentTypes.length - 1 ? 'lg:col-span-2' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-primary">
                    <HiDocumentText className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.documentCapabilities.map(([title, body], index) => {
              const CapabilityIcon = [HiClipboardList, HiOutlineUserGroup, HiDocumentText, HiChatAlt2][index];
              return (
                <article key={title} className="rounded-[24px] bg-slate-50 p-5">
                  <CapabilityIcon className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 text-sm font-extrabold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[32px] border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-glow-sm">
                <HiShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950">{content.allocationTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{content.allocationBody}</p>
              <ol className="mt-5 space-y-4">
                {content.allocationSteps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-black text-primary">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-2xl border border-sky-200 bg-white/80 p-4 text-xs font-semibold leading-6 text-slate-600">{content.allocationNote}</p>
              <a
                href={content.allocationLinkHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-primary underline-offset-4 hover:underline"
              >
                {content.allocationLinkLabel}
                <HiArrowNarrowLeft className="h-4 w-4 rtl:rotate-180" />
              </a>
            </article>

            <article className="rounded-[32px] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
                <HiDocumentText className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950">{content.signingTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{content.signingBody}</p>
              <ol className="mt-5 space-y-4">
                {content.signingSteps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-2xl border border-violet-200 bg-white/80 p-4 text-xs font-semibold leading-6 text-slate-600">{content.signingNote}</p>
            </article>
          </div>

          <p className="mt-5 text-xs font-semibold leading-6 text-slate-500">{content.documentsDisclaimer}</p>
        </section>

        <section aria-labelledby={`${variant}-workflow-title`} className="mt-16 overflow-hidden rounded-[34px] bg-slate-950 p-6 text-white shadow-hero sm:p-9 lg:grid lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">Hiro</p>
            <h2 id={`${variant}-workflow-title`} className="mt-3 text-3xl font-extrabold tracking-tight">{content.workflowTitle}</h2>
          </div>
          <ol className="mt-7 grid gap-5 sm:grid-cols-2 lg:mt-0">
            {content.workflow.map(([title, body], index) => (
              <li key={title} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-black text-white">{index + 1}</span>
                <h3 className="mt-4 text-base font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby={`${variant}-price-title`} className="mt-16 rounded-[34px] border border-primary/15 bg-gradient-to-br from-primary-50 via-white to-sky-50 p-6 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.priceEyebrow}</p>
          <h2 id={`${variant}-price-title`} className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{content.priceTitle}</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <article className="rounded-[26px] bg-white p-6 shadow-sm">
              <p className="text-sm font-extrabold text-slate-600">{content.customerPrice}</p>
              <p className="mt-2 text-4xl font-black text-emerald-600">{content.customerPriceValue}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{content.customerPriceBody}</p>
            </article>
            <article className="rounded-[26px] bg-slate-950 p-6 text-white shadow-sm">
              <p className="text-sm font-extrabold text-slate-300">{content.proPrice}</p>
              <p className="mt-2 text-4xl font-black text-white">{content.proPriceValue}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{content.proPriceBody}</p>
            </article>
          </div>
          <p className="mt-5 flex items-start gap-2 text-xs font-semibold leading-6 text-slate-500">
            <HiShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            {content.priceNote}
          </p>
        </section>

        <section aria-labelledby={`${variant}-faq-title`} className="mt-16 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary">
              <HiOutlineQuestionMarkCircle className="h-7 w-7" />
            </div>
            <h2 id={`${variant}-faq-title`} className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">{content.questionsTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{content.questionsIntro}</p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {content.faq.map(([question, answer], index) => (
              <details key={question} className="group py-5" open={index === 0 ? true : undefined}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-extrabold text-slate-900">
                  <span>{question}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500 transition group-open:rotate-45 group-open:bg-primary-50 group-open:text-primary">+</span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 overflow-hidden rounded-[34px] bg-hero-gradient px-6 py-9 text-center text-white shadow-hero sm:px-10 sm:py-12">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{content.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">{content.ctaBody}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={content.ctaHref} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              {content.ctaLabel}
              <HiArrowNarrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Link>
            <Link href={content.secondaryHref} className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15">
              {content.secondaryLabel}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-white/70">
            <Link href="/about" className="hover:text-white">About Hiro</Link>
            <Link href="/community" className="hover:text-white">Community</Link>
            <Link href="/contact" className="hover:text-white">Support</Link>
            <Link href="/privacy-policy" className="hover:text-white">Privacy</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
