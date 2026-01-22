// =====================
//  קבועים והגדרות
// =====================

// רשימת כתובות מייל של מנהלי המערכת
// כתובות אלו יקבלו התראות במקרה של שגיאות בתהליך האוטומציה
const ADMIN_EMAILS = [
    "nlprog100@gmail.com",
    "8509190@gmail.com"
];
//מערך המכיל את מבנה העמודות בטפסים עבור בדיקת תקינות לפני הכנסת הנתונים ששלא היתה בטעות תזוזה בעמודות
const HEADERS_STUDENTS = ["תאריך יצירה", "מזהה טופס", "שם פרטי", "שם משפחה", "ת.ז.", "ת.לידה", "מוסד לימודים", "כיתה", "עיר", "רחוב", "מספר בית", "שם האב", "ת.ז האב", "טלפון 1", "טלפון 2", "הערות"];
const HEADERS_TOKENS = ["תאריך יצירה", "מזהה טופס", "תעודת זהות אב", "שם האב", "שם משפחה", "תאריך התחלת השיעור", "סניף", "ימי לימוד", "סוג שיעור", "אורך שיעור", "קישור לטוקן", "תוקף", "מספר בנק", "סניף בנק", "מספר חשבון בנק", "סכום", "הערות"];
const HEADERS_SHIBUTZ = ["תאריך יצירה", "מזהה טופס", "שם פרטי", "שם משפחה", "תלמיד", "חונך", "יום בשבוע", "שעת התחלה", "שעת סיום", "תאריך התחלה", "סניף", "מיקום", "שיעור קבוצתי", "שם חונך", "הערות"];

//  מילון תרגום שדות מאנגלית לעברית עבור שליחת שדות באנגלית כפי המצופה מהשרת  
const fieldTranslationMap = {
    "שם פרטי (כפי שמופיע בת.ז)": "studentFirstName",
    "שם משפחה (כפי שמופיע בת.ז)": "lastName",
    "ת.ז.": "studentIdentityDocNumber",
    "ת.לידה לועזי": "birthDateStudent",
    "שם מוסד הלימודים": "nameOfStudyPlace",
    "כיתה": "classGrade",
    "עיר": "city",
    "רחוב": "street",
    "מספר בית (לא מספר דירה)": "streetNumber",
    "שם האב (כפי שמופיע בת.ז)": "parentFirstName",
    "ת.ז אב": "parentIdentityDocNumber",
    "נייד - אב": "phoneMobileMan",
    "נייד - אם": "phoneMobileWoman",
    "האם לתלמיד יש אח שלמד בעבר במסגרת 'ושננתם' ?": "everHaveSiblingsAtOrganization",
};
// שמות גליונות
const SHEETS = Object.freeze({
    STUDENTS: "רישומים",
    TOKENS: "אמצעי תשלום",
    SHIBUTZ: "שיבוצים",
});

// שמות תגיות
const LABELS = Object.freeze({
    DONE: "טופל אוטומציה",
    FAILED: "נכשל אוטומציה",
    SHEET_ADDED: "נוסף לגליון",
    SHEET_ERROR: "שגיאה בעדכון גיליון",
    MANUAL_ASSIGNMENT: "שיבוץ לטיפול ידני",
    MATMIDIM_PENDING: "מתמידים"
});

//משתנה השומר את  שאילתת סינון המיילים הוא מחפש שרשורי המילים שמגיעים מנדרים פלוס שהסוג שלהם הוא טופס רישום תלמיד חדש
// במידה ויש מיילים מנדרים שלא נקראו אך יש להם את אחת התגיות טופל אוטומציה, נכשל אוטומציה נוסף לגליון או שגיאה בעדכון גיליון הם לא ייכנסו למערך המילים לטיפול
const GMAIL_QUERY = [
    'is:unread',
    'from:noreply@nedarimplus.com',
    '"סוג טופס: רישום תלמיד חדש"',
    `-label:"${LABELS.FAILED}"`,
    `-label:"${LABELS.DONE}"`,
    `-label:"${LABELS.SHEET_ERROR}"`,
    `-label:"${LABELS.SHEET_ADDED}"`,
    `-label:"${LABELS.MANUAL_ASSIGNMENT}"`,
    `-label:"${LABELS.MATMIDIM_PENDING}"`
].join(" ");


