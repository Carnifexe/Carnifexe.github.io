// ====================
// JSONBin.io Integration
// ====================
const BIN_ID = "67ef04308960c979a57dd947"; // Ihre Bin-ID
const API_KEY = "$2a$10$PjvkvbfgvbIXst5Vbl2Rs./DHygpPWmtyBFdp2iaBVLd1lSghoq62"; // Ihr API-Key

// Statistik zum Server senden
async function addFine(offenseName, period = "day") {
    try {
        // Aktuelle Statistik laden
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { "X-Master-Key": API_KEY }
        });
        const data = await response.json();
        let stats = data.record || {
            day: {}, week: {}, month: {}, year: {}, allTime: {},
            lastUpdated: new Date().toISOString()
        };

        // Statistik aktualisieren
        stats[period][offenseName] = (stats[period][offenseName] || 0) + 1;
        stats.allTime[offenseName] = (stats.allTime[offenseName] || 0) + 1;
        stats.lastUpdated = new Date().toISOString();

        // Aktualisierte Statistik speichern
        await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json",
                "X-Master-Key": API_KEY 
            },
            body: JSON.stringify(stats)
        });
    } catch (error) {
        console.error("Fehler beim Speichern der Statistik:", error);
    }
}

// ====================
// Angepasste saveSelectedFines()
// ====================
async function saveSelectedFines() {
    const fineCollection = document.querySelectorAll(".selected");
    
    for (let i = 0; i < fineCollection.length; i++) {
        const fineText = fineCollection[i].querySelector(".fineText").innerHTML.includes("<i>") 
            ? fineCollection[i].querySelector(".fineText").innerHTML.split("<i>")[0]
            : fineCollection[i].querySelector(".fineText").innerHTML;
        
        await addFine(fineText.trim(), "day");
    }
}

// Speichern der ausgewählten Strafen
let selectedFines = [];

// Diese Funktion wird verwendet, um eine Strafe auszuwählen und die Daten zu speichern.
function selectFine(row) {
    const paragraph = row.querySelector('.paragraph').textContent.trim();
    const fineText = row.querySelector('.fineText').textContent.trim();
    const wantedAmount = row.querySelector('.wantedAmount').textContent.trim();
    const fineAmount = row.querySelector('.fineAmount').textContent.trim();

    // Füge die ausgewählte Strafe zur Liste hinzu
    selectedFines.push({
        paragraph: paragraph,
        fineText: fineText,
        wantedAmount: wantedAmount,
        fineAmount: fineAmount
    });

    console.log("Strafe ausgewählt:", paragraph, fineText, wantedAmount, fineAmount);
}

// Deine copyText Funktion anpassen
function copyText(event) {
    const now = Date.now();
    
    // Cooldown prüfen
    if (now - lastCopyTime < COPY_COOLDOWN) {
        showCooldownMessage(COPY_COOLDOWN - (now - lastCopyTime));
        return;
    }

    // Cooldown setzen
    lastCopyTime = now;

    const target = event.currentTarget;
    const textToCopy = target.textContent || target.innerText;
    const successMessage = target.getAttribute("data-success-message") || "Text kopiert!";

    const successSound = new Audio('copy.mp3');

    navigator.clipboard.writeText(textToCopy.trim())
        .then(() => {
            successSound.play().catch(e => console.log("Ton fehlgeschlagen:", e));
            
            // Erfolgsmeldung anzeigen
            showSuccessNotification(successMessage);
            
            // Wenn der kopierte Text der Grund ist, speichern wir die Strafen in der Statistik
            if (target.closest('#reasonResult')) {
                saveSelectedFines();  // Speichern der Strafen
            }
        })
        .catch(err => {
            console.error("Kopieren fehlgeschlagen:", err);
            // Bei Fehler Cooldown zurücksetzen
            lastCopyTime = 0;
        });
}

// Funktion, um die ausgewählten Strafen an JSONBin zu senden
async function saveSelectedFines() {
    // Überprüfen, ob es ausgewählte Strafen gibt
    if (selectedFines.length === 0) {
        console.log("Keine Strafen ausgewählt.");
        return;
    }

    // JSON-Format für die zu sendenden Daten
    const finesData = selectedFines.map(fine => ({
        paragraph: fine.paragraph,
        fineText: fine.fineText,
        wantedAmount: fine.wantedAmount,
        fineAmount: fine.fineAmount
    }));

    // URL und API-Key für JSONBin
    const apiUrl = "https://api.jsonbin.io/v3/b/DEIN_BIN_ID";  // Ersetze DEIN_BIN_ID mit deinem JSONBin-ID
    const apiKey = "DEIN_API_KEY";  // Ersetze DEIN_API_KEY mit deinem JSONBin API-Schlüssel

    try {
        const response = await fetch(apiUrl, {
            method: 'PUT',  // Oder 'POST' je nach Wunsch
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': apiKey,
            },
            body: JSON.stringify(finesData),
        });

        if (response.ok) {
            console.log("Strafen erfolgreich an JSONBin gesendet!");
            selectedFines = [];  // Nach dem Senden, die ausgewählten Strafen zurücksetzen
        } else {
            console.error("Fehler beim Hochladen der Strafen:", await response.text());
        }
    } catch (error) {
        console.error("Fehler bei der Kommunikation mit JSONBin:", error);
    }
}

// EventListener für die Strafen-Auswahl in der Tabelle
document.querySelectorAll('.fine-row').forEach(row => {
    row.addEventListener('click', () => {
        selectFine(row);  // Beim Klicken auf eine Zeile wird die Strafe ausgewählt
    });
});

// ====================
// Automatische Statistik-Aktualisierung
// ====================
setInterval(async () => {
    // Aktualisiere die angezeigte Statistik alle 5 Minuten
    if (document.querySelector('.timeframe-btn.active')) {
        const activePeriod = document.querySelector('.timeframe-btn.active').onclick.name.slice(11);
        await updateChart(activePeriod);
    }
}, 300000); // 300000ms = 5 Minuten

