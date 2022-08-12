window.onload = function () {
    // Lista oikeista tuotteista
    var lista = [];

    var henkilokunta = false;
    var campaignItemsList = [];
    var isCampaign = false;

    document.getElementById('ale').style.display = 'none';

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

                        if (henkilokunta == false) {
                            document.getElementById('ale').style.visibility = 'visible';
                            // Lisää pantin edellisen tuotteen hintaan
                            if (tuotteen_tiedot.tuote.includes('PANTTI') && !tuotteen_tiedot.tuote.includes('PULLOPANTTI')) {
                                lista[lista.length - 1].hinta = +lista[lista.length - 1].hinta + +tuotteen_tiedot.hinta;
                            }
                        }

                        // Lisää alennus edellisen tuotteen hintaan
                        if (tuotteen_tiedot.tuote.includes('ALENNUS')) {
                            lista[lista.length - 1].tuote = lista[lista.length - 1].tuote.concat(' ALENNUS');
                            lista[lista.length - 1].hinta = (+lista[lista.length - 1].hinta - +parseFloat(tuotteen_tiedot.hinta)).toFixed(2);
                        }

                        if (isCampaign) {
                            campaignItemsList.forEach(element => {
                                if (tuotteen_tiedot.tuote.includes(element.tuote)) {
                                    tuotteen_tiedot.tuote = tuotteen_tiedot.tuote.concat(' KAMPANJA');
                                    tuotteen_tiedot.hinta = element.hinta;
                                }
                            });
                        }

                        if (henkilokunta == false) {
                            // Jos on tyhjät tiedot tuotteessa ja hinnassa, älä lisää
                            if (
                                tuotteen_tiedot.tuote !== '' &&
                                !tuotteen_tiedot.tuote.includes('PANTTI') &&
                                !tuotteen_tiedot.tuote.includes('ALENNUS') &&
                                !tuotteen_tiedot.hinta.includes('EUR/KG') &&
                                !tuotteen_tiedot.hinta.includes('EUR/KPL')
                            ) {
                                lista.push(tuotteen_tiedot);
                            }
                            if (tuotteen_tiedot.tuote.includes('PULLOPANTTI')) {
                                lista.push(tuotteen_tiedot);
                            }
                        } else {
                            // Jos on tyhjät tiedot tuotteessa ja hinnassa, älä lisää
                            if (tuotteen_tiedot.tuote !== '' && !tuotteen_tiedot.tuote.includes('ALENNUS') && !tuotteen_tiedot.hinta.includes('EUR/KG') && !tuotteen_tiedot.hinta.includes('EUR/KPL')) {
                                lista.push(tuotteen_tiedot);
                            }
                        }
                    }

                    console.log(lista);

                    /* Poistetaan turhat rivit */
                    let rivi_elementit = document.querySelectorAll('tr');
                    for (let rivi = 1; rivi < rivi_elementit.length; rivi++) {
                        rivi_elementit[rivi].remove();
                    }

                    if (henkilokunta == false) {
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
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '1 checked> <label for=foodOrProduct' +
                                    taulukko +
                                    '1>Arkinen</p></input>' +
                                    '<p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '2> <label for=foodOrProduct' +
                                    taulukko +
                                    '2>Herkku</p></input>' +
                                    '<p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '3> <label for=foodOrProduct' +
                                    taulukko +
                                    '3>Tavara</p></input>' +
                                    '<p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '4> <label for=foodOrProduct' +
                                    taulukko +
                                    '4>Vaatteet</p></input>' +
                                    '<p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '5> <label for=foodOrProduct' +
                                    taulukko +
                                    '5>Urheilu</p></input></td></tr>'
                            );
                        }
                    } else {
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
                                        (taulukko + (persons + 1)) +
                                        '> <label for=checkbox' +
                                        (taulukko + (persons + 1)) +
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
                                '<td><p><input value=0 type=radio name=ale' +
                                    taulukko +
                                    ' id=ale' +
                                    (taulukko + '0') +
                                    '> <label for=ale' +
                                    (taulukko + '0') +
                                    '>Ei</p></input><p><input value=0.03 checked=true type=radio name=ale' +
                                    taulukko +
                                    ' id=ale' +
                                    (taulukko + '1') +
                                    '> <label for=ale' +
                                    (taulukko + '1') +
                                    '> 3%</p></input><p><input value=0.08 type=radio name=ale' +
                                    taulukko +
                                    ' id=ale' +
                                    (taulukko + '2') +
                                    '> <label for=ale' +
                                    (taulukko + '2') +
                                    '> 8%</p></input><p><input value=0.10 type=radio name=ale' +
                                    taulukko +
                                    ' id=ale' +
                                    (taulukko + '3') +
                                    '> <label for=ale' +
                                    (taulukko + '3') +
                                    '> 10%</p></input><p><input value=0.15 type=radio name=ale' +
                                    taulukko +
                                    ' id=ale' +
                                    (taulukko + '4') +
                                    '> <label for=ale' +
                                    (taulukko + '4') +
                                    '>15%</p></td>'
                            );

                            $('#' + taulukko).append(
                                '<td><p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '1 checked> <label for=foodOrProduct' +
                                    taulukko +
                                    '1>Arkinen</p></input>' +
                                    '<p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '2> <label for=foodOrProduct' +
                                    taulukko +
                                    '2>Herkku</p></input>' +
                                    '<p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '3> <label for=foodOrProduct' +
                                    taulukko +
                                    '3>Tavara</p></input>' +
                                    '<p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '4> <label for=foodOrProduct' +
                                    taulukko +
                                    '4>Vaatteet</p></input>' +
                                    '<p><input type=radio name=foodOrProduct' +
                                    taulukko +
                                    ' id=foodOrProduct' +
                                    taulukko +
                                    '5> <label for=foodOrProduct' +
                                    taulukko +
                                    '5>Urheilu</p></input></td></tr>'
                            );
                        }
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

                    if (textItems.find(element => element.str.includes('HENKILÖKUNTA-ALE'))) {
                        henkilokunta = true;
                        document.getElementById('ale').style.display = 'table-cell';
                    } else {
                        henkilokunta = false;
                        document.getElementById('ale').style.display = 'none';
                    }

                    // Concatenate the string of the item to the final string
                    for (var i = 5; i < textItems.length; i++) {
                        var item = textItems[i];

                        if (textItems.find(element => element.str.includes('S-Etu kampanja'))) {
                            isCampaign = true;
                        }

                        if (!item.str.includes('----------')) {
                            finalString += item.str + '\n';
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
                    tuote: item.str.substring(0, item.str.indexOf('   ')).trim(),
                    hinta: item.str.substring(item.str.indexOf('   ')).trim().replace(',', '.')
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
                var valittuAle = document.getElementsByName('ale' + i);
                var valittuLaatu = document.getElementsByName('foodOrProduct' + i);

                let checkedBoxes = 0;

                for (let radiolista = 0; radiolista < valittu.length; radiolista++) {
                    if (peopleAndPrices.length < valittu.length) {
                        peopleAndPrices.push({
                            person: valittu[radiolista].nextSibling.nextSibling.innerText.trim(),
                            totalPrice: 0,
                            totalFood: 0,
                            totalSweets: 0,
                            totalClothes: 0,
                            totalSports: 0,
                            totalProducts: 0
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
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Tavara') {
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
                                        if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vaatteet') {
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
                                    });
                                    array.totalPrice = +array.totalPrice - +parseFloat(lista[i].hinta) / checkedBoxes;
                                } else {
                                    if (henkilokunta == true) {
                                        for (let aleprosenttilista = 0; aleprosenttilista < valittuAle.length; aleprosenttilista++) {
                                            if (valittuAle[aleprosenttilista].checked) {
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
                                                            array.totalFood = +array.totalFood + +parseFloat(+lista[i].hinta - +(lista[i].hinta / checkedBoxes) * valittuAle[aleprosenttilista].value);
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
                                                            array.totalSweets =
                                                                +array.totalSweets + +parseFloat(+lista[i].hinta - +(lista[i].hinta / checkedBoxes) * valittuAle[aleprosenttilista].value);
                                                        }
                                                    }
                                                    if (laatu.checked && laatu.parentNode.textContent.trim() === 'Tavara') {
                                                        if (array.person === 'Yhteinen') {
                                                            yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                            peopleAndPrices.forEach(person => {
                                                                if (person.person !== 'Yhteinen') {
                                                                    person.totalProducts = person.totalProducts + +yhteinenOsuusYhdelle;
                                                                }
                                                            });
                                                        } else {
                                                            array.totalProducts =
                                                                +array.totalProducts + +parseFloat(+lista[i].hinta - +(lista[i].hinta / checkedBoxes) * valittuAle[aleprosenttilista].value);
                                                        }
                                                    }
                                                    if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vaatteet') {
                                                        if (array.person === 'Yhteinen') {
                                                            yhteinenOsuusYhdelle = +lista[i].hinta / radioButtonPersons;

                                                            peopleAndPrices.forEach(person => {
                                                                if (person.person !== 'Yhteinen') {
                                                                    person.totalClothes = person.totalClothes + +yhteinenOsuusYhdelle;
                                                                }
                                                            });
                                                        } else {
                                                            array.totalClothes =
                                                                +array.totalClothes + +parseFloat(+lista[i].hinta - +(lista[i].hinta / checkedBoxes) * valittuAle[aleprosenttilista].value);
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
                                                            array.totalSports =
                                                                +array.totalSports + +parseFloat(+lista[i].hinta - +(lista[i].hinta / checkedBoxes) * valittuAle[aleprosenttilista].value);
                                                        }
                                                    }
                                                });

                                                array.totalPrice = +array.totalPrice + +parseFloat(+lista[i].hinta - +(lista[i].hinta / checkedBoxes) * valittuAle[aleprosenttilista].value);
                                            }
                                        }
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
                                            if (laatu.checked && laatu.parentNode.textContent.trim() === 'Tavara') {
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
                                            if (laatu.checked && laatu.parentNode.textContent.trim() === 'Vaatteet') {
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
                                        });

                                        array.totalPrice = +array.totalPrice + +(lista[i].hinta / checkedBoxes);
                                    }
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
                    ' arkiset: ' +
                    person.totalFood.toFixed(2) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' herkut: ' +
                    person.totalSweets.toFixed(2) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' tavarat: ' +
                    person.totalProducts.toFixed(2) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' vaatteet: ' +
                    person.totalClothes.toFixed(2) +
                    '</p>' +
                    '<p>' +
                    person.person +
                    ' urheilu: ' +
                    person.totalSports.toFixed(2) +
                    '</p>' +
                    '<strong><p>' +
                    person.person +
                    ' yhteensä: ' +
                    person.totalPrice.toFixed(2) +
                    '</strong></p></div>';
            }
        });

        $('#tulos').append(results);
        $('#tulos').append('<strong><p id=Yhteensa>' + 'Yhteensä: ' + Yhteensa.toFixed(2) + '</p></strong>');
    }
};