const MATMIDIM_SHIBUTZ = [
    { day: "שני", start: "19:00", end: "19:45" },
    { day: "רביעי", start: "19:00", end: "19:45" }
];

const MATMIDIM_PAYMENT = {
    daysCount: 2,
    duration: "0:45"
};
// =====================
//  פונקציות עזר
// =====================
//פונקציה לבדיקת כל המיילים עם ההערות ב2 שורות
function findMailsWithMultilineNotes() {

    const query = [
        'from:noreply@nedarimplus.com',
        '"סוג טופס: רישום תלמיד חדש"'
    ].join(" ");

    const threads = GmailApp.search(query);
    const results = [];

    threads.forEach(thread => {
        const msg = thread.getMessages()[0];
        const body = msg.getPlainBody();
        const lines = body.split("\n").map(l => l.trim());

        for (let i = 0; i < lines.length - 1; i++) {
            // מצאנו שורת הערות
            if (lines[i].startsWith("הערות:")) {
                const nextLine = lines[i + 1];

                // השורה הבאה קיימת אבל אין בה :
                if (nextLine && !nextLine.includes(":")) {
                    results.push({
                        subject: msg.getSubject(),
                        snippet: lines[i] + " | " + nextLine
                    });
                }
            }
        }
    });

    // הדפסה ללוג
    if (results.length === 0) {
        console.log("לא נמצאו מיילים עם הערות רב־שורתיות");
    } else {
        console.log("נמצאו מיילים עם הערות רב־שורתיות:");
        results.forEach(r => {
            console.log("נושא:", r.subject);
            console.log("הערות:", r.snippet);
            console.log("-----");
        });
    }
}

// פונקציה השולחת התראת שגיאה לכל המנהלים
// @param {string} subject - נושא המייל
// @param {string} message - תוכן ההודעה
function notifyAdminsOnError(subject, message) {
    ADMIN_EMAILS.forEach(email => {
        MailApp.sendEmail(email, subject, message);
    });
}

/**
 * ממיר תאריך מפורמט DD/MM/YYYY לפורמט ISO (לשרת)
 * תומך גם בשנים מקוצרות (YY) - 50-99 = 1950-1999, 00-49 = 2000-2049
 * @param {string} ddmmyyyy - תאריך בפורמט DD/MM/YYYY או DD/MM/YY
 * @returns {string} תאריך בפורמט ISO
 * @throws {Error} אם התאריך לא תקין
 */
function toIsoDate_(ddmmyyyy) {
    const [day, month, yearStr] = String(ddmmyyyy || "").split("/");
    let year = parseInt(yearStr, 10);
    // אם מדובר בשנה מקוצרת (2 ספרות)
    if (yearStr.length === 2) {
        if (year >= 50) {
            year += 1900; // 50–99 = המאה ה-20
        } else {
            year += 2000; // 00–49 = המאה ה-21
        }
    }
    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime())) {
        throw new Error(`תאריך לא תקין: "${ddmmyyyy}"`);
    }
    return dateObj.toISOString();
}


/**
 * בונה אובייקט JSON לשליחה לשרת על בסיס מילון התרגום
 * ממיר שמות שדות מעברית לאנגלית ומבצע המרות נתונים נדרשות
 * @param {Object} allData - כל הנתונים שחולצו מהמייל
 * @param {Object} translationMap - מילון תרגום עברית→אנגלית
 * @param {string} numberFromSubject - מספר הטופס מהנושא
 * @returns {Object} אובייקט JSON מוכן לשליחה לשרת
 * @throws {Error} אם חסר שדה נדרש
 */