// ====================
// Bestehender Code (unverändert)
// ====================
function searchFine() {
    let searchFor = document.getElementById("searchbar_input").value.toLocaleLowerCase();
    
    let fines = document.querySelectorAll(".fine");
    for (var i = 0; i < fines.length; i++) {
        if (fines[i].querySelectorAll(".fineText")[0].innerHTML.toLocaleLowerCase().includes(searchFor)) {
            fines[i].classList.add("showing");
            fines[i].classList.remove("hiding");
        } else {
            fines[i].classList.remove("showing");
            fines[i].classList.add("hiding");
        }
    }

    // Suche wurde ausgelöst, fixedCategory divs ausblenden
    let categories = document.querySelectorAll(".fixedCategory");
    if (searchFor !== "") {
        categories.forEach(function(category) {
            category.style.display = "none";
        });
    } else {
        // Wenn keine Suche, zeige die Kategorien wieder
        categories.forEach(function(category) {
            category.style.display = "block";
        });
    }
}

// Funktion zum Speichern der ausgewählten Strafen im localStorage
async function saveSelectedFines() {
    let fineCollection = document.querySelectorAll(".selected");
    
    // Lokale Stats laden oder neu erstellen
    let stats = JSON.parse(localStorage.getItem('fineStats')) || {
        day: {},
        week: {},
        month: {},
        year: {},
        allTime: {},
        lastUpdated: new Date().toISOString()
    };

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisWeek = getWeekNumber(now);
    const thisMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
    const thisYear = now.getFullYear().toString();

    const incrementCounter = (period, key) => {
        if (!stats[period][key]) {
            stats[period][key] = 0;
        }
        stats[period][key]++;
    };

    for (let i = 0; i < fineCollection.length; i++) {
        const fineText = fineCollection[i].querySelector(".fineText").innerHTML.includes("<i>")
            ? fineCollection[i].querySelector(".fineText").innerHTML.split("<i>")[0]
            : fineCollection[i].querySelector(".fineText").innerHTML;
        const trimmedText = fineText.trim();

        incrementCounter('allTime', trimmedText);
        incrementCounter('year', trimmedText);
        incrementCounter('month', trimmedText);
        incrementCounter('week', trimmedText + thisWeek);
        incrementCounter('day', trimmedText + today);
    }

    stats.lastUpdated = now.toISOString();

    // 1. Lokal speichern
    localStorage.setItem('fineStats', JSON.stringify(stats));

    // 2. In der Cloud speichern (jsonbin.io)
    try {
        await saveStats(stats); // ⬅️ Hier wird an dein Backend gesendet
        console.log("Statistik erfolgreich in der Cloud gespeichert.");
    } catch (err) {
        console.error("Fehler beim Speichern in die Cloud:", err);
    }
}

// Hilfsfunktion zur Berechnung der Kalenderwoche
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return d.getFullYear() + '-' + 
           Math.round(((d - week1) / 86400000 + (week1.getDay() + 6) % 7 - 3) / 7 + 1);
}

function selectFine(event) {
    let element = event.target;

    // Verhindere das Auswählen von Font-Tags
    if (element.tagName == "FONT") return;

    // Wenn der Klick auf eine Table-Data-Zelle (TD) war, gehe zum Elternelement (die Zeile)
    if (element.tagName == "TD") element = element.parentElement;

    // Wenn der Klick auf ein I-Tag war, gehe zum Elternelement der Zeile
    if (element.tagName == "I") element = element.parentElement.parentElement;

    // Überprüfe, ob "Ammu Rob" oder "Terror" bereits ausgewählt ist
    const isAmmuRobSelected = document.querySelector('.fine[data-fine="ammuRob"].selected');
    const isTerrorSelected = document.querySelector('.fine[data-fine="terror"].selected');

    // Wenn "Ammu Rob" oder "Terror" markiert ist, verhindere das Markieren anderer Zeilen
    if (isAmmuRobSelected || isTerrorSelected) {
        if (element.dataset.fine !== "ammuRob" && element.dataset.fine !== "terror") return; // Anderen Zeilen das Markieren verweigern
    }

    // Wenn der geklickte Eintrag "Ammu Rob" ist, toggle die "selected"-Klasse
    if (element.dataset.fine === "ammuRob") {
        // Toggle "selected" für Ammu Rob
        element.classList.toggle("selected");

        // Wenn Ammu Rob ausgewählt wird, entferne die Auswahl von allen anderen
        if (element.classList.contains("selected")) {
            let allRows = document.querySelectorAll('.fine');
            for (var i = 0; i < allRows.length; i++) {
                // Alle anderen Zeilen abwählen, wenn Ammu Rob ausgewählt wird
                if (allRows[i].dataset.fine !== "ammuRob") {
                    allRows[i].classList.remove('selected');
                    // Extra-Wanteds entfernen
                    const extraWanteds = allRows[i].querySelectorAll('.selected_extrawanted');
                    extraWanteds.forEach(extra => extra.classList.remove('selected_extrawanted'));
                }
            }
        }

        // Zeige eine Benachrichtigung, wenn Ammu Rob aktiviert wird
        showNotification('Shop/Amu Rob deckt alle Strafen ab, wurde aktiviert!');
    } 
    // Wenn der geklickte Eintrag "Terror" ist, toggle die "selected"-Klasse
    else if (element.dataset.fine === "terror") {
        // Toggle "selected" für Terror
        element.classList.toggle("selected");

        // Wenn Terror ausgewählt wird, entferne die Auswahl von allen anderen
        if (element.classList.contains("selected")) {
            let allRows = document.querySelectorAll('.fine');
            for (var i = 0; i < allRows.length; i++) {
                // Alle anderen Zeilen abwählen, wenn Terror ausgewählt wird
                if (allRows[i].dataset.fine !== "terror") {
                    allRows[i].classList.remove('selected');
                    // Extra-Wanteds entfernen
                    const extraWanteds = allRows[i].querySelectorAll('.selected_extrawanted');
                    extraWanteds.forEach(extra => extra.classList.remove('selected_extrawanted'));
                }
            }
        }

        // Zeige eine Benachrichtigung, wenn Terror aktiviert wird
        showNotification('Terror deckt alle Strafen ab, wurde aktiviert!');
    } else {
        // Bei allen anderen Einträgen: Toggle die "selected"-Klasse
        const wasSelected = element.classList.contains("selected");
        element.classList.toggle("selected");

        // Wenn die Strafe abgewählt wird, entferne auch alle Extra-Wanteds
        if (wasSelected && !element.classList.contains("selected")) {
            const extraWanteds = element.querySelectorAll('.selected_extrawanted');
            extraWanteds.forEach(extra => extra.classList.remove('selected_extrawanted'));
        }
    }

    // Berechne den Gesamtwert (oder starte eine andere Funktion)
    startCalculating();
}

