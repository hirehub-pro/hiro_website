// Stable profession metadata used to pre-render crawlable category pages.
// Worker profiles, reviews, and availability remain live Firestore data.
export const PROFESSION_CATALOG = [
  { id: 2, slug: 'electrician', en: 'electrician', he: 'חשמלאי', ar: 'كهربائي', am: 'ኤሌክትሪክ ባለሙያ', ru: 'Электрик', logo: 'electric_bolt', color: '#FBC02D', bookingMode: 'provider_travels' },
  { id: 3, slug: 'plumber', en: 'plumber', he: 'אינסטלטור', ar: 'سباك', am: 'ቧንቧ ባለሙያ', ru: 'Сантехник', logo: 'plumbing', color: '#0288D1', bookingMode: 'provider_travels' },
  { id: 4, slug: 'carpenter', en: 'carpenter', he: 'נגר', ar: 'نجار', am: 'እንጨት ሰራተኛ', ru: 'Плотник', logo: 'carpenter', color: '#8D6E63', bookingMode: 'provider_travels' },
  { id: 5, slug: 'painter', en: 'painter', he: 'צבעי', ar: 'دهان', am: 'ቀለም ባለሙያ', ru: 'Маляр', logo: 'format_paint', color: '#E57373', bookingMode: 'provider_travels' },
  { id: 6, slug: 'mechanic', en: 'mechanic', he: 'מכונאי', ar: 'ميكانيكي', am: 'መካኒክ', ru: 'Механик', logo: 'car_repair', color: '#616161', bookingMode: 'provider_travels' },
  { id: 7, slug: 'ac-technician', en: 'ac technician', he: 'טכנאי מזגנים', ar: 'فني تكييف', am: 'ኤሲ ቴክኒሻን', ru: 'Техник кондиционеров', logo: 'ac_unit', color: '#4FC3F7', bookingMode: 'provider_travels' },
  { id: 8, slug: 'blacksmith', en: 'blacksmith', he: 'נפח', ar: 'حداد', am: 'ብረት ሰራተኛ', ru: 'Кузнец', logo: 'asset:welding_mask', color: '#455A64', bookingMode: 'provider_travels' },
  { id: 9, slug: 'cleaner', en: 'cleaner', he: 'מנקה', ar: 'عامل نظافة', am: 'ንጽህና ሰራተኛ', ru: 'Уборщик', logo: 'cleaning_services', color: '#81C784', bookingMode: 'provider_travels' },
  { id: 10, slug: 'gardener', en: 'gardener', he: 'גנן', ar: 'بستاني', am: 'አትክልተኛ', ru: 'Садовник', logo: 'park', color: '#66BB6A', bookingMode: 'provider_travels' },
  { id: 11, slug: 'mover', en: 'mover', he: 'מוביל', ar: 'عامل نقل', am: 'መጫኛ ሰራተኛ', ru: 'Грузчик', logo: 'local_shipping', color: '#FFA726', bookingMode: 'provider_travels' },
  { id: 12, slug: 'appliance-technician', en: 'appliance technician', he: 'טכנאי מכשירי חשמל', ar: 'فني أجهزة كهربائية', am: 'የቤት እቃ ቴክኒሻን', ru: 'Мастер по бытовой технике', logo: 'electrical_services', color: '#9575CD', bookingMode: 'customer_travels' },
  { id: 13, slug: 'construction-worker', en: 'construction worker', he: 'פועל בניין', ar: 'عامل بناء', am: 'የግንባታ ሰራተኛ', ru: 'Строитель', logo: 'asset:engineer', color: '#D4E157', bookingMode: 'provider_travels' },
  { id: 14, slug: 'tiler', en: 'tiler', he: 'רצף', ar: 'مبلط', am: 'ጣሪያ ሰራተኛ', ru: 'Плиточник', logo: 'asset:work', color: '#A1887F', bookingMode: 'provider_travels' },
  { id: 16, slug: 'security-guard', en: 'security guard', he: 'מאבטח', ar: 'حارس أمن', am: 'የደህነት ጠባቂ', ru: 'Охранник', logo: 'security', color: '#37474F', bookingMode: 'provider_travels' },
  { id: 17, slug: 'driver', en: 'driver', he: 'נהג', ar: 'سائق', am: 'ሹፌር', ru: 'Водитель', logo: 'local_taxi', color: '#FBBF24', bookingMode: 'provider_travels' },
  { id: 18, slug: 'cook', en: 'cook', he: 'טבח', ar: 'طباخ', am: 'ምግብ ሰሪ', ru: 'Повар', logo: 'asset:cooking', color: '#FF7043', bookingMode: 'provider_travels' },
  { id: 20, slug: 'handyman', en: 'handyman', he: 'שיפוצניק', ar: 'مقاول', am: 'የቤት ጥገና ባለሙያ', ru: 'Мастер на все руки', logo: 'construction', color: '#A1887F', bookingMode: 'provider_travels' },
  { id: 21, slug: 'barber', en: 'barber', he: 'ספר', ar: 'حلاق', am: 'ፀጉር አስተካካይ', ru: 'Парикмахер', logo: 'asset:hairdress', color: '#8E24AA', bookingMode: 'customer_travels' },
  { id: 22, slug: 'hair-stylist', en: 'hair stylist', he: 'מעצב שיער', ar: 'مصفف شعر', am: 'የፀጉር ስታይሊስት', ru: 'Стилист', logo: 'asset:cut', color: '#BA68C8', bookingMode: 'customer_travels' },
  { id: 23, slug: 'tailor', en: 'tailor', he: 'חייט', ar: 'خياط', am: 'ልብስ ሰራተኛ', ru: 'Портной', logo: 'asset:sewing', color: '#6D4C41', bookingMode: 'customer_travels' },
  { id: 25, slug: 'dentist', en: 'dentist', he: 'רופא שיניים', ar: 'طبيب أسنان', am: 'የጥርስ ሐኪም', ru: 'Стоматолог', logo: 'asset:dentist', color: '#EF5350', bookingMode: 'customer_travels' },
  { id: 27, slug: 'private-teacher', en: 'private teacher', he: 'מורה פרטי', ar: 'مدرس خصوصي', am: 'የግል አስተማሪ', ru: 'Частный преподаватель', logo: 'school', color: '#29B6F6', bookingMode: 'customer_travels' },
  { id: 28, slug: 'accountant', en: 'accountant', he: 'רואה חשבון', ar: 'محاسب', am: 'አካውንታንት', ru: 'Бухгалтер', logo: 'asset:accounts', color: '#0EA5E9', bookingMode: 'online' },
  { id: 29, slug: 'lawyer', en: 'lawyer', he: 'עורך דין', ar: 'محامي', am: 'ሕግ ባለሙያ', ru: 'Юрист', logo: 'balance', color: '#5D4037', bookingMode: 'online' },
  { id: 30, slug: 'graphic-designer', en: 'graphic designer', he: 'מעצב גרפי', ar: 'مصمم جرافيك', am: 'ግራፊክ ዲዛይነር', ru: 'Графический дизайнер', logo: 'image', color: '#AB47BC', bookingMode: 'online' },
  { id: 31, slug: 'developer', en: 'developer', he: 'מפתח', ar: 'مطور', am: 'ዲቨሎፐር', ru: 'Разработчик', logo: 'engineering', color: '#26A69A', bookingMode: 'online' },
  { id: 32, slug: 'project-manager', en: 'project manager', he: 'מנהל פרויקטים', ar: 'مدير مشروع', am: 'ፕሮጀክት ማኔጀር', ru: 'Менеджер проектов', logo: 'engineering', color: '#7E57C2', bookingMode: 'online' },
  { id: 33, slug: 'translator', en: 'translator', he: 'מתרגם', ar: 'مترجم', am: 'ተርጓሚ', ru: 'Переводчик', logo: 'translate', color: '#26C6DA', bookingMode: 'online' },
  { id: 36, slug: 'sales-representative', en: 'sales representative', he: 'נציג מכירות', ar: 'مندوب مبيعات', am: 'የሽያጭ ወኪል', ru: 'Торговый представитель', logo: 'engineering', color: '#FFA000', bookingMode: 'provider_travels' },
  { id: 37, slug: 'fitness-trainer', en: 'fitness trainer', he: 'מאמן כושר', ar: 'مدرب رياضي', am: 'የአካል ብቃት አሰልጣኝ', ru: 'Фитнес-тренер', logo: 'fitness_center', color: '#78716C', bookingMode: 'provider_travels' },
  { id: 38, slug: 'coach', en: 'coach', he: 'מאמן', ar: 'مدرب', am: 'አሰልጣኝ', ru: 'Коуч', logo: 'engineering', color: '#42A5F5', bookingMode: 'online' },
  { id: 39, slug: 'maintenance-technician', en: 'maintenance technician', he: 'טכנאי תחזוקה', ar: 'فني صيانة', am: 'የጥገና ቴክኒሻን', ru: 'Техник по обслуживанию', logo: 'engineering', color: '#78909C', bookingMode: 'provider_travels' },
  { id: 40, slug: 'farmer', en: 'farmer', he: 'חקלאי', ar: 'مزارع', am: 'ገበሬ', ru: 'Фермер', logo: 'engineering', color: '#8BC34A', bookingMode: 'provider_travels' },
  { id: 42, slug: 'aluminum-worker', en: 'aluminum worker', he: 'נגר אלומיניום', ar: 'نجار ألمنيوم', am: 'አሉሚኒየም ሰራተኛ', ru: 'Мастер по алюминию', logo: 'engineering', color: '#90A4AE', bookingMode: 'provider_travels' },
  { id: 43, slug: 'glass-technician', en: 'glass technician', he: 'זגג', ar: 'فني زجاج', am: 'የመስታወት ቴክኒሻን', ru: 'Стекольщик', logo: 'engineering', color: '#81D4FA', bookingMode: 'provider_travels' },
  { id: 44, slug: 'car-painter', en: 'car painter', he: 'צבע רכב', ar: 'دهان سيارات', am: 'የመኪና ቀለም ባለሙያ', ru: 'Автомаляр', logo: 'directions_car', color: '#E57373', bookingMode: 'customer_travels' },
  { id: 45, slug: 'car-washer', en: 'car washer', he: 'שוטף רכבים', ar: 'غاسل سيارات', am: 'የመኪና እጥበት ባለሙያ', ru: 'Мойщик автомобилей', logo: 'local_car_wash', color: '#4DD0E1', bookingMode: 'customer_travels' },
  { id: 46, slug: 'tire-technician', en: 'tire technician', he: 'טכנאי צמיגים', ar: 'فني إطارات', am: 'የጎማ ቴክኒሻን', ru: 'Шиномонтажник', logo: 'engineering', color: '#616161', bookingMode: 'customer_travels' },
  { id: 47, slug: 'delivery-driver', en: 'delivery driver', he: 'שליח', ar: 'مندوب توصيل', am: 'የመላኪያ ሰራተኛ', ru: 'Курьер', logo: 'engineering', color: '#FF7043', bookingMode: 'provider_travels' },
  { id: 51, slug: 'app-developer', en: 'app developer', he: 'מפתח אפליקציות', ar: 'مطور تطبيقات', am: 'መተግበሪያ ዲቨሎፐር', ru: 'Разработчик приложений', logo: 'asset:coding', color: '#26A69A', bookingMode: 'online' },
  { id: 53, slug: 'locksmith', en: 'locksmith', he: 'מנעולן', ar: 'فني أقفال', am: 'የቁልፍ ባለሙያ', ru: 'Слесарь по замкам', logo: 'asset:locksmith_2', color: '#6D4C41', bookingMode: 'provider_travels' },
  { id: 54, slug: 'pest-control-specialist', en: 'pest control specialist', he: 'מדביר', ar: 'مكافح آفات', am: 'የተባይ መቆጣጠሪያ ባለሙያ', ru: 'Специалист по дезинсекции', logo: 'engineering', color: '#8BC34A', bookingMode: 'provider_travels' },
  { id: 55, slug: 'cctv-technician', en: 'cctv technician', he: 'טכנאי מצלמות אבטחה', ar: 'فني كاميرات مراقبة', am: 'የሲሲቲቪ ቴክኒሻን', ru: 'Техник видеонаблюдения', logo: 'videocam', color: '#455A64', bookingMode: 'provider_travels' },
  { id: 57, slug: 'electric-gate-technician', en: 'electric gate technician', he: 'טכנאי שערים חשמליים', ar: 'فني بوابات كهربائية', am: 'የኤሌክትሪክ በር ቴክኒሻን', ru: 'Техник электрических ворот', logo: 'engineering', color: '#607D8B', bookingMode: 'provider_travels' },
  { id: 58, slug: 'elevator-technician', en: 'elevator technician', he: 'טכנאי מעליות', ar: 'فني مصاعد', am: 'የሊፍት ቴክኒሻን', ru: 'Техник лифтов', logo: 'elevator', color: '#78909C', bookingMode: 'provider_travels' },
  { id: 59, slug: 'solar-panel-technician', en: 'solar panel technician', he: 'טכנאי פאנלים סולאריים', ar: 'فني ألواح شمسية', am: 'የፀሐይ ፓነል ቴክኒሻን', ru: 'Техник солнечных панелей', logo: 'engineering', color: '#FFCA28', bookingMode: 'provider_travels' },
  { id: 60, slug: 'insulation-technician', en: 'insulation technician', he: 'טכנאי בידוד', ar: 'فني عزل', am: 'የመከላከያ ቁሳቁስ ቴክኒሻን', ru: 'Специалист по изоляции', logo: 'engineering', color: '#FFA726', bookingMode: 'provider_travels' },
  { id: 61, slug: 'roofer', en: 'roofer', he: 'גגן', ar: 'عامل أسطح', am: 'የጣሪያ ባለሙያ', ru: 'Кровельщик', logo: 'asset:roof', color: '#795548', bookingMode: 'provider_travels' },
  { id: 62, slug: 'carpet-cleaner', en: 'carpet cleaner', he: 'מנקה שטיחים', ar: 'منظف سجاد', am: 'የምንጣፍ ንጽህና ባለሙያ', ru: 'Специалист по чистке ковров', logo: 'engineering', color: '#26A69A', bookingMode: 'provider_travels' },
  { id: 65, slug: 'pool-technician', en: 'pool technician', he: 'טכנאי בריכות', ar: 'فني مسابح', am: 'የመዋኛ ገንዳ ቴክኒሻን', ru: 'Техник бассейнов', logo: 'surfing', color: '#29B6F6', bookingMode: 'provider_travels' },
  { id: 66, slug: 'swimming-instructor', en: 'swimming instructor', he: 'מדריך שחייה', ar: 'مدرب سباحة', am: 'የዋና አስተማሪ', ru: 'Инструктор по плаванию', logo: 'pool', color: '#03A9F4', bookingMode: 'customer_travels' },
  { id: 67, slug: 'driving-instructor', en: 'driving instructor', he: 'מורה נהיגה', ar: 'مدرب قيادة', am: 'የመንዳት አስተማሪ', ru: 'Инструктор по вождению', logo: 'directions_car', color: '#5C6BC0', bookingMode: 'customer_travels' },
  { id: 71, slug: 'babysitter', en: 'babysitter', he: 'בייביסיטר', ar: 'مربية أطفال', am: 'የሕፃናት ጠባቂ', ru: 'Няня', logo: 'child_care', color: '#F06292', bookingMode: 'provider_travels' },
  { id: 72, slug: 'elderly-caregiver', en: 'elderly caregiver', he: 'מטפל בקשישים', ar: 'مقدم رعاية كبار السن', am: 'የአረጋውያን እንክብካቤ ሰጪ', ru: 'Сиделка для пожилых', logo: 'elderly_woman', color: '#9575CD', bookingMode: 'provider_travels' },
  { id: 74, slug: 'dog-trainer', en: 'dog trainer', he: 'מאלף כלבים', ar: 'مدرب كلاب', am: 'የውሻ አሰልጣኝ', ru: 'Кинолог', logo: 'engineering', color: '#A1887F', bookingMode: 'provider_travels' },
  { id: 75, slug: 'pet-groomer', en: 'pet groomer', he: 'ספר חיות מחמד', ar: 'مصفف حيوانات', am: 'የቤት እንስሳት እንክብካቤ ባለሙያ', ru: 'Грумер', logo: 'engineering', color: '#BA68C8', bookingMode: 'customer_travels' },
  { id: 76, slug: 'veterinarian', en: 'veterinarian', he: 'וטרינר', ar: 'طبيب بيطري', am: 'የእንስሳት ሐኪም', ru: 'Ветеринар', logo: 'engineering', color: '#66BB6A', bookingMode: 'customer_travels' },
  { id: 77, slug: 'nutritionist', en: 'nutritionist', he: 'תזונאי', ar: 'أخصائي تغذية', am: 'የአመጋገብ ባለሙያ', ru: 'Диетолог', logo: 'engineering', color: '#8BC34A', bookingMode: 'online' },
  { id: 78, slug: 'physiotherapist', en: 'physiotherapist', he: 'פיזיותרפיסט', ar: 'أخصائي علاج طبيعي', am: 'ፊዚዮቴራፒስት', ru: 'Физиотерапевт', logo: 'engineering', color: '#42A5F5', bookingMode: 'customer_travels' },
  { id: 79, slug: 'massage-therapist', en: 'massage therapist', he: 'מעסה', ar: 'معالج تدليك', am: 'የማሳጅ ባለሙያ', ru: 'Массажист', logo: 'engineering', color: '#D81B60', bookingMode: 'customer_travels' },
  { id: 80, slug: 'psychologist', en: 'psychologist', he: 'פסיכולוג', ar: 'أخصائي نفسي', am: 'ሳይኮሎጂስት', ru: 'Психолог', logo: 'asset:psychologist', color: '#7E57C2', bookingMode: 'online' },
  { id: 81, slug: 'business-consultant', en: 'business consultant', he: 'יועץ עסקי', ar: 'مستشار أعمال', am: 'የንግድ አማካሪ', ru: 'Бизнес-консультант', logo: 'engineering', color: '#5D4037', bookingMode: 'online' },
  { id: 82, slug: 'financial-advisor', en: 'financial advisor', he: 'יועץ פיננסי', ar: 'مستشار مالي', am: 'የፋይናንስ አማካሪ', ru: 'Финансовый консультант', logo: 'currency_exchange', color: '#0F766E', bookingMode: 'online' },
  { id: 83, slug: 'mortgage-advisor', en: 'mortgage advisor', he: 'יועץ משכנתאות', ar: 'مستشار الرهن العقاري', am: 'የቤት ብድር አማካሪ', ru: 'Ипотечный консультант', logo: 'engineering', color: '#26A69A', bookingMode: 'online' },
  { id: 84, slug: 'insurance-agent', en: 'insurance agent', he: 'סוכן ביטוח', ar: 'وكيل تأمين', am: 'የኢንሹራንስ ወኪል', ru: 'Страховой агент', logo: 'engineering', color: '#5C6BC0', bookingMode: 'online' },
  { id: 85, slug: 'real-estate-agent', en: 'real estate agent', he: 'סוכן נדל"ן', ar: 'وكيل عقارات', am: 'የሪል እስቴት ወኪል', ru: 'Агент по недвижимости', logo: 'real_estate_agent', color: '#FF7043', bookingMode: 'provider_travels' },
  { id: 87, slug: 'architect', en: 'architect', he: 'אדריכל', ar: 'مهندس معماري', am: 'አርክቴክት', ru: 'Архитектор', logo: 'engineering', color: '#90A4AE', bookingMode: 'online' },
  { id: 88, slug: 'interior-designer', en: 'interior designer', he: 'מעצב פנים', ar: 'مصمم داخلي', am: 'የውስጥ ንድፍ ባለሙያ', ru: 'Дизайнер интерьера', logo: 'engineering', color: '#AB47BC', bookingMode: 'provider_travels' },
  { id: 89, slug: 'civil-engineer', en: 'civil engineer', he: 'מהנדס אזרחי', ar: 'مهندس مدني', am: 'ሲቪል ኢንጂነር', ru: 'Инженер-строитель', logo: 'engineering', color: '#607D8B', bookingMode: 'online' },
  { id: 92, slug: 'wedding-planner', en: 'wedding planner', he: 'מפיק חתונות', ar: 'منسق حفلات زفاف', am: 'የሰርግ አዘጋጅ', ru: 'Свадебный организатор', logo: 'engineering', color: '#F06292', bookingMode: 'provider_travels' },
  { id: 95, slug: 'nail-technician', en: 'nail technician', he: 'טכנאית ציפורניים', ar: 'فني أظافر', am: 'የጥፍር ቴክኒሻን', ru: 'Мастер маникюра', logo: 'asset:manicure', color: '#F48FB1', bookingMode: 'customer_travels' },
  { id: 96, slug: 'beautician', en: 'beautician', he: 'קוסמטיקאית', ar: 'خبير تجميل', am: 'የውበት ባለሙያ', ru: 'Косметолог', logo: 'asset:skin_care', color: '#BA68C8', bookingMode: 'customer_travels' },
  { id: 97, slug: 'yoga-instructor', en: 'yoga instructor', he: 'מדריך יוגה', ar: 'مدرب يوغا', am: 'የዮጋ አስተማሪ', ru: 'Инструктор йоги', logo: 'engineering', color: '#66BB6A', bookingMode: 'customer_travels' },
  { id: 99, slug: 'video-editor', en: 'video editor', he: 'עורך וידאו', ar: 'محرر فيديو', am: 'የቪዲዮ አርታኢ', ru: 'Видеомонтажёр', logo: 'engineering', color: '#5C6BC0', bookingMode: 'online' },
  { id: 106, slug: 'web-designer', en: 'web designer', he: 'מעצב אתרים', ar: 'مصمم مواقع', am: 'የድር ጣቢያ ንድፍ ባለሙያ', ru: 'Веб-дизайнер', logo: 'engineering', color: '#26A69A', bookingMode: 'online' },
  { id: 111, slug: 'phone-repair-technician', en: 'phone repair technician', he: 'טכנאי תיקון טלפונים', ar: 'مصلح هواتف', am: 'የስልክ ጥገና ቴክኒሻን', ru: 'Мастер по ремонту телефонов', logo: 'asset:repair_services', color: '#26A69A', bookingMode: 'customer_travels' },
  { id: 112, slug: 'computer-repair-technician', en: 'computer repair technician', he: 'טכנאי מחשבים', ar: 'مصلح حواسيب', am: 'የኮምፒዩተር ጥገና ቴክኒሻን', ru: 'Мастер по ремонту компьютеров', logo: 'asset:troubleshooting', color: '#5C6BC0', bookingMode: 'customer_travels' },
  { id: 120, slug: 'photographer', en: 'photographer', he: 'צלם', ar: 'مصور', am: 'ፎቶግራፈር', ru: 'Фотограф', logo: 'camera_alt', color: '#90A4AE', bookingMode: 'provider_travels' },
];

export function getProfessionBySlug(slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  return PROFESSION_CATALOG.find((profession) => profession.slug === normalized) || null;
}

export function getProfessionLabel(profession, locale = 'he') {
  if (!profession) return '';
  return String(profession[locale] || profession.en || '').trim();
}

export function getProfessionSearchTerms(profession) {
  if (!profession) return [];
  return ['en', 'he', 'ar', 'am', 'ru']
    .map((locale) => String(profession[locale] || '').trim())
    .filter(Boolean);
}