function buildServerJson(allData, translationMap, numberFromSubject) {
    const out = {};

    // מעבר על כל השדות במילון התרגום
    for (const [heb, eng] of Object.entries(translationMap)) {
        // בדיקה שהשדה קיים בנתונים
        if (!allData[heb]) {
            throw new Error(`הנתון "${heb}" לא התקבל עבור מייל מספר : "${numberFromSubject}"`);
        }
        let value = allData[heb];

        // המרות מיוחדות לפי סוג השדה
        //מיורק בנתים עד לתשובה של שרה פכטר
        //  if (eng === "birthDateStudent") {
        //     value = toIsoDate_(value); // המרה לתאריך ISO
        // }
        if (eng === "everHaveSiblingsAtOrganization") {
            // המרת "כן/לא" ל-1/0
            if (value === "כן") value = 1;
            else value = 0;
        }

        out[eng] = value;
    }

    // הוספת מספר הטופס כ-oldID
    out["oldID"] = numberFromSubject;

    // עטיפה בפורמט הנדרש לשרת
    const result = { rowsToInsert: [out] };
    return result;
}

//הפונקציה מקבלת טקסט שמחולק לשורות בצורה של "שם שדה: ערך
//ומחזירה אובייקט מסודר שבו כל שם שדה הוא המפתח וכל מה שאחריו הוא הערך.
// function extractFields(text) {
//     // אם אין טקסט תקין – מחזירים אובייקט ריק
//     if (!text || typeof text !== "string") return {};

//     // פיצול הטקסט לשורות והכנת אובייקט לתוצאות
//     const lines = text.split("\n");
//     const result = {};

//     // המרת כל שורה למפתח וערך והוספה לאובייקט
//     lines.forEach(line => {
//         const [key, ...rest] = line.split(":");
//         if (rest.length > 0) {
//             result[key.trim()] = rest.join(":").trim();
//         }
//     });

//     // החזרת האובייקט עם כל השדות
//     return result;
// }

function extractFields(text) {
    if (!text || typeof text !== "string") return {};

    const lines = text.split("\n");
    const result = {};

    let currentKey = null;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // שדה חדש
        if (line.includes(":")) {
            const [key, ...rest] = line.split(":");
            currentKey = key.trim();
            result[currentKey] = rest.join(":").trim();
        }
        // המשך של השדה הקודם (שורה בלי :)
        else if (currentKey === "הערות") {
            result[currentKey] += "\n" + line;
        }
    });

    return result;
}
function getLessonDuration(data) {
    // חילוץ המחרוזות מתוך האובייקט
    let startStr = data["שעת התחלת השיעור"] || "";
    let endStr = data["שעת סיום השיעור"] || "";

    // פיצול לשעות ודקות
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);

    // בניית Date מלאים
    const start = new Date(0, 0, 0, sh, sm);
    const end = new Date(0, 0, 0, eh, em);

    // חישוב הפרש בדקות
    const diffMinutes = Math.round((end - start) / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    // החזרת מחרוזת H:MM
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
}


const _labelCache = {};
function getOrCreateLabel_(name) {
    if (_labelCache[name]) return _labelCache[name];
    const lbl = GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
    _labelCache[name] = lbl;
    return lbl;
}

function hebDayToFull_(dayStr) {
    const map = {
        "יום א'": "ראשון",
        "יום ב'": "שני",
        "יום ג'": "שלישי",
        "יום ד'": "רביעי",
        "יום ה'": "חמישי"
    };
    return map[dayStr.trim()] || dayStr;
}
// ממפה "סוג שיעור" ל"כן/לא" עבור הגיליון
function groupFlagFromLessonType_(v) {
    const t = String(v || "").trim();
    if (t === "קבוצתי") return "כן";
    if (t === "פרטני") return "לא";
    return ""; // במקרה של ערך לא צפוי – משאיר ריק
}
/** מחזיר מערך כותרות משורת כותרות ידועה (1-based) */
function getHeadersInRow_(sheet, headerRow) {
    if (!Number.isInteger(headerRow) || headerRow < 1) {
        throw new Error(`headerRow לא חוקי: ${headerRow}`);
    }
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    // הורדת ריקים מסוף השורה (לא חובה, אבל נחמד)
    for (let i = headers.length - 1; i >= 0; i--) {
        if (headers[i] !== "" && headers[i] != null) { headers.length = i + 1; break; }
    }
    return headers.map(String);
}

