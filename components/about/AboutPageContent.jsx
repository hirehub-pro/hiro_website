import Link from 'next/link';
import {
  HiArrowNarrowLeft,
  HiBriefcase,
  HiCalendar,
  HiChartBar,
  HiChatAlt2,
  HiCheckCircle,
  HiClipboardCheck,
  HiClipboardList,
  HiDocumentText,
  HiEye,
  HiOutlineQuestionMarkCircle,
  HiOutlineUserGroup,
  HiSearch,
  HiShieldCheck,
  HiSparkles,
  HiStar,
} from 'react-icons/hi';
import { getAuthMarketingCopy } from '../auth/AuthSeoContent';

const aboutCopy = {
  he: {
    dir: 'rtl',
    breadcrumbHome: 'עמוד הבית',
    breadcrumbCurrent: 'אודות Hiro',
    badge: 'שירות מקומי. ניהול מקצועי. מקום אחד.',
    title: 'Hiro מחברת בין אנשים שצריכים שירות לבין בעלי מקצוע שרוצים לנהל עסק טוב יותר',
    intro: 'החזון של Hiro הוא להפוך את כל הדרך — מהחיפוש הראשון ועד הבקשה, השיחה, העבודה והמסמך העסקי — לברורה, נגישה ומסודרת יותר לשני הצדדים.',
    heroPrimary: 'מציאת בעל מקצוע',
    heroSecondary: 'הצטרפות ל-Hiro',
    missionEyebrow: 'למה Hiro קיימת?',
    missionTitle: 'כי שירות טוב מתחיל הרבה לפני שמגיעים לעבודה עצמה',
    missionBody: 'לקוחות צריכים מידע ברור כדי לבחור נכון. בעלי מקצוע צריכים יותר מחשיפה — הם צריכים דרך להציג ניסיון, לקבל פניות עם הקשר ולנהל את העסק בלי לפזר מידע בין שיחות, טבלאות וקבצים. Hiro נבנתה כדי לחבר את שני הצרכים האלה למסלול אחד.',
    missionQuote: 'פחות חוסר ודאות ללקוח. פחות עבודה ידנית לבעל המקצוע. יותר שקיפות, רצף וסדר.',
    principlesTitle: 'העקרונות שמובילים את Hiro',
    principles: [
      ['clarity', 'בהירות לפני החלטה', 'פרופיל, תחומי שירות, אזור פעילות, עבודות, ביקורות וזמינות מספקים הקשר לפני שיוצרים קשר.'],
      ['connection', 'תקשורת עם הקשר', 'בקשה מסודרת ושיחה אחת שומרות יחד תיאור, מיקום, זמן, תמונות, סרטונים וקבצים.'],
      ['continuity', 'רצף מהפנייה לעבודה', 'הבקשה, ההודעות, הלקוח והמסמכים נשארים נגישים בחשבון במקום להיעלם בין ערוצים.'],
      ['honesty', 'שקיפות בלי הבטחות שווא', 'Hiro מספקת מידע וכלים; הבחירה, המחיר והסיכום המקצועי נשארים באחריות הלקוח ובעל המקצוע.'],
    ],
    audienceEyebrow: 'שני צדדים. מטרה משותפת.',
    audienceTitle: 'חוויה טובה יותר ללקוח ותשתית עבודה טובה יותר לעסק',
    customerTitle: 'Hiro ללקוחות',
    customerBody: 'מתאים למי שמחפש בעל מקצוע לבית, לעסק או לפרויקט ורוצה לקבל החלטה על בסיס מידע, להציג את הצורך בצורה ברורה ולשמור את התהליך נגיש.',
    customerPoints: [
      'חיפוש לפי מקצוע, אזור ומיקום',
      'השוואת פרופילים, עבודות, דירוגים וחוות דעת',
      'בקשות עבודה עם תמונות, סרטונים, זמן ומיקום',
      'הודעות ישירות, התראות ומעקב אחר סטטוס',
      'מיקומים שמורים וגישה להיסטוריית הפעילות',
    ],
    professionalTitle: 'Hiro לבעלי מקצוע ולעסקים',
    professionalBody: 'מתאים לעצמאים, נותני שירות ועסקים שרוצים לבנות נוכחות מקצועית, לקבל פניות רלוונטיות ולרכז לקוחות, תפעול ומסמכים במקום אחד.',
    professionalPoints: [
      'פרופיל ציבורי, תיק עבודות, תחומי שירות ורדיוס פעילות',
      'לוח זמינות, פניות, שיחות והתראות',
      'דשבורד עם צפיות, עבודות, דירוגים ומדדי איכות',
      'ניהול לקוחות ופרטי קשר',
      'הפקת מסמכים, מספרי הקצאה וקישורים לחתימה לפי הצורך',
    ],
    capabilitiesEyebrow: 'המערכת של Hiro',
    capabilitiesTitle: 'לא רק אינדקס בעלי מקצוע — סביבת עבודה שממשיכה אחרי החיפוש',
    capabilitiesIntro: 'כל יכולת נועדה לקצר מעבר מיותר בין מערכות ולשמור את המידע הדרוש במקום שבו העבודה באמת מתקדמת.',
    featureLabels: {
      search: ['חיפוש והתאמה מקומית', 'מקצוע, מיקום ואזור שירות עוזרים להתמקד בתוצאות רלוונטיות.'],
      reviews: ['פרופילים והוכחות עבודה', 'פרויקטים, דירוגים וחוות דעת מוסיפים הקשר לבחירה.'],
      requests: ['בקשות עבודה מפורטות', 'תיאור, תאריך, שעה, מיקום ומדיה מגיעים לבעל המקצוע יחד.'],
      chat: ['הודעות וקבצים', 'טקסט, תמונות, סרטונים, מסמכים והודעות קוליות נשמרים בשיחה.'],
      profile: ['נוכחות עסקית', 'שירותים, ביוגרפיה, פרטי קשר, אזור פעילות, זמינות ותיק עבודות.'],
      calendar: ['לוח זמנים', 'הצגת זמינות ועדכון ימים ושעות מצמצמים תיאומים חוזרים.'],
      analytics: ['מדדי פעילות וצמיחה', 'צפיות, עבודות, המרה, דירוגים ומדדי שירות מרוכזים בדשבורד.'],
      documents: ['לקוחות ומסמכים', 'ניהול לקוחות והפקת מסמכים עסקיים שנשמרים, נשלחים ומשותפים.'],
    },
    journeyEyebrow: 'מסלול אחד מקצה לקצה',
    journeyTitle: 'כך נראה תהליך עבודה ב-Hiro',
    journey: [
      ['מגדירים את הצורך', 'הלקוח בוחר תחום ומיקום או פותח בקשה עם תיאור, זמן ומדיה.'],
      ['מכירים ומשווים', 'עוברים על פרופילים, ניסיון, עבודות, ביקורות, אזור שירות וזמינות.'],
      ['יוצרים קשר', 'שולחים בקשה או הודעה ושומרים את הפרטים החשובים בתוך החשבון.'],
      ['מנהלים את העבודה', 'בעל המקצוע עוקב אחר הפנייה, הלקוח, לוח הזמנים והתקשורת.'],
      ['מסיימים בצורה מסודרת', 'מפיקים את המסמך המתאים, שומרים PDF, שולחים או משתפים, ובמסמכים המתאימים מבקשים הקצאה או חתימה.'],
    ],
    documentsEyebrow: 'Hiro לעסק הפעיל',
    documentsTitle: 'מסמכים דיגיטליים, מספרי הקצאה וחתימה מרחוק',
    documentsIntro: 'כלי המסמכים מחברים בין פרטי הלקוח לבין העסקה בפועל. בוחרים מסמך, מוסיפים פריטים ותשלום, בודקים תצוגה מקדימה ושומרים PDF בארכיון.',
    allocationShortTitle: 'מספר הקצאה כשנדרש',
    allocationShortBody: 'בחשבונית מס או חשבונית מס/קבלה רלוונטית, Hiro בודקת את הסכום לפני מע״מ, מספר העוסק של הלקוח והחיבור לרשות המסים. לאחר אישור, מספר ההקצאה נשמר בנפרד ממספר החשבונית ומופיע במסמך.',
    signingShortTitle: 'קישור חתימה להצעות ולהזמנות',
    signingShortBody: 'לאחר שמירת הצעת מחיר או הזמנת עבודה אפשר ליצור קישור ייעודי, לשתף אותו מהטלפון, להעתיק או לשלוח בדוא״ל. בגרסה הנוכחית פעולה זו מיועדת לשני סוגי המסמכים האלה.',
    documentsLink: 'פתיחת חשבון והיכרות עם כל כלי העסק',
    transparencyEyebrow: 'מה חשוב לדעת',
    transparencyTitle: 'Hiro עוזרת לנהל החלטה ועבודה — היא לא מחליפה שיקול דעת מקצועי',
    transparency: [
      ['Hiro מציגה מידע; היא לא מבטיחה תוצאה', 'פרופילים, ביקורות, מדיה וזמינות מסייעים להשוות, אבל הלקוח אחראי לבדוק התאמה ולבחור.'],
      ['המחיר נקבע בין הצדדים', 'Hiro אינה קובעת את מחיר העבודה. חשוב לסכם היקף, חומרים, מחיר, זמנים ואחריות לפני תחילת העבודה.'],
      ['סוג המסמך והמספור באחריות העסק', 'המערכת מספקת כלים, אך בעל העסק אחראי לבחור מסמך נכון, להמשיך את הרצף האמיתי ולעמוד בדרישות הדיווח.'],
      ['מידע רשמי גובר על הסבר באתר', 'כללי מס ומספרי הקצאה משתנים. במקרה של ספק פונים לרשות המסים ולאיש מקצוע מוסמך.'],
    ],
    priceEyebrow: 'מחיר והצטרפות',
    priceTitle: 'מתחילים לפי סוג החשבון',
    faqEyebrow: 'שאלות נפוצות',
    faqTitle: 'כל מה שכדאי לדעת על Hiro לפני שמתחילים',
    faq: [
      ['מה זה Hiro?', 'Hiro היא פלטפורמה שמחברת בין לקוחות שמחפשים שירות לבין בעלי מקצוע ועסקים, ומרכזת חיפוש, פרופילים, בקשות, הודעות, זמינות וכלים עסקיים.'],
      ['במה Hiro שונה מאינדקס בעלי מקצוע רגיל?', 'החיפוש הוא רק ההתחלה. Hiro ממשיכה עם בקשת עבודה מפורטת, שיחה, סטטוס, לוח זמנים, ניהול לקוחות ומסמכים עסקיים לבעלי מקצוע.'],
      ['למי Hiro מתאימה?', 'ללקוחות פרטיים ועסקיים שמחפשים שירות מקומי, ולעצמאים, נותני שירות ועסקים שרוצים להציג עבודה ולנהל פניות ותפעול במקום אחד.'],
      ['איך בוחרים בעל מקצוע?', 'משווים תחום וניסיון רלוונטי, פרויקטים, ביקורות, אזור שירות וזמינות, ואז מסכמים ישירות את היקף העבודה, המחיר והתנאים.'],
      ['האם כל בעל מקצוע ב-Hiro מאומת או מובטח?', 'לא. בפרופילים עשויים להופיע נתוני אימות ודירוג כאשר הם קיימים, אך Hiro אינה מבטיחה התאמה או תוצאה. חשוב לבדוק את המידע ולהפעיל שיקול דעת.'],
      ['מה אפשר לצרף לבקשה או להודעה?', 'בקשת עבודה יכולה לכלול תיאור, זמן, מיקום, תמונות או סרטונים. בשיחה אפשר לשתף גם קבצים והודעות קוליות.'],
      ['מה כולל החשבון המקצועי?', 'פרופיל ותיק עבודות, אזור שירות וזמינות, פניות ושיחות, דשבורד פעילות, ניהול לקוחות וכלי מסמכים בהתאם לסוג העסק ולהרשאות.'],
      ['אילו מסמכים אפשר להפיק?', 'הצעת מחיר, הזמנת עבודה, קבלה, חשבונית מס, חשבונית מס/קבלה, חשבון עסקה ותעודת זיכוי. הזמינות בפועל תלויה בסוג העסק, באימות ובהגדרות.'],
      ['מהו מספר הקצאה?', 'מספר ייחודי בן 9 ספרות שרשות המסים מחזירה עבור חשבונית מס מסוימת במסגרת „חשבוניות ישראל”. הוא נפרד ממספר החשבונית הרציף של העסק.'],
      ['מתי Hiro מבקשת מספר הקצאה?', 'במסמך חשבונית מס רלוונטי ללקוח עסקי, כאשר הוזן מספר עוסק והסכום לפני מע״מ גבוה מהסף המוגדר. נדרשים עסק מאומת וחיבור מורשה לרשות המסים.'],
      ['אפשר לשלוח הצעת מחיר לחתימה?', 'כן. אחרי שמירת הצעת מחיר או הזמנת עבודה אפשר ליצור קישור חתימה ולשתף אותו. חשבוניות וקבלות נשלחות כמסמכים שמורים ללא פעולת החתימה הזו.'],
      ['כמה עולה Hiro?', 'פתיחת חשבון לקוח היא בחינם. מחיר Hiro Pro לבעלי מקצוע הוא 120.90 ₪ למנוי, כולל מע״מ. תקופת החיוב והתנאים הסופיים מוצגים לפני אישור התשלום.'],
      ['אפשר להשתמש ב-Hiro מהטלפון ומהמחשב?', 'כן. Hiro זמינה בדפדפן במחשב ובנייד, וקיימות גם אפליקציות ל-iPhone ולאנדרואיד.'],
      ['איפה מקבלים עזרה?', 'אפשר לעבור לעמוד יצירת הקשר ולשלוח בקשת תמיכה. בעמוד הדיווחים ניתן גם לשלוח דיווח על תקלה או בעיית תוכן מחשבון פעיל.'],
    ],
    ctaTitle: 'מוכנים להפוך את השירות הבא לפשוט ומסודר יותר?',
    ctaBody: 'חפשו בעל מקצוע לפי התחום והאזור, או פתחו חשבון ובנו תהליך עבודה שמחבר בין פרופיל, לקוחות, שיחות ומסמכים.',
    ctaSearch: 'חיפוש בעלי מקצוע',
    ctaJoin: 'פתיחת חשבון Hiro',
  },
  en: {
    dir: 'ltr',
    breadcrumbHome: 'Home',
    breadcrumbCurrent: 'About Hiro',
    badge: 'Local service. Professional management. One place.',
    title: 'Hiro connects people who need a service with professionals who want to run a better business',
    intro: 'Hiro’s vision is to make the full journey—from discovery to request, conversation, work, and business document—clearer, more accessible, and better organized for both sides.',
    heroPrimary: 'Find a professional',
    heroSecondary: 'Join Hiro',
    missionEyebrow: 'Why does Hiro exist?',
    missionTitle: 'Because good service begins long before the work starts',
    missionBody: 'Customers need clear information to make a decision. Professionals need more than exposure: they need a way to present experience, receive contextual enquiries, and run the business without scattering information across calls, spreadsheets, and files. Hiro connects those needs in one journey.',
    missionQuote: 'Less uncertainty for the customer. Less manual work for the professional. More clarity, continuity, and order.',
    principlesTitle: 'The principles behind Hiro',
    principles: [
      ['clarity', 'Clarity before a decision', 'Profiles, services, coverage, work, reviews, and availability provide context before contact.'],
      ['connection', 'Communication with context', 'A structured request and one conversation keep the description, location, timing, media, and files together.'],
      ['continuity', 'Continuity from enquiry to work', 'Requests, messages, customer information, and documents remain accessible instead of disappearing across channels.'],
      ['honesty', 'Transparency without false promises', 'Hiro provides information and tools; selection, price, and the professional agreement remain with the customer and professional.'],
    ],
    audienceEyebrow: 'Two sides. One shared goal.',
    audienceTitle: 'A better customer experience and a better operating foundation for the business',
    customerTitle: 'Hiro for customers',
    customerBody: 'For anyone seeking a professional for a home, business, or project who wants clearer information, a better request, and an accessible record of the journey.',
    customerPoints: ['Search by profession, area, and location', 'Compare profiles, projects, ratings, and reviews', 'Work requests with media, timing, and location', 'Direct messages, notifications, and status tracking', 'Saved locations and activity history'],
    professionalTitle: 'Hiro for professionals and businesses',
    professionalBody: 'For independent professionals, service providers, and businesses that want a stronger presence, relevant enquiries, and customer, operations, and document tools in one place.',
    professionalPoints: ['Public profile, portfolio, services, and work radius', 'Availability, enquiries, conversations, and notifications', 'Dashboard with views, jobs, ratings, and quality indicators', 'Customer and contact management', 'Documents, allocation numbers, and signing links when relevant'],
    capabilitiesEyebrow: 'The Hiro platform',
    capabilitiesTitle: 'More than a professional directory—an environment that continues after search',
    capabilitiesIntro: 'Every capability reduces unnecessary switching and keeps information where the work actually progresses.',
    featureLabels: {
      search: ['Local discovery and matching', 'Profession, location, and service area focus the results.'],
      reviews: ['Profiles and proof of work', 'Projects, ratings, and reviews add context to selection.'],
      requests: ['Detailed work requests', 'Description, date, time, location, and media arrive together.'],
      chat: ['Messages and files', 'Text, images, video, documents, and voice notes stay in the conversation.'],
      profile: ['Business presence', 'Services, bio, contact details, coverage, availability, and portfolio.'],
      calendar: ['Schedule', 'Visible availability and day updates reduce repeated coordination.'],
      analytics: ['Activity and growth indicators', 'Views, jobs, conversion, ratings, and service indicators share one dashboard.'],
      documents: ['Customers and documents', 'Manage customers and create documents that can be saved, sent, and shared.'],
    },
    journeyEyebrow: 'One end-to-end journey',
    journeyTitle: 'How work moves through Hiro',
    journey: [
      ['Define the need', 'The customer chooses a field and location or creates a request with details, timing, and media.'],
      ['Learn and compare', 'Review profiles, experience, work, feedback, service area, and availability.'],
      ['Make contact', 'Send a request or message and keep the important information in the account.'],
      ['Manage the work', 'The professional follows the enquiry, customer, schedule, and communication.'],
      ['Finish with an organized record', 'Create the right document, save the PDF, send or share it, and request allocation or signature where supported.'],
    ],
    documentsEyebrow: 'Hiro for an active business',
    documentsTitle: 'Digital documents, allocation numbers, and remote signing',
    documentsIntro: 'Document tools connect customer information with the actual transaction. Choose a type, add items and payment details, preview the result, and save a PDF in the archive.',
    allocationShortTitle: 'Allocation numbers when required',
    allocationShortBody: 'For a relevant tax invoice or tax invoice/receipt, Hiro checks the pre-VAT amount, customer VAT number, and Tax Authority connection. After approval, the allocation number is stored separately from the invoice number and shown on the document.',
    signingShortTitle: 'Signing links for quotes and work orders',
    signingShortBody: 'After saving a quote or work order, create a dedicated URL and share it from mobile, copy it, or prepare an email. In the current version, this action is available for those two document types.',
    documentsLink: 'Create an account and explore the business tools',
    transparencyEyebrow: 'Important expectations',
    transparencyTitle: 'Hiro supports decisions and work—it does not replace professional judgment',
    transparency: [
      ['Hiro presents information; it does not guarantee an outcome', 'Profiles, feedback, media, and availability support comparison, but the customer remains responsible for selection.'],
      ['The parties agree on the job price', 'Hiro does not set job pricing. Agree on scope, materials, price, timing, and responsibility before work begins.'],
      ['The business owns document choice and numbering', 'The system provides tools, while the business remains responsible for the correct type, real sequence, and reporting obligations.'],
      ['Official information prevails', 'Tax and allocation rules change. When uncertain, consult the Tax Authority and a qualified professional.'],
    ],
    priceEyebrow: 'Pricing and membership',
    priceTitle: 'Begin with the account that fits your role',
    faqEyebrow: 'Frequently asked questions',
    faqTitle: 'What to know about Hiro before you begin',
    faq: [
      ['What is Hiro?', 'Hiro connects customers seeking services with professionals and businesses, combining search, profiles, requests, messaging, availability, and business tools.'],
      ['How is Hiro different from a standard directory?', 'Search is only the beginning. Hiro continues with detailed work requests, conversation, status, schedule, customers, and business documents for professionals.'],
      ['Who is Hiro for?', 'For private and business customers seeking local services, and for independent professionals, service providers, and businesses that want one place for presence, enquiries, and operations.'],
      ['How should I choose a professional?', 'Compare relevant experience, projects, reviews, service area, and availability, then agree directly on scope, price, and terms.'],
      ['Is every professional verified or guaranteed?', 'No. Profiles may show verification and rating information when available, but Hiro does not guarantee fit or outcome. Review the information and use your judgment.'],
      ['What can I attach to a request or message?', 'A request can include description, timing, location, photos, or video. Conversations can also include files and voice notes.'],
      ['What does the professional account include?', 'A profile and portfolio, service area and availability, enquiries and conversations, activity dashboard, customer management, and document tools based on business type and permissions.'],
      ['Which documents can be created?', 'Quotes, work orders, receipts, tax invoices, tax invoice/receipts, transaction accounts, and credit notes. Availability depends on business type, verification, and settings.'],
      ['What is an allocation number?', 'A unique nine-digit number returned by the Israel Tax Authority for a specific tax invoice under “Israel Invoices.” It is separate from the business’s sequential invoice number.'],
      ['When does Hiro request an allocation number?', 'For a relevant tax-invoice document to a business customer when a VAT number is present and the pre-VAT amount exceeds the configured threshold. A verified business and authorized Tax Authority connection are required.'],
      ['Can a quote be sent for signature?', 'Yes. After saving a quote or work order, create and share a signing link. Invoices and receipts are sent as saved documents without this signing action.'],
      ['How much does Hiro cost?', 'Customer accounts are free. Hiro Pro for professionals costs ₪120.90 including VAT. The billing period and final terms appear before payment approval.'],
      ['Can I use Hiro on mobile and desktop?', 'Yes. Hiro works in desktop and mobile browsers, with iPhone and Android apps also available.'],
      ['Where can I get help?', 'Visit the contact page to send a support request. Signed-in users can also use reports to flag a bug or content problem.'],
    ],
    ctaTitle: 'Ready to make the next service easier and more organized?',
    ctaBody: 'Find a professional by field and location, or create an account and connect profile, customers, conversations, and documents in one workflow.',
    ctaSearch: 'Find professionals',
    ctaJoin: 'Create a Hiro account',
  },
};

