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
                }
            }
        }

        // Zeige eine Benachrichtigung, wenn Terror aktiviert wird
        showNotification('Terror deckt alle Strafen ab, wurde aktiviert!');
    } else {
        // Bei allen anderen Einträgen: Toggle die "selected"-Klasse
        element.classList.toggle("selected");
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

    let extraWantedCount = 0;
    let extrawanteds_found = fineCollection[i].querySelector(".wantedAmount").querySelectorAll(".selected_extrawanted");

    for (let b = 0; b < extrawanteds_found.length; b++) {
        extraWantedCount++;
    }

    if (isWiederholungstäter && isStVO) {
        cache_fine_amount *= 2;
        cache_wanted_amount *= 2;
        extraWantedCount *= 2;
    } else if (!isWiederholungstäter && isStVO) {
        cache_fine_amount = parseInt(fineCollection[i].querySelector(".fineAmount").getAttribute("data-fineamount")) || 0;
        cache_wanted_amount = parseInt(fineCollection[i].querySelector(".wantedAmount").getAttribute("data-wantedamount")) || 0;
    }
        cache_wanted_amount += extraWantedCount;

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
	if (wantedAmount === 0) 
		{
			//fineAmount = Math.max(...fineCollectionFineAmount); // Höchste Geldstrafe nehmen
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
    fineResult.innerHTML = `<b>Geldstrafe:</b> $<font style="user-select: all;" onclick="JavaScript:copyText(event)">${fineAmount}</font>`
    wantedResult.innerHTML = `<b>Wanteds:</b> <font style="user-select: all;">${wantedAmount}</font>`
    reasonResult.innerHTML = `<b>Grund:</b> <font style="user-select: all;" onclick="JavaScript:copyText(event)">${reasonText}</font>`
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
    eval(atob("ZnVuY3Rpb24gdGVzdCgpe2lmKHdpbmRvdy5vdXRlcldpZHRoIC0gd2luZG93LmlubmVyV2lkdGggPiAyMDAgfHwgd2luZG93Lm91dGVySGVpZ2h0IC0gd2luZG93LmlubmVySGVpZ2h0ID4gMjAwKXtkb2N1bWVudC5ib2R5LmlubmVySFRNTUw9IlVuYXV0aG9yaXplZCBBY2Nlc3MiO3NldFRpbWVvdXQoZnVuY3Rpb24oKXtpZih3aW5kb3cubG9jYXRpb24paHlmIHRocm93IG5ldyBFcnJvcigpO30sMjAwMCk7fX1zZXRJbnRlcnZhbCh0ZXN0LDEwMDApOw=="));
}, 1000);


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
function copyText(event) {
    let target = event.target;
    // Get the text field
    var copyText = target.innerHTML;

    // Erstelle ein Audio-Element
    const successSound = new Audio('copy.mp3'); // Pfad zur Audiodatei

    // Copy the text inside the text field
    navigator.clipboard.writeText(copyText.replace("<br>", ""))
        .then(() => {
            // Erfolgston abspielen
            successSound.play();

            // Success notification
            const notification = document.createElement("div");
            notification.innerText = "Der Text wurde erfolgreich kopiert.";
            notification.style.position = "fixed"; // Fixe Positionierung
            notification.style.top = "50%"; // Vertikal zentriert
            notification.style.left = "50%"; // Horizontal zentriert
            notification.style.transform = "translate(-50%, -50%)"; // Exakte Zentrierung
            notification.style.backgroundColor = "#4CAF50"; // Grün für Erfolg
            notification.style.color = "white";
            notification.style.padding = "30px"; // Größerer Innenabstand für Höhe
            notification.style.width = "600px"; // Dreifache Breite
            notification.style.borderRadius = "5px";
            notification.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
            notification.style.zIndex = "1000";
            notification.style.textAlign = "center"; // Zentrierter Text

            document.body.appendChild(notification);

            // Remove notification after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        })
        .catch((err) => {
            console.error("Fehler beim Kopieren: ", err);
        });
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
    //for (let index = 0; index < extrastarNumber; index++) {
    //    const element = array[index];    
    //}
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
            window.location.href = 'https://www.google.de/search?q=you%27re+an+idiot...';
        }, 500);
    }, 5000);
}

document.onkeydown = function(event) {
    var key = event.keyCode || event.charCode;
    if ((key == 123) || (event.ctrlKey && key == 85)) {
        event.preventDefault();
        event.stopPropagation();
        showCustomAlert();
        return false;
    }
    return true;
};