document.querySelectorAll(".fine").forEach(fine => {
    fine.addEventListener("click", function() {
        this.classList.toggle("selected");
        showSelectedFinesTable();
    });
});

// Funktion zum Anzeigen der Benachrichtigung
function showNotification(message) {
    const notification = document.getElementById('notification');
    
    // Setze die Nachricht in der Benachrichtigung
    notification.textContent = message;

    // Mache die Benachrichtigung sichtbar
    notification.style.display = 'block';

    // Setze die Opazität auf 1, damit sie eingeblendet wird
    setTimeout(function() {
        notification.style.opacity = 1;
    }, 10); // Kurz nach dem Anzeigen wird die Opazität verändert

    // Verstecke die Benachrichtigung nach 3 Sekunden (3000ms)
    setTimeout(function() {
        notification.style.opacity = 0;
        // Verstecke die Benachrichtigung nach dem Ausblenden
        setTimeout(function() {
            notification.style.display = 'none';
        }, 500); // 500ms nach dem Ausblenden
    }, 3000);
}

// Modifizierte copyText Funktion
function copyText(event) {
    const now = Date.now();
    
    // Cooldown prüfen
    if (now - lastCopyTime < COPY_COOLDOWN) {
        showCooldownMessage(COPY_COOLDOWN - (now - lastCopyTime));
        return;
    }

    // Cooldown setzen
    lastCopyTime = now;

    const target = event.currentTarget;
    const textToCopy = target.textContent || target.innerText;
    const successMessage = target.getAttribute("data-success-message") || "Text kopiert!";

    const successSound = new Audio('copy.mp3');

    navigator.clipboard.writeText(textToCopy.trim())
        .then(() => {
            successSound.play().catch(e => console.log("Ton fehlgeschlagen:", e));
            
            // Erfolgsmeldung anzeigen
            showSuccessNotification(successMessage);
            
            // Wenn der kopierte Text der Grund ist, Statistik speichern
            if (target.closest('#reasonResult')) {
                saveSelectedFines();
            }
        })
        .catch(err => {
            console.error("Kopieren fehlgeschlagen:", err);
            // Bei Fehler Cooldown zurücksetzen
            lastCopyTime = 0;
        });
}

