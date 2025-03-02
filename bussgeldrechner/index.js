function searchFine() {
    let searchFor = document.getElementById("searchbar_input").value.toLocaleLowerCase()
    
    let fines = document.querySelectorAll(".fine");
    for (var i = 0; i < fines.length; i++) {
        if (fines[i].querySelectorAll(".fineText")[0].innerHTML.toLocaleLowerCase().includes(searchFor)) {
            fines[i].classList.add("showing")
            fines[i].classList.remove("hiding")
        } else {
            fines[i].classList.remove("showing")
            fines[i].classList.add("hiding")
        }
        
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



        let cache_wanted_amount = 0;

        cache_wanted_amount = cache_wanted_amount + parseInt(fineCollection[i].querySelector(".wantedAmount").getAttribute("data-wantedamount"))
        
        cache_wanted_amount = cache_wanted_amount + fineCollection[i].querySelector(".wantedAmount").querySelectorAll(".selected_extrawanted").length
        if (cache_wanted_amount > 5) cache_wanted_amount = 5

        fineCollectionWantedAmount.push(cache_wanted_amount)


        let cache_fine_amount = 0;

        cache_fine_amount = cache_fine_amount + parseInt(fineCollection[i].querySelector(".fineAmount").getAttribute("data-fineamount"))

        let extrawanteds_found = fineCollection[i].querySelector(".wantedAmount").querySelectorAll(".selected_extrawanted")
        let extrafines_amount = 0
        for (let b = 0; b < extrawanteds_found.length; b++) {
            if (extrawanteds_found[b].getAttribute("data-addedfine")) cache_fine_amount = cache_fine_amount + parseInt(extrawanteds_found[b].getAttribute("data-addedfine"))
            extrafines_amount = extrafines_amount + parseInt(extrawanteds_found[b].getAttribute("data-addedfine"))
        }

        fineCollectionFineAmount.push(cache_fine_amount)

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
        //fineAmount = fineAmount + parseInt(fineCollection[i].querySelector(".fineAmount").getAttribute("data-fineamount"))

        let extrawanteds_found = fineCollection[i].querySelector(".wantedAmount").querySelectorAll(".selected_extrawanted")
        let extrafines_amount = 0
        for (let b = 0; b < extrawanteds_found.length; b++) {
            //if (extrawanteds_found[b].getAttribute("data-addedfine")) fineAmount = fineAmount + parseInt(extrawanteds_found[b].getAttribute("data-addedfine"))
            extrafines_amount = extrafines_amount + parseInt(extrawanteds_found[b].getAttribute("data-addedfine"))
        }

        //wantedAmount = wantedAmount + parseInt(fineCollection[i].querySelector(".wantedAmount").getAttribute("data-wantedamount"))
        
        //wantedAmount = wantedAmount + fineCollection[i].querySelector(".wantedAmount").querySelectorAll(".selected_extrawanted").length
        //if (wantedAmount > 5) wantedAmount = 5
        

        const d = new Date();
        const localTime = d.getTime();
        const localOffset = d.getTimezoneOffset() * 60000;
        const utc = localTime + localOffset;
        const offset = 1; // UTC of Germany Time Zone is +01.00
        const germany = utc + (3600000 * offset);
        let now = new Date(germany);

        let hour = now.getHours();
        if (hour < 10) hour = "0" + hour

        let minute = now.getMinutes();
        if (minute < 10) minute = "0" + minute

        let day = now.getDate()
        if (day < 10) day = "0" + day

        let month = now.getMonth() + 1
        if (month < 10) month = "0" + month

        let fineText = ""
        if (fineCollection[i].querySelector(".fineText").innerHTML.includes("<i>")) {
            fineText = fineCollection[i].querySelector(".fineText").innerHTML.split("<i>")[0]
        } else {
            fineText = fineCollection[i].querySelector(".fineText").innerHTML
        }

        if (shortMode) {
            if (reasonText == "") {
                reasonText = `${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").hasAttribute("data-paragraphAddition") ? fineCollection[i].querySelector(".paragraph").getAttribute("data-paragraphAddition") + " " : ""}${fineCollection[i].querySelector(".paragraph").innerHTML}`
            } else {
                reasonText += ` + ${fineCollection[i].querySelector(".paragraph").hasAttribute("data-paragraphAddition") ? fineCollection[i].querySelector(".paragraph").getAttribute("data-paragraphAddition") + " " : ""}${fineCollection[i].querySelector(".paragraph").innerHTML}`
            }
        } else {
            if (reasonText == "") {
                reasonText = `${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").innerHTML} - ${fineText}`
            } else {
                reasonText += ` + ${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").innerHTML} - ${fineText}`
            }
        }

        if (fineCollection[i].getAttribute("data-removedriverlicence") == "true") removeDriverLicense = true
        if (fineCollection[i].getAttribute("data-removeweaponlicence") == "true") removeWeaponLicense = true

        

        if (fineCollection[i].classList.contains("addPlateInList")) {

            document.getElementById("finesListTable").innerHTML +=
            `
            <tr class="finesList_fine">
                <td onclick="JavaScript:copyText(event)">${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").innerHTML} - ${fineText}${plate !== "" ? " - " + plate.toLocaleUpperCase() : ""}${blitzerort !== "" ? " - " + blitzerort : ""}</td>
                <td>$${parseInt(fineCollection[i].querySelector(".fineAmount").getAttribute("data-fineamount")) + extrafines_amount}</td>
            </tr>
            `
        } else {
            document.getElementById("finesListTable").innerHTML +=
            `
            <tr class="finesList_fine">
                <td onclick="JavaScript:copyText(event)">${day}.${month} ${hour}:${minute} - ${fineCollection[i].querySelector(".paragraph").innerHTML} - ${fineText}</td>
                <td>$${parseInt(fineCollection[i].querySelector(".fineAmount").getAttribute("data-fineamount")) + extrafines_amount}</td>
            </tr>
            `
        }

    }


    if (document.getElementById("reue_box").checked && wantedAmount !== 0) { // Means "reue" is active
        wantedAmount = wantedAmount - 2
        if (wantedAmount < 1) wantedAmount = 1
    }

    if (plate != "") {
        reasonText += ` - ${plate.toLocaleUpperCase()}`
    }

    if (blitzerort != "") {
        reasonText += ` - ${blitzerort}`
    }

    if (document.getElementById("reue_box").checked) {
        reasonText += ` - StGB §35`
    }

    if (systemwanteds != "") {
        reasonText += ` + ${systemwanteds} Systemwanteds`
	    if (systemwanteds > 5) systemwanteds = 5
    }

       if (!isNaN(systemwanteds) && systemwanteds !== "") {
    
        if (wantedAmount > 5) wantedAmount = 5
    }

    if (document.getElementById("systemfehler_box").checked) {
        reasonText += ` - Systemfehler`
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
    fineResult.innerHTML = `<b>Geldstrafe:</b> <font style="user-select: all;">$${fineAmount}</font>`
    wantedResult.innerHTML = `<b>Wanteds:</b> <font style="user-select: all;">${wantedAmount}</font>`
    reasonResult.innerHTML = `<b>Grund:</b> <font style="user-select: all;" onclick="JavaScript:copyText(event)">${reasonText}</font>`
    if (reasonText.length <= 150) {
        characterResult.innerHTML = `<b>Zeichen:</b> ${reasonText.length}/150`
    } else {
        characterResult.innerHTML = `<b>Zeichen:</b> <font style="color: red;">${reasonText.length}/150<br>Dieser Grund ist zu lang!</font>`
    }

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

    // Copy the text inside the text field
    navigator.clipboard.writeText(copyText.replace("<br>", ""))
        .then(() => {
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
