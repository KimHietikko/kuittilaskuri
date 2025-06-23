window.onload = function () {
    // Lista oikeista tuotteista
    var lista = [];

    var campaignItemsList = [];
    var isCampaign = false;

    /* Laskee  */
    let laske = document.getElementById('laske_kuitti');
    laske.addEventListener('click', laske_kuitti, false);

    /* Tyhjennä  */
    let tyhjenna = document.getElementById('tyhjenna_checkbox');
    tyhjenna.addEventListener('click', tyhjenna_checkbox, false);

    // The workerSrc property shall be specified.
    pdfjsLib.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

    document.querySelector('#pdf-file').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (file.type != 'application/pdf') {
            console.error(file.name, 'is not a pdf file.');
            return;
        }

        var fileReader = new FileReader();

        fileReader.onload = function () {
            var typedarray = new Uint8Array(this.result);

            lista = [];

            $('#tulos').empty();

            kuitti = [];

            pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
                var pdfDocument = pdf;
                var pagesPromises = [];
                isCampaign = false;

                for (var i = 0; i < pdf.numPages; i++) {
                    // Required to prevent that i is always the total of pages
                    (function (pageNumber) {
                        pagesPromises.push(getPageText(pageNumber, pdfDocument));
                    })(i + 1);
                }

                Promise.all(pagesPromises).then(function (pagesText) {
                    console.log(pagesText[0]);

                    var rivi = pagesText[0].split('\n');

                    // Käy kaikki kopioidut rivit läpi ja poistaa sieltä turhat
                    for (var i = 0; i < rivi.length; i++) {
                        // Parsii tuotteen ja hinnan erikseen
                        var tuotteen_tiedot = {
                            tuote: rivi[i].substring(0, rivi[i].indexOf('     ')).trim(),
                            hinta: rivi[i].substring(rivi[i].indexOf('     ')).trim().replace(',', '.')
                        };

                        // Lisää pantin edellisen tuotteen hintaan
                        if (tuotteen_tiedot.tuote.includes('PANTTI') && !tuotteen_tiedot.tuote.includes('PULLOPANTTI')) {
                            lista[lista.length - 1].hinta = (+lista[lista.length - 1].hinta + +parseFloat(tuotteen_tiedot.hinta)).toFixed(2);
                        }

                        // Lisää alennus edellisen tuotteen hintaan
                        if (tuotteen_tiedot.tuote.includes('ALENNUS')) {
                            lista[lista.length - 1].tuote = lista[lista.length - 1].tuote.concat(' ALENNUS');
                            lista[lista.length - 1].hinta = (+lista[lista.length - 1].hinta - +parseFloat(tuotteen_tiedot.hinta)).toFixed(2);
                        }

                        // Lisää kampanja-alennus edellisen tuotteen hintaan
                        if (tuotteen_tiedot.tuote.includes('KAMPANJA') && tuotteen_tiedot.hinta.includes('-')) {
                            lista[lista.length - 1].tuote = lista[lista.length - 1].tuote.concat(' ALENNUS');
                            lista[lista.length - 1].hinta = (+lista[lista.length - 1].hinta - +parseFloat(tuotteen_tiedot.hinta)).toFixed(2);

                            continue;
                        }

                        if (isCampaign) {
                            campaignItemsList.forEach(element => {
                                if (tuotteen_tiedot.tuote.includes(element.tuote)) {
                                    tuotteen_tiedot.tuote = tuotteen_tiedot.tuote.concat(' KAMPANJA');
                                    tuotteen_tiedot.hinta = element.hinta;
                                }
                            });
                        }

                        // Jos on tyhjät tiedot tuotteessa ja hinnassa, älä lisää
                        if (
                            tuotteen_tiedot.tuote !== '' &&
                            !tuotteen_tiedot.tuote.includes('PANTTI') &&
                            !tuotteen_tiedot.tuote.includes('ALENNUS') &&
                            !tuotteen_tiedot.hinta.includes('EUR/KG') &&
                            !tuotteen_tiedot.hinta.includes('EUR/KPL') &&
                            !tuotteen_tiedot.hinta.includes('€/KG') &&
                            !tuotteen_tiedot.hinta.includes('€/KPL')
                        ) {
                            lista.push(tuotteen_tiedot);
                        }
                        if (tuotteen_tiedot.tuote.includes('PULLOPANTTI')) {
                            lista.push(tuotteen_tiedot);
                        }
                    }

                    console.log(lista);

                    /* Poistetaan turhat rivit */
                    let rivi_elementit = document.querySelectorAll('tr');
                    for (let rivi = 1; rivi < rivi_elementit.length; rivi++) {
                        rivi_elementit[rivi].remove();
                    }

                    for (var taulukko = 0; taulukko < lista.length; taulukko++) {
                        $('#pdf-text').append('<tr id=' + taulukko + '>');
                        $('#' + taulukko).append('<td id=tuote' + taulukko + '>' + lista[taulukko].tuote + '</td>');
                        $('#' + taulukko).append('<td>' + lista[taulukko].hinta + '</td>');

                        let personsCheckboxesButtonsString = '';
                        let personsRadioButtonValue = $('input[name=personsRadioButton]:checked').val();
                        for (let persons = 0; persons < personsRadioButtonValue; persons++) {
                            if (persons !== personsRadioButtonValue) {
                                personsCheckboxesButtonsString =
                                    personsCheckboxesButtonsString +
                                    '<p><input type=checkbox name=checkbox' +
                                    taulukko +
                                    ' id=checkbox' +
                                    (taulukko + (persons + 1).toString()) +
                                    '> <label for=checkbox' +
                                    (taulukko + (persons + 1).toString()) +
                                    '>Henkilö ' +
                                    (persons + 1) +
                                    '</p></input>';
                            }
                        }

                        personsCheckboxesButtonsString =
                            personsCheckboxesButtonsString +
                            '<p><input type=checkbox name=checkbox' +
                            taulukko +
                            ' id=checkbox' +
                            (taulukko + (parseInt(personsRadioButtonValue) + 1).toString()) +
                            '> <label for=checkbox' +
                            (taulukko + (parseInt(personsRadioButtonValue) + 1).toString()) +
                            '>Yhteinen</p></input>';

                        $('#' + taulukko).append('<td>' + personsCheckboxesButtonsString + '</td>');

                        $('#' + taulukko).append(
                            '<td><p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '1 checked> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '1>Arkinen</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '2> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '2>Herkku</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '3> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '3>Käyttötavara</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '4> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '4>Elektroniikka</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '5> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '5>Lahja</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '6> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '6>Vaate</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '7> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '7>Urheilu</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '8> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '8>Alkoholi</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '9> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '9>Kauneus</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '10> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '10>Terveys</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '11> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '11>Vauvan arkinen</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '12> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '12>Vauvan käyttötavara</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '13> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '13>Vauvan vaate</p></input>' +
                                '<p><input type=radio name=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                ' id=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '14> <label for=foodOrProduct' +
                                lista[taulukko].tuote.trim().substring(0, 3) +
                                taulukko +
                                '14>Vauvan terveys</p></input></td></tr>'
                        );
                    }
                });
            });
        };
        fileReader.readAsArrayBuffer(file);
    });

    /**
     * Retrieves the text of a specif page within a PDF Document obtained through pdf.js
     *
     * @param {Integer} pageNum Specifies the number of the page
     * @param {PDFDocument} PDFDocumentInstance The PDF document obtained
     **/
    function getPageText(pageNum, PDFDocumentInstance) {
        // Return a Promise that is solved once the text of the page is retrieven
        return new Promise(function (resolve, reject) {
            PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
                // The main trick to obtain the text of the PDF page, use the getTextContent method

                var scale = 1.5;
                var viewport = pdfPage.getViewport({ scale: scale });

                // Prepare canvas using PDF page dimensions
                var canvas = document.getElementById('the-canvas');
                var context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render PDF page into canvas context
                var renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                var renderTask = pdfPage.render(renderContext);
                renderTask.promise.then(function () {
                    console.log('Page rendered');
                });

                pdfPage.getTextContent().then(function (textContent) {
                    var textItems = textContent.items;
                    var finalString = '';

                    // Concatenate the string of the item to the final string
                    for (var i = 5; i < textItems.length; i++) {
                        var item = textItems[i];

                        if (textItems.find(element => element.str.includes('S-Etu kampanja'))) {
                            isCampaign = true;
                        }

                        if (!item.str.toUpperCase().includes('YHTEENSÄ')) {
                            if (!item.str.includes(':')) {
                                finalString += item.str + '\n';
                            }
                        } else {
                            if (isCampaign) {
                                campaignItemsList = list_campaign_items(i, textItems);
                            }

                            break;
                        }
                    }

                    // Solve promise with the text retrieven from the page
                    resolve(finalString);
                });
            });
        });
    }

    function list_campaign_items(index, textItems) {
        let list = [];

        for (var i = index + 3; i < textItems.length; i++) {
            var item = textItems[i];

            if (!item.str.includes('----------')) {
                var tuotteen_tiedot = {
                    tuote: item.str.trim().substring(0, item.str.trim().indexOf('  ')).trim(),
                    hinta: item.str.trim().substring(item.str.trim().indexOf('  ')).trim().replace(',', '.')
                };

                list.push(tuotteen_tiedot);
            } else {
                break;
            }
        }

        return list;
    }

    function tyhjenna_checkbox() {
        $('input[type=checkbox]').prop('checked', false);
    }

    function laske_kuitti() {
        var yhteinenOsuusYhdelle = 0;
        var Yhteensa = 0;

        let peopleAndPrices = new Array();

        $('#tulos').empty();

        let radioButtonPersons = $('input[name=personsRadioButton]:checked').val();

        for (let i = 0; i < lista.length; i++) {
            if (lista[i].tuote == document.getElementById('tuote' + i).textContent) {
                var valittu = document.getElementsByName('checkbox' + i);
                var valittuLaatu = document.getElementsByName('foodOrProduct' + i);

                let checkedBoxes = 0;

                for (let radiolista = 0; radiolista < valittu.length; radiolista++) {
                    if (peopleAndPrices.length < valittu.length) {
                        peopleAndPrices.push({
                            person: valittu[radiolista].nextSibling.nextSibling.innerText.trim(),
                            totalPrice: 0,
                            totalFood: 0,
                            totalSweets: 0,
                            totalProducts: 0,
                            totalElectronics: 0,
                            totalGifts: 0,
                            totalClothes: 0,
                            totalSports: 0,
                            totalAlcohol: 0,
                            totalBeauty: 0,
                            totalHealth: 0,
                            totalBabyFood: 0,
                            totalBabyProducts: 0,
                            totalBabyClothes: 0,
                            totalBabyHealth: 0
                        });
                    }
                    if (valittu[radiolista].checked) {
                        checkedBoxes = checkedBoxes + 1;
                    }
                }

                for (let radiolista = 0; radiolista < valittu.length; radiolista++) {
                    if (valittu[radiolista].checked) {
                        peopleAndPrices.forEach(array => {
                            if (valittu[radiolista].nextSibling.nextSibling.innerText.trim() === array.person) {
                                if (lista[i].hinta.toString().includes('-')) {
                                    valittuLaatu.forEach(laatu => {
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Arkinen') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalFood = person.totalFood - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalFood = +array.totalFood - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Herkku') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalSweets = person.totalSweets - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalSweets = +array.totalSweets - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Käyttötavara') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalProducts = person.totalProducts - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalProducts = +array.totalProducts - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Elektroniikka') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalElectronics = person.totalElectronics - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalElectronics = +array.totalElectronics - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Lahja') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalGifts = person.totalGifts - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalGifts = +array.totalGifts - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vaate') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalClothes = person.totalClothes - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalClothes = +array.totalClothes - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Urheilu') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalSports = person.totalSports - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalSports = +array.totalSports - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Alkoholi') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalAlcohol = person.totalAlcohol - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalAlcohol = +array.totalAlcohol - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Kauneus') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBeauty = person.totalBeauty - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBeauty = +array.totalBeauty - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Terveys') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalHealth = person.totalHealth - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalHealth = +array.totalHealth - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vauvan arkinen') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBabyFood = person.totalBabyFood - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBabyFood = +array.totalBabyFood - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vauvan käyttötavara') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBabyProducts = person.totalBabyProducts - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBabyProducts = +array.totalBabyProducts - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vauvan vaate') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBabyClothes = person.totalBabyClothes - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBabyClothes = +array.totalBabyClothes - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vauvan terveys') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +parseFloat(lista[i].hinta) / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBabyHealth = person.totalBabyHealth - +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBabyHealth = +array.totalBabyHealth - +parseFloat(lista[i].hinta) / checkedBoxes;
                                            }
                                        }
                                    });
                                    array.totalPrice = +array.totalPrice - +parseFloat(lista[i].hinta) / checkedBoxes;
                                } else {
                                    valittuLaatu.forEach(laatu => {
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Arkinen') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalFood = person.totalFood + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalFood = +array.totalFood + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Herkku') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalSweets = person.totalSweets + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalSweets = +array.totalSweets + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Käyttötavara') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalProducts = person.totalProducts + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalProducts = +array.totalProducts + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Elektroniikka') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalElectronics = person.totalElectronics + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalElectronics = +array.totalElectronics + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Lahja') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalGifts = person.totalGifts + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalGifts = +array.totalGifts + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vaate') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalClothes = person.totalClothes + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalClothes = +array.totalClothes + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Urheilu') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalSports = person.totalSports + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalSports = +array.totalSports + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Alkoholi') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalAlcohol = person.totalAlcohol + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalAlcohol = +array.totalAlcohol + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Kauneus') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBeauty = person.totalBeauty + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBeauty = +array.totalBeauty + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Terveys') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalHealth = person.totalHealth + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalHealth = +array.totalHealth + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vauvan arkinen') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBabyFood = person.totalBabyFood + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBabyFood = +array.totalBabyFood + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vauvan käyttötavara') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBabyProducts = person.totalBabyProducts + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBabyProducts = +array.totalBabyProducts + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vauvan vaate') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBabyClothes = person.totalBabyClothes + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBabyClothes = +array.totalBabyClothes + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vauvan terveys') {
                                            if (array.person === 'Yhteinen') {
                                                yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                peopleAndPrices.forEach(person => {
                                                    if (person.person !== 'Yhteinen') {
                                                        person.totalBabyHealth = person.totalBabyHealth + +yhteinenOsuusYhdelle;
                                                    }
                                                });
                                            } else {
                                                array.totalBabyHealth = +array.totalBabyHealth + +(lista[i].hinta / checkedBoxes);
                                            }
                                        }
                                    });

                                    array.totalPrice = +array.totalPrice + +(lista[i].hinta / checkedBoxes);
                                }
                            }
                        });
                    }
                }
            }
        }

        peopleAndPrices.forEach(person => {
            if (person.person === 'Yhteinen') {
                yhteinenOsuusYhdelle = person.totalPrice / radioButtonPersons;
            }
        });

        let results = '';

        peopleAndPrices.forEach(person => {
            if (person.person !== 'Yhteinen') {
                person.totalPrice = person.totalPrice + +yhteinenOsuusYhdelle;
                Yhteensa = Yhteensa + +person.totalPrice;
                results =
                    results +
                    '<div><p>' +
                    person.person +
                    ' arkinen: ' +
                    person.totalFood.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' herkku: ' +
                    person.totalSweets.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' käyttötavara: ' +
                    person.totalProducts.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' elektroniikka: ' +
                    person.totalElectronics.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' lahja: ' +
                    person.totalGifts.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' vaate: ' +
                    person.totalClothes.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' urheilu: ' +
                    person.totalSports.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' alkoholi: ' +
                    person.totalAlcohol.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' kauneus: ' +
                    person.totalBeauty.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' terveys: ' +
                    person.totalHealth.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' vauvan arkinen: ' +
                    person.totalBabyFood.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' vauvan käyttötavara: ' +
                    person.totalBabyProducts.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' vauvan vaate: ' +
                    person.totalBabyClothes.toFixed(3) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' vauvan terveys: ' +
                    person.totalBabyHealth.toFixed(3) +
                    '</p>' +
                    '<strong><p>' +
                    person.person +
                    ' yhteensä: ' +
                    person.totalPrice.toFixed(3) +
                    '</strong></p></div>';
            }
        });

        $('#tulos').append(results);
        $('#tulos').append('<strong><p id=Yhteensa>' + 'Yhteensä: ' + Yhteensa.toFixed(3) + '</p></strong>');
    }
};