function startCalculating() {
    document.getElementById("finesListTable").innerHTML = `<tr>
                    <th style="width: 80%;">Grund für die Geldstrafe</th>
                    <th style="width: 20%;">Bußgeld</th>
                </tr>`
    let isWiederholungstäter = document.getElementById("wiederholungstäter_box").checked;
    let fineResult = document.getElementById("fineResult")
    let fineAmount = 0
    
    let wantedResult = document.getElementById("wantedsResult")
    let wantedAmount = 0
    
    let characterResult = document.getElementById("charactersResult")
    
    let reasonResult = document.getElementById("reasonResult")
    let reasonText = ""
    let plate = document.getElementById("plateInput_input").value
    let blitzerort = document.getElementById("blitzerInput_input").value
    let systemwanteds = document.getElementById("systemwantedsInput_input").value
    
    let infoResult = document.getElementById("infoResult")
    let noticeText = ""
    let removeWeaponLicense = false
    let removeDriverLicense = false

    let tvübergabe_org = document.getElementById("übergabeInput_select").value
    let tvübergabe_name = document.getElementById("übergabeInput_input").value

    let shortMode = false
    if (document.getElementById("checkbox_box").checked) shortMode = true

    let fineCollection = document.querySelectorAll(".selected")
    let fineCollectionWantedAmount = []
    let fineCollectionFineAmount = []

    for (var i = 0; i < fineCollection.length; i++) { 
        let paragraphText = fineCollection[i].querySelector(".paragraph").innerText;
        let isStVO = paragraphText.includes("StVO");

        let cache_wanted_amount = parseInt(fineCollection[i].querySelector(".wantedAmount").getAttribute("data-wantedamount")) || 0;
        let cache_fine_amount = parseInt(fineCollection[i].querySelector(".fineAmount").getAttribute("data-fineamount")) || 0;
        
        // Extra-Wanted Strafen berechnen
        let extrafines_amount = 0;
        let extrawanteds_found = fineCollection[i].querySelector(".wantedAmount").querySelectorAll(".selected_extrawanted");
        
        for (let b = 0; b < extrawanteds_found.length; b++) {
            let addedFine = parseInt(extrawanteds_found[b].getAttribute("data-addedfine")) || 0;
            extrafines_amount += addedFine;
        }

        if (isWiederholungstäter && isStVO) {
            cache_fine_amount = (cache_fine_amount + extrafines_amount) * 2; // Beides verdoppeln
            cache_wanted_amount = (cache_wanted_amount + extrawanteds_found.length) * 2;
        } else {
            cache_fine_amount += extrafines_amount; // Extra-Strafen hinzufügen
            cache_wanted_amount += extrawanteds_found.length;
        }

        if (cache_fine_amount > 50000) cache_fine_amount = 50000;
        if (cache_wanted_amount > 5) cache_wanted_amount = 5;

        fineCollectionWantedAmount.push(cache_wanted_amount);
        fineCollectionFineAmount.push(cache_fine_amount);
    }

    console.log(fineCollectionWantedAmount);
    let maxWanted = fineCollectionWantedAmount[0]; // initialize to the first value

    for (let i = 1; i < fineCollectionWantedAmount.length; i++) {
        if (fineCollectionWantedAmount[i] > maxWanted) {
            maxWanted = fineCollectionWantedAmount[i];
        }
    }

    // Beide Arrays zusammen betrachten, um das passende Bußgeld zum höchsten Wanted-Level zu ermitteln
    let maxIndex = 0; // Index des höchsten Strafmaßes

    for (let i = 1; i < fineCollectionWantedAmount.length; i++) {
        if (fineCollectionWantedAmount[i] > fineCollectionWantedAmount[maxIndex]) {
            maxIndex = i; // Aktualisiere den Index des höchsten Wanted-Levels
        }
    }

    // Setze das Strafmaß und das zugehörige Bußgeld
    wantedAmount = fineCollectionWantedAmount[maxIndex];
    fineAmount = fineCollectionFineAmount[maxIndex];

    // Fallback, falls keine Werte gefunden werden
    if (wantedAmount === undefined) wantedAmount = 0;
    if (fineAmount === undefined) fineAmount = 0;
    if (wantedAmount === 0) {
        fineAmount = fineCollectionFineAmount.length > 0 ? Math.max(...fineCollectionFineAmount) : 0;
    }
        
    // Durch alle ausgewählten Strafen iterieren
    for (let i = 0; i < fineCollectionWantedAmount.length; i++) {
        if (fineCollectionWantedAmount[i] > wantedAmount) {
            // Höchste Wanteds gefunden -> Geldstrafe speichern
            wantedAmount = fineCollectionWantedAmount[i];
            fineAmount = fineCollectionFineAmount[i];
        } else if (fineCollectionWantedAmount[i] === wantedAmount) {
            // Falls die Wanteds gleich sind, die höhere Geldstrafe nehmen
            if (fineCollectionFineAmount[i] > fineAmount) {
                fineAmount = fineCollectionFineAmount[i];
            }
        }
    }

    // Fallback, falls keine Strafen ausgewählt wurden
    if (fineCollectionWantedAmount.length === 0) {
        wantedAmount = 0;
        fineAmount = 0;
    }
        
    console.log("Höchstes Strafmaß:", wantedAmount);
    console.log("Zugehöriges Bußgeld:", fineAmount);

    for (var i = 0; i < fineCollection.length; i++) {
        let extrawanteds_found = fineCollection[i].querySelector(".wantedAmount").querySelectorAll(".selected_extrawanted")
        let extrafines_amount = 0;
        for (let b = 0; b < extrawanteds_found.length; b++) {
            extrafines_amount = extrafines_amount + parseInt(extrawanteds_found[b].getAttribute("data-addedfine"));
        }

        // Funktion, um die aktuelle Zeit für Berlin zu bekommen
        function getCurrentTime() {
            const germanyOffset = new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" });
            const germany = new Date(germanyOffset);

            let hour = String(germany.getHours()).padStart(2, '0');
            let minute = String(germany.getMinutes()).padStart(2, '0');
            let day = String(germany.getDate()).padStart(2, '0');
            let month = String(germany.getMonth() + 1).padStart(2, '0');

            return { day, month, hour, minute };
        }

        const { day, month, hour, minute } = getCurrentTime();

        let fineText = fineCollection[i].querySelector(".fineText").innerHTML.includes("<i>") 
            ? fineCollection[i].querySelector(".fineText").innerHTML.split("<i>")[0]
            : fineCollection[i].querySelector(".fineText").innerHTML;

        // Berechnung für reasonText
        if (shortMode) {
            reasonText = reasonText ? 
                `${reasonText} + ${fineCollection[i].querySelector(".paragraph").hasAttribute("data-paragraphAddition") ? fineCollection[i].querySelector(".paragraph").getAttribute("data-paragraphAddition") + " " : ""}${fineCollection[i].querySelector(".paragraph").innerHTML}` 
                : `${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").hasAttribute("data-paragraphAddition") ? fineCollection[i].querySelector(".paragraph").getAttribute("data-paragraphAddition") + " " : ""}${fineCollection[i].querySelector(".paragraph").innerHTML}`;
        } else {
            reasonText = reasonText ? 
                `${reasonText} + ${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").innerHTML} - ${fineText}` 
                : `${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").innerHTML} - ${fineText}`;
        }

        // Verarbeiten von extraFines und hinzufügen zu list
        if (fineCollection[i].getAttribute("data-removedriverlicence") == "true") removeDriverLicense = true;
        if (fineCollection[i].getAttribute("data-removeweaponlicence") == "true") removeWeaponLicense = true;

        if (fineCollection[i].classList.contains("addPlateInList")) {
            document.getElementById("finesListTable").innerHTML +=
            `
            <tr class="finesList_fine">
                <td onclick="JavaScript:copyText(event)">${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").innerHTML} - ${fineText}${plate !== "" ? " - " + plate.toLocaleUpperCase() : ""}${blitzerort !== "" ? " - " + blitzerort : ""}</td>
                <td>$${parseInt(fineCollection[i].querySelector(".fineAmount").getAttribute("data-fineamount")) + extrafines_amount}</td>
            </tr>
            `;
        } else {
            document.getElementById("finesListTable").innerHTML +=
            `
            <tr class="finesList_fine">
                <td onclick="JavaScript:copyText(event)">${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").innerHTML} - ${fineText}</td>
                <td>$${parseInt(fineCollection[i].querySelector(".fineAmount").getAttribute("data-fineamount")) + extrafines_amount}</td>
            </tr>
            `;
        }
    }

    if (document.getElementById("reue_box").checked && wantedAmount !== 0) { // Means "reue" is active
        wantedAmount = wantedAmount - 2
        if (wantedAmount < 1) wantedAmount = 1
    }
    document.getElementById("wiederholungstäter_box").addEventListener("change", startCalculating);

    if (plate != "") {
        reasonText += ` - ${plate.toLocaleUpperCase()}`
    }

    if (blitzerort != "") {
        reasonText += ` - ${blitzerort}`
    }

    if (document.getElementById("reue_box").checked) {
        reasonText += ` - StGB §35`
    }
    if (document.getElementById("wiederholungstäter_box").checked) {
        reasonText += ` - StVO §25`
    }
    if (document.getElementById("systemfehler_box").checked) {
        reasonText += ` - Systemfehler`
    }
    if (systemwanteds != "") {
        reasonText += ` + ${systemwanteds} Systemwanteds`
        if (systemwanteds > 5) systemwanteds = 5
    }

    if (!isNaN(systemwanteds) && systemwanteds !== "") {
        if (wantedAmount > 5) wantedAmount = 5
    }

    if (removeDriverLicense) {
        noticeText = "Führerschein entziehen"
    }
    if (removeWeaponLicense) {
        if (noticeText =="") {
            noticeText = "Waffenschein entziehen"
        } else {
            noticeText = noticeText + " + Waffenschein entziehen"
        }
    }

    if (tvübergabe_org !== "none" && tvübergabe_name !== "") {
        reasonText += ` - @${tvübergabe_org.toLocaleUpperCase()} ${tvübergabe_name}`
    }

    infoResult.innerHTML = `<b>Information:</b> ${noticeText}`
    fineResult.innerHTML = `<b>Geldstrafe:</b> $<font style="user-select: all;" onclick="copyText(event)"data-success-message="Der Geldbetrag wurde kopiert!">${fineAmount}</font>`;
    wantedResult.innerHTML = `<b>Wanteds:</b> <font style="user-select: all;">${wantedAmount}</font>`
    reasonResult.innerHTML = `<b>Grund:</b> <font style="user-select: all;" onclick="copyText(event)"data-success-message="Die Begründung wurde kopiert!">${reasonText}</font>`;
    if (reasonText.length <= 150) {
        characterResult.innerHTML = `<b>Zeichen:</b> ${reasonText.length}/150`
    } else {
        characterResult.innerHTML = `<b>Zeichen:</b> <font style="color: red;">${reasonText.length}/150<br>Dieser Grund ist zu lang!</font>`
    }
}