const principleIcons = {
  clarity: HiEye,
  connection: HiChatAlt2,
  continuity: HiClipboardCheck,
  honesty: HiShieldCheck,
};

const featureIcons = {
  search: HiSearch,
  reviews: HiStar,
  requests: HiClipboardList,
  chat: HiChatAlt2,
  profile: HiOutlineUserGroup,
  calendar: HiCalendar,
  analytics: HiChartBar,
  documents: HiDocumentText,
};

function copyLanguage(locale) {
  return locale === 'he' ? 'he' : 'en';
}

export function getAboutPageContent(locale = 'he') {
  return aboutCopy[copyLanguage(locale)];
}

export function getAboutFaqStructuredData() {
  const content = getAboutPageContent('he');
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

function CheckList({ items }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-700">
          <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPageContent({ locale = 'he', backToSettingsLabel = 'Settings' }) {
  const content = getAboutPageContent(locale);
  const platform = getAuthMarketingCopy(locale, 'signup');

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-8" dir={content.dir}>
      <div className="absolute inset-x-0 top-0 h-[680px] bg-gradient-to-b from-sky-100/70 via-slate-50 to-slate-50" />
      <div className="absolute -right-24 top-28 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -left-24 top-[520px] h-72 w-72 rounded-full bg-violet-200/35 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Link href="/" className="transition hover:text-primary">{content.breadcrumbHome}</Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-800">{content.breadcrumbCurrent}</span>
          </nav>
          <Link href="/settings" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:text-primary hover:shadow-card">
            <HiArrowNarrowLeft className="h-4 w-4 rtl:rotate-180" />
            {backToSettingsLabel}
          </Link>
        </div>

        <section className="mt-5 overflow-hidden rounded-[38px] bg-hero-gradient px-6 py-10 text-white shadow-hero sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/90">
              <HiSparkles className="h-4 w-4" />
              {content.badge}
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">{content.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/80 sm:text-lg">{content.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/search" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <HiSearch className="h-5 w-5" />
                {content.heroPrimary}
              </Link>
              <Link href="/auth/signup" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-white/15">
                {content.heroSecondary}
                <HiArrowNarrowLeft className="h-5 w-5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="about-mission" className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[32px] bg-white p-6 shadow-card sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.missionEyebrow}</p>
            <h2 id="about-mission" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{content.missionTitle}</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">{content.missionBody}</p>
          </article>
          <aside className="flex items-center rounded-[32px] bg-slate-950 p-7 text-white shadow-card sm:p-9">
            <blockquote className="text-2xl font-extrabold leading-relaxed tracking-tight sm:text-3xl">“{content.missionQuote}”</blockquote>
          </aside>
        </section>

        <section aria-labelledby="about-principles" className="mt-16">
          <h2 id="about-principles" className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{content.principlesTitle}</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.principles.map(([key, title, body]) => {
              const Icon = principleIcons[key];
              return (
                <article key={key} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary"><Icon className="h-6 w-6" /></div>
                  <h3 className="mt-5 text-lg font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="about-audiences" className="mt-16">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.audienceEyebrow}</p>
          <h2 id="about-audiences" className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{content.audienceTitle}</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><HiOutlineUserGroup className="h-7 w-7" /></div>
              <h3 className="mt-5 text-2xl font-extrabold text-slate-950">{content.customerTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{content.customerBody}</p>
              <CheckList items={content.customerPoints} />
            </article>
            <article className="rounded-[34px] border border-primary/20 bg-primary-50/70 p-6 shadow-sm sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white"><HiBriefcase className="h-7 w-7" /></div>
              <h3 className="mt-5 text-2xl font-extrabold text-slate-950">{content.professionalTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{content.professionalBody}</p>
              <CheckList items={content.professionalPoints} />
            </article>
          </div>
        </section>

        <section aria-labelledby="about-capabilities" className="mt-16">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.capabilitiesEyebrow}</p>
          <h2 id="about-capabilities" className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{content.capabilitiesTitle}</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{content.capabilitiesIntro}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(content.featureLabels).map(([key, [title, body]]) => {
              const Icon = featureIcons[key];
              return (
                <article key={key} className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-card">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-primary transition group-hover:bg-primary group-hover:text-white"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-4 text-lg font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="about-journey" className="mt-16 overflow-hidden rounded-[36px] bg-slate-950 p-6 text-white shadow-hero sm:p-9 lg:p-11">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">{content.journeyEyebrow}</p>
          <h2 id="about-journey" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{content.journeyTitle}</h2>
          <ol className="mt-8 grid gap-4 lg:grid-cols-5">
            {content.journey.map(([title, body], index) => (
              <li key={title} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-black">{index + 1}</span>
                <h3 className="mt-4 text-base font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="about-documents" className="mt-16 rounded-[36px] bg-white p-6 shadow-card sm:p-9 lg:p-11">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.documentsEyebrow}</p>
          <h2 id="about-documents" className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{content.documentsTitle}</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{content.documentsIntro}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platform.documentTypes.map(([title, body]) => (
              <article key={title} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                <HiDocumentText className="h-6 w-6 text-primary" />
                <h3 className="mt-3 text-base font-extrabold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[30px] border border-sky-200 bg-sky-50 p-6 sm:p-7">
              <HiShieldCheck className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-2xl font-extrabold text-slate-950">{content.allocationShortTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{content.allocationShortBody}</p>
              <a href={platform.allocationLinkHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-primary underline-offset-4 hover:underline">
                {platform.allocationLinkLabel}<HiArrowNarrowLeft className="h-4 w-4 rtl:rotate-180" />
              </a>
            </article>
            <article className="rounded-[30px] border border-violet-200 bg-violet-50 p-6 sm:p-7">
              <HiClipboardCheck className="h-8 w-8 text-violet-600" />
              <h3 className="mt-4 text-2xl font-extrabold text-slate-950">{content.signingShortTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{content.signingShortBody}</p>
            </article>
          </div>
          <p className="mt-5 text-xs font-semibold leading-6 text-slate-500">{platform.documentsDisclaimer}</p>
          <Link href="/auth/signup" className="btn-primary mt-6 inline-flex items-center gap-2">{content.documentsLink}<HiArrowNarrowLeft className="h-4 w-4 rtl:rotate-180" /></Link>
        </section>

        <section aria-labelledby="about-transparency" className="mt-16">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.transparencyEyebrow}</p>
          <h2 id="about-transparency" className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{content.transparencyTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {content.transparency.map(([title, body]) => (
              <article key={title} className="rounded-[26px] border border-amber-200 bg-amber-50/70 p-6">
                <h3 className="flex items-start gap-3 text-lg font-extrabold text-slate-950"><HiShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="about-price" className="mt-16 rounded-[36px] border border-primary/15 bg-gradient-to-br from-primary-50 via-white to-sky-50 p-6 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.priceEyebrow}</p>
          <h2 id="about-price" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{content.priceTitle}</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <article className="rounded-[26px] bg-white p-6 shadow-sm">
              <p className="text-sm font-extrabold text-slate-600">{platform.customerPrice}</p>
              <p className="mt-2 text-4xl font-black text-emerald-600">{platform.customerPriceValue}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{platform.customerPriceBody}</p>
            </article>
            <article className="rounded-[26px] bg-slate-950 p-6 text-white shadow-sm">
              <p className="text-sm font-extrabold text-slate-300">{platform.proPrice}</p>
              <p className="mt-2 text-4xl font-black">{platform.proPriceValue}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{platform.proPriceBody}</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="about-faq" className="mt-16 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{content.faqEyebrow}</p>
            <h2 id="about-faq" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{content.faqTitle}</h2>
            <HiOutlineQuestionMarkCircle className="mt-5 h-12 w-12 text-primary" />
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

        <section className="mt-16 overflow-hidden rounded-[36px] bg-hero-gradient px-6 py-10 text-center text-white shadow-hero sm:px-10 sm:py-14">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{content.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">{content.ctaBody}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/search" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><HiSearch className="h-5 w-5" />{content.ctaSearch}</Link>
            <Link href="/auth/signup" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-white/15">{content.ctaJoin}<HiArrowNarrowLeft className="h-5 w-5 rtl:rotate-180" /></Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-white/70">
            <Link href="/community" className="hover:text-white">Community</Link>
            <Link href="/contact" className="hover:text-white">Support</Link>
            <Link href="/terms-of-service" className="hover:text-white">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-white">Privacy</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