/** מאמת שכותרות תואמות *בדיוק* (שם+סדר) בשורת כותרות נתונה */
function assertExactHeaders(sheet, expectedHeaders, headerRow) {
    const headers = getHeadersInRow_(sheet, headerRow);
    if (headers.length !== expectedHeaders.length) {
        throw new Error(`שגיאת מבנה בגיליון "${sheet.getName()}": ${headers.length} עמודות בפועל ≠ ${expectedHeaders.length} צפוי (שורת כותרות ${headerRow}).`);
    }
    for (let i = 0; i < expectedHeaders.length; i++) {
        if (headers[i].trim() !== expectedHeaders[i].trim()) {
            throw new Error(`שגיאת מבנה "${sheet.getName()}": בעמודה ${i + 1} הכותרת "${headers[i]}", ציפינו ל-"${expectedHeaders[i]}" (שורה ${headerRow}).`);
        }
    }
    return true;
}

/** כתיבה לפי שמות עמודות: בונה שורה לפי expectedHeaders וכותב */
function setRowByHeaderNames(sheet, objByHeader, expectedHeaders) {
    const row = expectedHeaders.map(h => objByHeader[h] ?? "");
    sheet.appendRow(row);
}


function handleAllSheets(sheetStudents, sheetTokens, sheetShibutz, data, cleanedBody, numberFromSubject, headerRowStudents, headerRowTokens, headerRowShibutz, isMatmidim, mailDate) {
    try {
        assertExactHeaders(sheetStudents, HEADERS_STUDENTS, headerRowStudents);
        assertExactHeaders(sheetTokens, HEADERS_TOKENS, headerRowTokens);
        assertExactHeaders(sheetShibutz, HEADERS_SHIBUTZ, headerRowShibutz);

        // בניית שורה לרישומים
        const studentRow = [
            new Date(),
            numberFromSubject,
            data["שם פרטי (כפי שמופיע בת.ז)"],
            data["שם משפחה (כפי שמופיע בת.ז)"],
            data["ת.ז."],
            data["ת.לידה לועזי"],
            data["שם מוסד הלימודים"],
            data["כיתה"],
            data["עיר"],
            data["רחוב"],
            data["מספר בית (לא מספר דירה)"],
            data["שם האב (כפי שמופיע בת.ז)"],
            data["ת.ז אב"],
            data["נייד - אב"],
            data["נייד - אם"],
            isMatmidim
                ? (data["הערות"] ? data["הערות"] + " | " : "") + "שיבוץ אוטומטי תוכנית מתמידים"
                : (data["הערות"] || "")

        ];
        const requiredStudentRow = studentRow.slice(0, -1);
        if (!requiredStudentRow.every(v => v && v !== "")) {
            notifyAdminsOnError(
                `כשל ברישומים | נושא: ${numberFromSubject}`,
                "חסרים נתונים בשורת 'רישומים'"
            );
            return false;
        }
        // בניית שורה לאמצעי תשלום
        const tokenMatch = (cleanedBody.match(/https:\/\/matara\.pro\/nedarimplus\/forms\/manage\.aspx\?[^>\s"']+/i) || [""])[0];
        const tokenUrl = tokenMatch ? tokenMatch[0] : "";
        const days = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'"];
        let markedDaysCount;

        if (isMatmidim) {
            markedDaysCount = MATMIDIM_PAYMENT.daysCount;
        }
        else {
            markedDaysCount = 0;

            for (const day of days) {
                const fieldName = `חדש - ${day}`;
                if ((data[fieldName] || "").includes("מסומן")) {
                    markedDaysCount++;
                }
            }
        }

        const duration = isMatmidim
            ? MATMIDIM_PAYMENT.duration
            : getLessonDuration(data);


        console.log(tokenMatch)
        console.log(data["תוקף (לדוגמא 0223)"] || "")
        const tokenRow = [new Date(),
            numberFromSubject,
        data["ת.ז אב"],
        data["שם האב (כפי שמופיע בת.ז)"],
        data["שם משפחה (כפי שמופיע בת.ז)"],
        isMatmidim
            ? Utilities.formatDate(mailDate, Session.getScriptTimeZone(), "dd/MM/yyyy")
            : data["תאריך השיעור הראשון"],
        data["סניף - אחר"] || data["סניף"],
            markedDaysCount,
        isMatmidim ? "קבוצתי" : data["סוג שיעור"],
            duration,
            tokenMatch,
        data["תוקף (לדוגמא 0223)"] || "",
        data["מספר בנק"] || "",
        data["מספר סניף"] || "",
        data["מספר חשבון"] || "",
        data["מחיר חודשי"] || "",
        isMatmidim
            ? (data["הערות"] ? data["הערות"] + " | " : "") + "שיבוץ אוטומטי תוכנית מתמידים"
            : (data["הערות"] || "")
        ];


        // בניית שורות לשיבוצים
        const shibutzRows = [];
        if (isMatmidim) {
            MATMIDIM_SHIBUTZ.forEach(cfg => {
                shibutzRows.push([
                    new Date(),
                    numberFromSubject,
                    data["שם פרטי (כפי שמופיע בת.ז)"],
                    data["שם משפחה (כפי שמופיע בת.ז)"],
                    data["ת.ז."],
                    "021974720",
                    cfg.day,
                    cfg.start,
                    cfg.end,
                    Utilities.formatDate(mailDate, Session.getScriptTimeZone(), "dd/MM/yyyy"),
                    data["סניף - אחר"] || data["סניף"],
                    data["מיקום הלימוד"] || "",
                    "כן",
                    "נפתלי ליבמן",
                    (data["הערות"] ? data["הערות"] + " | " : "") + "שיבוץ אוטומטי תוכנית מתמידים"
                ]);
            });
        }
        else {
            // 🔹 שיבוצים רגילים מהטופס
            const days = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'"];

            for (let day of days) {
                const fieldName = `חדש - ${day}`;
                if ((data[fieldName] || "").includes("מסומן")) {
                    const fullDay = hebDayToFull_(day);
                    shibutzRows.push([
                        new Date(),
                        numberFromSubject,
                        data["שם פרטי (כפי שמופיע בת.ז)"],
                        data["שם משפחה (כפי שמופיע בת.ז)"],
                        data["ת.ז."],
                        data["מספר זהות חונך"],
                        fullDay,
                        data["שעת התחלת השיעור"],
                        data["שעת סיום השיעור"],
                        data["תאריך השיעור הראשון"],
                        data["סניף - אחר"] || data["סניף"],
                        data["מיקום הלימוד"] || "",
                        groupFlagFromLessonType_(data["סוג שיעור"]),
                        data["שם חונך"],
                        isMatmidim
                            ? (data["הערות"] ? data["הערות"] + " | " : "") + "שיבוץ אוטומטי תוכנית מתמידים"
                            : (data["הערות"] || "")
                    ]);
                }
            }
        }


        if (shibutzRows.length === 0) {
            notifyAdminsOnError(
                `כשל בשיבוצים | נושא: ${numberFromSubject}`,
                "לא סומן אף יום לשיבוץ"
            );
            return false; // אין שיבוצים
        }

        // אם כל הבדיקות עברו — כותבים בפועל
        sheetStudents.appendRow(studentRow);
        sheetTokens.appendRow(tokenRow);
        shibutzRows.forEach(row => sheetShibutz.appendRow(row));

        return true;
    }
    catch (err) {
        notifyAdminsOnError(
            `שגיאה ב-handleAllSheets | נושא: ${numberFromSubject}`,
            String(err && err.message ? err.message : err)
        );
        return false;
    }
}

function sendToServer(serverJson) {
    const options = {
        method: 'post',
        contentType: 'application/json; charset=utf-8',
        payload: JSON.stringify(serverJson)
    };

    const resp = UrlFetchApp.fetch('https://tests.matarah.com/api/system/GeneralWebhookForThirdParty/B60E84FD-024B-4679-8EB7-D3A05C1345F9/60955AC9-ACB9-4178-A24E-61FED33D9EA9', options);
    console.log(resp.getResponseCode());
    if (resp.getResponseCode() !== 200) {
        throw new Error("POST נכשל: " + resp.getContentText());
    }

    return resp.getContentText();
}



// =====================
//  פונקציה ראשית
// =====================

function processNewStudentRegistrations() {

    // כאן אנחנו מתחברים לקובץ הגיליון שבו נשמרים כל הנתונים המחולצים מהמיילים 
    // עבור העלאת הנתונים שלא נשלחים לתוכנה באוטומציה ומעודכנים ידנית ע"י המזכירות
    // וכן עבור תעוד
    //רישומים – פרטי התלמידים
    // אמצעי תשלום
    // שיבוצים" – שיבוץ חונכים לתלמידים.
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetStudents = spreadsheet.getSheetByName(SHEETS.STUDENTS);
    const sheetTokens = spreadsheet.getSheetByName(SHEETS.TOKENS);
    const sheetShibutz = spreadsheet.getSheetByName(SHEETS.SHIBUTZ);
    // בדיקה אם כל הגיליונות קיימים
    if (!sheetStudents || !sheetTokens || !sheetShibutz) {
        //אם אחד הגליונות לא קיימים נשלחת התראה למנהלים ונזרקת שגיאה
        const errorMsg = "אחד מהגיליונות לא נמצא";
        notifyAdminsOnError("שגיאה באוטומציית רישום תלמיד", errorMsg);
        throw new Error(errorMsg);
    }

    //GMAIL_QUERY משתנה המכיל את המיילים הנדרשים לטיפול לפי הסינון המוגדר ב
    const threads = GmailApp.search(GMAIL_QUERY);
    // עובר על כל מייל,,
    // מפרק את תוכן ההודעות לשדות נתונים,
    // יוצר אובייקט JSON 
    // ומבצע שליחה לשרת לצורך יצירת הרשומות בתוכנה,
    // לאחר מכן מוסיף את שאר הנתונים לגליונות המתאימים
    threads.forEach(thread => {
        //בכל פעם מתיחסים להודעה הראשונה בשרשור
        const message = thread.getMessages()[0];
        const mailDate = message.getDate();

        let didServer = false;
        let didSheets = false;

        try {
            //ניתוח הנתונים מתוך המייל בצורה נקייה
            let body = message.getPlainBody();
            const cleanedBody = body.replace(/\*/g, "");
            //משתנה הבודק האם מדובר בטופס רישום למתמידים
            const isMatmidim = cleanedBody.includes("תוכנית מתמידים");
            //שליחה לפונקציה היוצרת אוביקט  בצורה של מפתח וערך מהנתונים במייל 
            const data = extractFields(cleanedBody);

            const subject = message.getSubject();
            const numberFromSubject = subject.match(/#(\d+)/)[1];
            console.log(numberFromSubject);
            const serverJson = buildServerJson(data, fieldTranslationMap, numberFromSubject);
            console.log(serverJson);
            try {
                const serverRes = sendToServer(serverJson);
                console.log(serverRes);
                didServer = true;
                getOrCreateLabel_(LABELS.DONE).addToThread(thread);
            }
            catch (ex) {
                // כל כשל לפני/במהלך שליחת ה־POST נחשב "נכשל אוטומציה"
                throw new Error("שליחת POST לשרת נכשלה: " + ex.message);
            }

            didSheets = handleAllSheets(sheetStudents, sheetTokens, sheetShibutz, data, cleanedBody, numberFromSubject, 1, 1, 2, isMatmidim, mailDate);

            if (didSheets) {
                getOrCreateLabel_(LABELS.SHEET_ADDED).addToThread(thread);
            }
            else {
                getOrCreateLabel_(LABELS.SHEET_ERROR).addToThread(thread);
            }
            if (didServer && didSheets) {
                thread.markRead(); // או message.markRead() אם רוצים רק את ההודעה הראשונה
            }

        }
        catch (e) {
            // רק כשל שלב השרת (או שגיאה "גלובלית") מגיע לכאן
            getOrCreateLabel_(LABELS.FAILED).addToThread(thread);
            notifyAdminsOnError(
                "שגיאה באוטומציית רישום תלמיד",
                "התרחשה שגיאה:\n" + e.message + "\n\nStack:\n" + (e.stack || "")
            );
        }

    });
}