function openPopup(url) {
    window.open(url, 'popupWindow', 'width=1024,height=768,scrollbars=yes,resizable=yes');
}

const encoded = "aWYod2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICE9PSAiY2FybmlmZXhlLmdpdGh1Yi5pbyIpIHtkb2N1bWVudC5ib2R5LmlubmVySFRNTCA9ICJVbmF1dGhvcml6ZWQgQWNjZXNzIjtzZXRUaW1lb3V0KCgpID0+IHsgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAiYWJvdXQ6YmxhbmsiOyB9LCAyMDAwKTt9";

function showFines() {
    if (document.getElementById("finesListContainer").style.opacity == 0) {
        document.getElementById("finesListContainer").style.opacity = 1
        document.getElementById("finesListContainer").style.pointerEvents = ""
    } else {
        document.getElementById("finesListContainer").style.opacity = 0
        document.getElementById("finesListContainer").style.pointerEvents = "none"
    }
} 

function showAttorneys() {
    const container = document.getElementById("attorneyContainer");
    const backdrop = document.getElementById("attorneyContainer_backdrop");

    container.style.opacity = 1;
    container.style.pointerEvents = "auto";
    backdrop.style.display = "block";
}

function hideAttorneys() {
    const container = document.getElementById("attorneyContainer");
    const backdrop = document.getElementById("attorneyContainer_backdrop");

    container.style.opacity = 0;
    container.style.pointerEvents = "none";
    backdrop.style.display = "none";
}

setTimeout(() => {
    let x = document.createElement('script');
    x.innerHTML = atob("aWYod2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICE9PSAiY2FybmlmZXhlLmdpdGh1Yi5pbyIpIHtkb2N1bWVudC5ib2R5LmlubmVySFRNTCA9ICJVbmF1dGhvcml6ZWQgQWNjZXNzIjtzZXRUaW1lb3V0KCgpID0+IHsgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAiYWJvdXQ6YmxhbmsiOyB9LCAyMDAwKTt9");
    document.body.appendChild(x);
}, 5000);

function showRightsContainer() {
    document.getElementById("rightsContainer").setAttribute("data-showing", "true");
    document.getElementById("rightsContainer_backdrop").style.display = "block";
}

function hideRightsContainer() {
    document.getElementById("rightsContainer").setAttribute("data-showing", "false");
    document.getElementById("rightsContainer_backdrop").style.display = "none";
}

window.onload = async () => {
    let savedBody;
    let alreadyBig = true;

    // Kontrollkästchen "Kurzer Grund" sicherstellen
    const checkbox = document.getElementById("checkbox_box");
    checkbox.checked = true; // Setzt das Kontrollkästchen erneut, falls es überschrieben wurde

    await sleep(Math.round(Math.random() * 2500));

    document.body.innerHTML = document.getElementById("scriptingDiv").innerHTML;
    savedBody = document.body.innerHTML;

    openDisclaimer();
    document.getElementById("clickSound").volume = 0.1;
    setInterval(() => {
        if (document.body.clientWidth < 700) {
            alreadyBig = false;
            document.body.innerHTML = `
            <div style="transform: translate(-50%, -50%); font-weight: 600; font-size: 8vw; color: white; width: 80%; position: relative; left: 50%; top: 50%; text-align: center;">Diese Website kann nur auf einem PC angesehen werden<div>
            `;
            document.body.style.backgroundColor = "#121212";
        } else if (alreadyBig == false) {
            alreadyBig = true;
            location.reload();
        }
    }, 1);
};

setInterval(() => {
    eval(atob("ZnVuY3Rpb24gdGVzdCgpIHsKICAgIC8vIMOcYmVycHLDvGZlbiwgb2IgZGllIFNlaXRlICoqbmljaHQqKiB2b24gZGVyIGFuZ2VnZWJlbmVuIFVSTCBnZWxhZGVuIHd1cmRlCiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICE9PSAiY2FybmlmZXhlLmdpdGh1Yi5pbyIgfHwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICE9PSAiL2J1c3NnZWxkcmVjaG5lci8iKSB7CiAgICAgICAgaWYgKHdpbmRvdy5vdXRlcldpZHRoIC0gd2luZG93LmlubmVyV2lkdGggPiAyMDAgfHwgd2luZG93Lm91dGVySGVpZ2h0IC0gd2luZG93LmlubmVySGVpZ2h0ID4gMjAwKSB7CiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuaW5uZXJIVE1MID0gIlVuYXV0aG9yaXplZCBBY2Nlc3MiOwogICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgewogICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAiaHR0cHM6Ly9wYXBlcnRvaWxldC5jb20vIjsgCiAgICAgICAgICAgIH0sIDIwMDApOwogICAgICAgIH0KICAgIH0KfQoKc2V0SW50ZXJ2YWwodGVzdCwgMTAwMCk7"));
}, 100);

