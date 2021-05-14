window.onload = function () {
    // Lista oikeista tuotteista
    var lista = [];

    var henkilokunta = false;

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

            pdfjsLib.getDocument(typedarray).then(function (pdf) {
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

                            $('#' + taulukko).append('<td>' + personsCheckboxesButtonsString + '</td></tr>');
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

                            $('#' + taulukko).append('<td>' + personsCheckboxesButtonsString + '</td></tr>');

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
                                    '>15%</p></td></tr>'
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

                        if (!item.str.includes('----------')) {
                            finalString += item.str + '\n';
                        } else {
                            break;
                        }
                    }

                    // Solve promise with the text retrieven from the page
                    resolve(finalString);
                });
            });
        });
    }

    function tyhjenna_checkbox() {
        $('input[type=checkbox]').prop('checked', false);
    }

    function laske_kuitti() {
        var yhteinenOsuusYhdelle = 0;
        var Yhteensa = 0;

        let peopleAndPrices = new Array();

        $('#tulos').empty();

        for (let i = 0; i < lista.length; i++) {
            if (lista[i].tuote == document.getElementById('tuote' + i).textContent) {
                var valittu = document.getElementsByName('checkbox' + i);
                var valittuAle = document.getElementsByName('ale' + i);

                let checkedBoxes = 0;

                for (let radiolista = 0; radiolista < valittu.length; radiolista++) {
                    if (peopleAndPrices.length < valittu.length) {
                        peopleAndPrices.push({
                            person: valittu[radiolista].nextSibling.nextSibling.innerText.trim(),
                            price: 0
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
                                    array.price = +array.price - +parseFloat(lista[i].hinta) / checkedBoxes;
                                } else {
                                    if (henkilokunta == true) {
                                        for (let aleprosenttilista = 0; aleprosenttilista < valittuAle.length; aleprosenttilista++) {
                                            if (valittuAle[aleprosenttilista].checked) {
                                                array.price = +array.price + +parseFloat(+lista[i].hinta - +(lista[i].hinta / checkedBoxes) * valittuAle[aleprosenttilista].value);
                                            }
                                        }
                                    } else {
                                        array.price = +array.price + +(lista[i].hinta / checkedBoxes);
                                    }
                                }
                            }
                        });
                    }
                }
            }
        }

        let radioButtonPersons = $('input[name=personsRadioButton]:checked').val();

        peopleAndPrices.forEach(person => {
            if (person.person === 'Yhteinen') {
                yhteinenOsuusYhdelle = person.price / radioButtonPersons;
            }
        });

        let results = '';

        peopleAndPrices.forEach(person => {
            if (person.person !== 'Yhteinen') {
                person.price = person.price + +yhteinenOsuusYhdelle;
                Yhteensa = Yhteensa + +person.price;
                results = results + '<p>' + person.person + ' osuus: ' + person.price.toFixed(2) + '</p>';
            }
        });

        $('#tulos').append(results);
        $('#tulos').append('<p id=Yhteensa>' + 'Yhteensä: ' + Yhteensa.toFixed(2) + '</p>');
    }
};