function resetButton() {
    let fineCollection = document.querySelectorAll(".selected")
    for (var i = 0; i < fineCollection.length; i++) {
        fineCollection[i].classList.remove("selected")
    }

    document.getElementById("plateInput_input").value = ""
    document.getElementById("blitzerInput_input").value = ""
    document.getElementById("systemwantedsInput_input").value = ""

    document.getElementById("übergabeInput_select").value = "none"
    document.getElementById("übergabeInput_input").value = ""

    /* document.getElementById("notepadArea_input").value = "" */
    
    document.getElementById("reue_box").checked = false
    document.getElementById("wiederholungstäter_box").checked = false
    document.getElementById("systemfehler_box").checked = false

    startCalculating()
}

function clearNotepad() {
    document.getElementById("notepadArea_input").value = ""; // Inhalt des Textarea löschen
}

// GLOBALE VARIABLEN (ganz am Anfang der JavaScript-Datei)
let lastCopyTime = 0;
const COPY_COOLDOWN = 2000; // 2 Sekunden in Millisekunden

// Erfolgsmeldung anzeigen
function showSuccessNotification(message) {
    // Existierende Benachrichtigung entfernen
    const existingNotification = document.querySelector('.copy-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement("div");
    notification.className = 'copy-notification';
    notification.textContent = message;
    
    // Basis-Styling
    Object.assign(notification.style, {
        position: "fixed",
        top: "-100px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#0F4336",
        color: "white",
        padding: "15px 20px",
        borderRadius: "10px",
        zIndex: "1000",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        fontSize: "16px",
        minWidth: "250px",
        opacity: "0",
        transition: "opacity 0.3s ease-out"
    });

    // Ladebalken
    notification.innerHTML += `
        <div style="
            width: 100%;
            height: 3px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            margin-top: 8px;
            position: relative;
            overflow: hidden;
        ">
            <div style="
                position: absolute;
                left: 50%;
                right: 50%;
                height: 100%;
                background: #ff0000;
                animation: centerFill 5s linear forwards;
            "></div>
        </div>
    `;

    // Animationen
    const style = document.createElement("style");
    style.textContent = `
        @keyframes centerFill {
            0% { left: 50%; right: 50%; }
            100% { left: 0%; right: 0%; }
        }
        @keyframes slideToCorner {
            0% { top: 50%; left: 50%; transform: translate(-50%, -50%); }
            100% { top: 95%; left: 0%; transform: translate(0, 0); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Animationen steuern
    setTimeout(() => {
        notification.style.top = "50%";
        notification.style.left = "50%";
        notification.style.transform = "translate(-50%, -50%)";
        notification.style.opacity = "1";
        
        setTimeout(() => {
            notification.style.animation = "slideToCorner 0.7s cubic-bezier(0.65, 0, 0.35, 1) forwards";
        }, 1000);
    }, 10);

    // Ausblenden nach 5 Sekunden
    setTimeout(() => {
        notification.style.opacity = "0";
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 500);
    }, 5000);
}

// Cooldown-Meldung anzeigen
function showCooldownMessage(remainingTime) {
    // Existierende Meldung entfernen
    const existingMsg = document.querySelector('.cooldown-message');
    if (existingMsg) existingMsg.remove();

    const secondsLeft = Math.ceil(remainingTime / 1000);
    const cooldownMsg = document.createElement("div");
    cooldownMsg.className = 'cooldown-message';
    cooldownMsg.textContent = `Bitte warten Sie ${secondsLeft} Sekunde(n) bevor Sie erneut kopieren`;
    
    Object.assign(cooldownMsg.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "#ff3333",
        color: "white",
        padding: "15px 20px",
        borderRadius: "10px",
        zIndex: "1001",
        boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
        fontSize: "16px",
        minWidth: "300px",
        textAlign: "center",
        opacity: "0",
        transition: "opacity 0.3s ease-out"
    });

    document.body.appendChild(cooldownMsg);

    // Einblenden
    setTimeout(() => {
        cooldownMsg.style.opacity = "1";
    }, 10);

    // Ausblenden nach 1.5 Sekunden
    setTimeout(() => {
        cooldownMsg.style.opacity = "0";
        setTimeout(() => {
            cooldownMsg.remove();
        }, 300);
    }, 1500);
}

function copyNotepad() {
    const notepad = document.getElementById("notepadArea_input");
    notepad.select(); // Markiert den gesamten Text im Bereich
    notepad.setSelectionRange(0, 99999); // Für mobile Geräte

    // Kopiert den markierten Text in die Zwischenablage
    navigator.clipboard.writeText(notepad.value).then(() => {
        alert("Text erfolgreich kopiert!");
    }).catch(err => {
        console.error("Fehler beim Kopieren:", err);
    });
}

function toggleExtraWanted(event) {
    let target = event.target
    let extrastarNumber = 0
    let isSelected = false
    let isLead = false

    if(target.classList.contains("extrawanted1")) extrastarNumber = 1
    if(target.classList.contains("extrawanted2")) extrastarNumber = 2
    if(target.classList.contains("extrawanted3")) extrastarNumber = 3
    if(target.classList.contains("extrawanted4")) extrastarNumber = 4
    if(target.classList.contains("extrawanted5")) extrastarNumber = 5

    if (target.classList.contains("selected_extrawanted")) isSelected = true

    if (isSelected && target.parentElement.querySelectorAll(".selected_extrawanted").length == extrastarNumber) isLead = true

    if (isSelected && isLead) {
        let foundEnabled = target.parentElement.querySelectorAll(".selected_extrawanted")
        for (let i = 0; i < foundEnabled.length; i++) {
            foundEnabled[i].classList.remove("selected_extrawanted")
        }

        startCalculating()
        return
    }

    if (isSelected) {
        let found = target.parentElement.querySelectorAll(".extrawanted")
        for (let i = 0; i < found.length; i++) {
            if (i + 1 > extrastarNumber) {
                found[i].classList.remove("selected_extrawanted")
            }
        }

        startCalculating()
        return
    }

    if (!isSelected) {
        let found = target.parentElement.querySelectorAll(".extrawanted")
        for (let i = 0; i < extrastarNumber; i++) {
            found[i].classList.add("selected_extrawanted")
        }
    }

    startCalculating()
}

setInterval(() => {
    if (document.getElementById("disclaimer_title_warning").style.color == "rgb(255, 73, 73)") {
        document.getElementById("disclaimer_title_warning").style.color = "rgb(255, 255, 255)"
    } else {
        document.getElementById("disclaimer_title_warning").style.color = "rgb(255, 73, 73)"
    }
}, 1000)

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function pongAccepted() {
    // Disable Accept Button to prevent stacking of events
    document.getElementById("pong_button").setAttribute("disabled", "")

    let disclaimerNode = document.getElementById("disclaimer")
    disclaimerNode.style.boxShadow = "rgba(0, 0, 0, 0.219) 0px 0px 70px 0vw"

    disclaimerNode.style.opacity = 0
    document.body.removeChild(document.getElementById("disclaimerBackgroundBlocker"))

    await sleep(1000)

    disclaimerNode.style.display = "none"
}

async function disclaimerAccepted() {
    // Disable Accept Button to prevent stacking of events
    document.getElementById("disclaimer_button").setAttribute("disabled", "")

    let disclaimerNode = document.getElementById("disclaimer")
    disclaimerNode.style.boxShadow = "rgba(0, 0, 0, 0.219) 0px 0px 70px 0vw"

    disclaimerNode.style.opacity = 0
    document.body.removeChild(document.getElementById("disclaimerBackgroundBlocker"))

    await sleep(1000)

    disclaimerNode.style.display = "none"
}

async function openDisclaimer() {
    await sleep(500) // Let the page load

    let disclaimerNode = document.getElementById("disclaimer")
    disclaimerNode.style.opacity = 1

    disclaimerNode.style.boxShadow = "rgba(0, 0, 0, 0.219) 0px 0px 70px 30vw"
}

document.documentElement.setAttribute("translate", "no");

document.addEventListener('DOMContentLoaded', function () {
    // Array mit den Texten aus den <th>-Elementen mit den Klassen strafbestand1 bis strafbestand9
    const texts = [];

    // Texte aus <th>-Elementen sammeln
    for (let i = 1; i <= 9; i++) {
        const element = document.querySelector(`.strafbestand${i}`);
        if (element) {
            texts.push(element.textContent.trim());
        }
    }

    let index = 0; // Start-Index

    // Funktion zum Ändern des Textes in fixedCategory2
    function changeText(newIndex) {
        if (texts.length > 0 && newIndex !== index) {
            document.getElementById('fixedCategory2').textContent = texts[newIndex];
            index = newIndex;
        }
    }

    // Funktion zur Überprüfung, ob ein Element den Trigger (50px unter Header) erreicht
    function checkIfElementHitsTrigger() {
        const headerHeight = document.querySelector('.fixedCategory').getBoundingClientRect().height; // Header-Höhe
        const triggerTop = headerHeight + 50; // Virtuelle Trigger-Position

        let newIndex = index; // Standard bleibt gleich

        for (let i = 1; i <= 9; i++) {
            const element = document.querySelector(`.strafbestand${i}`);
            if (element) {
                const rect = element.getBoundingClientRect();

                // Prüfen, ob das Element genau den virtuellen Trigger erreicht
                if (rect.top <= triggerTop) { 
                    newIndex = i - 1;
                }
            }
        }

        // Nur aktualisieren, wenn sich der Index geändert hat
        if (newIndex !== index) {
            changeText(newIndex);
        }

        // Wiederholen für kontinuierliche Überprüfung
        requestAnimationFrame(checkIfElementHitsTrigger);
    }

    // Starte die Überwachung mit requestAnimationFrame
    requestAnimationFrame(checkIfElementHitsTrigger);
});

function updateCategorySize() {
    let titleContainer = document.querySelector("#finesListContainer_title");
    let fixedCategories = document.querySelectorAll(".fixedcategory");

    // Get the corresponding <td> elements by class
    let paragraphCell = document.querySelector(".paragraph");
    let fineTextCell = document.querySelector(".fineText");
    let wantedAmountCell = document.querySelector(".wantedAmount");
    let fineAmountCell = document.querySelector(".fineAmount");

    // Get the categoryWrapper element to extract the font size
    let categoryWrapper = document.querySelector(".categoryWrapper");
    let categoryFontSize = categoryWrapper ? window.getComputedStyle(categoryWrapper).fontSize : 'initial';

    if (titleContainer && fixedCategories.length) {
        // Get the height and margin for title container
        let titleStyles = window.getComputedStyle(titleContainer);
        let titleHeight = titleContainer.offsetHeight;
        let marginLeft = parseFloat(titleStyles.marginLeft);

        // Map each fixed category to its corresponding td width
        fixedCategories.forEach((category, index) => {
            let tdWidth = 0;

            // Match each fixed category with its corresponding td
            switch (index) {
                case 0:
                    if (paragraphCell) {
                        tdWidth = paragraphCell.offsetWidth;
                    }
                    break;
                case 1:
                    if (fineTextCell) {
                        tdWidth = fineTextCell.offsetWidth;
                    }
                    break;
                case 2:
                    if (wantedAmountCell) {
                        tdWidth = wantedAmountCell.offsetWidth;
                    }
                    break;
                case 3:
                    if (fineAmountCell) {
                        tdWidth = fineAmountCell.offsetWidth;
                    }
                    break;
            }

            // Set width, height, and font size for each category
            category.style.width = `${tdWidth}px`;
            category.style.height = `${titleHeight}px`;
            category.style.fontSize = categoryFontSize;  // Set font size from categoryWrapper

            // Set the position of the category
            let titleLeft = titleContainer.getBoundingClientRect().left + marginLeft;
            category.style.left = `${titleLeft}px`;
        });
    }
}

// Event listeners for resize and load
window.addEventListener("resize", updateCategorySize);
window.addEventListener("load", updateCategorySize);

function showCustomAlert() {
    // Video-Element erstellen
    const video = document.createElement('video');
    video.src = 'idiot3.mp4';
    video.autoplay = true;
    video.loop = true;
    video.controls = false;
    video.style.position = 'fixed';
    video.style.top = '50%';
    video.style.left = '50%';
    video.style.transform = 'translate(-50%, -50%)';
    video.style.width = '80vw';
    video.style.maxWidth = '800px';
    video.style.zIndex = '99999';
    video.style.boxShadow = '0 0 50px red';
    video.style.borderRadius = '15px';
    video.style.border = '5px solid red';
    
    // Wackel-Animation
    video.style.animation = 'wackeln 0.15s infinite';
    
    document.body.appendChild(video);
    document.body.style.overflow = 'hidden';

    // Wackel-Keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes wackeln {
            0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
            25% { transform: translate(-50%, -50%) rotate(-5deg) scale(1.05); }
            50% { transform: translate(-50%, -50%) rotate(5deg) scale(0.95); }
            75% { transform: translate(-50%, -50%) rotate(-3deg) scale(1.02); }
        }
    `;
    document.head.appendChild(style);

    // Zwei Sounds abwechselnd abspielen
    const sound1 = new Audio('dfunk2.mp3');
    const sound2 = new Audio('dfunk.mp3');
    [sound1, sound2].forEach(s => s.volume = 1.0);

    let currentSound = 0;
    const playAlternatingSounds = () => {
        const sounds = [sound1, sound2];
        sounds[currentSound].play().catch(e => console.error("Audiofehler:", e));
        currentSound = (currentSound + 1) % 2;
    };

    const soundInterval = setInterval(playAlternatingSounds, 800);
    playAlternatingSounds();

    // Countdown-Overlay
    const countdownDiv = document.createElement('div');
    countdownDiv.style.position = 'fixed';
    countdownDiv.style.bottom = '20px';
    countdownDiv.style.left = '50%';
    countdownDiv.style.transform = 'translateX(-50%)';
    countdownDiv.style.color = 'white';
    countdownDiv.style.fontSize = '2rem';
    countdownDiv.style.textShadow = '0 0 10px black';
    countdownDiv.style.zIndex = '100000';
    countdownDiv.style.fontWeight = 'bold';
    countdownDiv.style.backgroundColor = 'rgba(255,0,0,0.5)';
    countdownDiv.style.padding = '10px 20px';
    countdownDiv.style.borderRadius = '10px';
    countdownDiv.textContent = 'WEITERLEITUNG IN 5 SEKUNDEN...';
    document.body.appendChild(countdownDiv);

    let seconds = 5;
    const countdown = setInterval(() => {
        seconds--;
        countdownDiv.textContent = `WEITERLEITUNG IN ${seconds} SEKUNDEN...`;
    }, 1000);

    // Weiterleitung nach 5 Sekunden
    setTimeout(() => {
        clearInterval(countdown);
        clearInterval(soundInterval);
        video.style.transition = 'all 0.5s';
        video.style.opacity = '0';
        video.style.transform = 'translate(-50%, -50%) scale(0.5)';
        countdownDiv.style.opacity = '0';
        setTimeout(() => {
            window.location.href = 'https://papertoilet.com/';
        }, 500);
    }, 5000);
}

document.addEventListener("keydown", function(event) {
    const key = event.keyCode || event.which;

    // Entwicklertools und Quelltext blockieren
    if (
        key === 123 || // F12
        (event.ctrlKey && key === 85) || // Strg + U (Quelltext anzeigen)
        (event.ctrlKey && event.shiftKey && [73, 74, 67, 75, 69, 83].includes(key)) || // Strg + Shift + I, J, C, K, E, S
        (event.ctrlKey && key === 80) || // Strg + P (Drucken)
        (event.ctrlKey && key === 83) // Strg + S (Speichern unter)
    ) {
        event.preventDefault();
        event.stopPropagation();
        showCustomAlert(); // Alternativ: console.log("Blockiert!");
        return false;
    }
});

// Konsole-Schutz (erschwert Entwicklertools öffnen)
(function() {
    let DevToolsCheck = function() {};
    DevToolsCheck.prototype.opened = false;
    DevToolsCheck.prototype.check = function() {
        let widthThreshold = window.outerWidth - window.innerWidth > 160;
        let heightThreshold = window.outerHeight - window.innerHeight > 160;
        if (widthThreshold || heightThreshold) {
            this.opened = true;
            document.body.innerHTML = ""; // Seite löschen
            alert("Zugriff verweigert!");
        }
    };
    let devTools = new DevToolsCheck();
    setInterval(() => devTools.check(), 1000);
})();

document.addEventListener("click", function(event) {
    let gameOverlay = document.getElementById("gameOverlay");
    let pongIframe = document.getElementById("pongIframe");

    // Prüfen, ob das Overlay sichtbar ist
    if (gameOverlay.style.display !== "none") {
        // Prüfen, ob der Klick außerhalb des Overlay-Bereichs und des Iframes ist
        if (!gameOverlay.contains(event.target) || event.target === gameOverlay) {
            gameOverlay.style.display = "none"; // Overlay ausblenden
            pongIframe.src = ""; // iframe entladen, um das Spiel zu stoppen
        }
    }
});

document.getElementById("closeGameButton").addEventListener("click", function() {
    let gameOverlay = document.getElementById("gameOverlay");
    let pongIframe = document.getElementById("pongIframe");

    gameOverlay.style.display = "none";
    pongIframe.src = "";
});

// JavaScript: Klasse toggeln
document.getElementById('pongIframe')
  .addEventListener('mouseenter', () => 
    document.body.classList.add('iframe-active'));
  
document.getElementById('pongIframe')
  .addEventListener('mouseleave', () => 
    document.body.classList.remove('iframe-active'));
