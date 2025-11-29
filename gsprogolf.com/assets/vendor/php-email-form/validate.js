/**
* PHP Email Form Validation - v3.1
* URL: https://bootstrapmade.com/php-email-form/
* Author: BootstrapMade.com
*/
(function () {
    "use strict";

    let forms = document.querySelectorAll('.php-email-form');

    forms.forEach(function (e) {
        console.log('form');
        e.addEventListener('submit', function (event) {
            event.preventDefault();

            let thisForm = this;

            let action = thisForm.getAttribute('action');
            let recaptcha = thisForm.getAttribute('data-recaptcha-site-key');

            if (!action) {
                displayError(thisForm, 'The form action property is not set!')
                return;
            }
            thisForm.querySelector('.loading').classList.add('d-block');
            thisForm.querySelector('.error-message').classList.remove('d-block');
            thisForm.querySelector('.sent-message').classList.remove('d-block');

            let formData = new FormData(thisForm);

            if (recaptcha) {
                if (typeof grecaptcha !== "undefined") {
                    grecaptcha.ready(function () {
                        try {
                            grecaptcha.execute(recaptcha, { action: 'php_email_form_submit' })
                                .then(token => {
                                    formData.set('recaptcha-response', token);
                                    console.log('form init cap');
                                    php_email_form_submit(thisForm, action, formData);
                                })
                        } catch (error) {
                            displayError(thisForm, error)
                        }
                    });
                } else {
                    displayError(thisForm, 'The reCaptcha javascript API url is not loaded!')
                }
            } else {
                console.log(thisForm.name);

                if (thisForm.name == 'reset') {
                    php_email_form_submit(thisForm, action, formData);
                }
                else if (thisForm.name == 'convert') {
                    convertSubmit(thisForm, action, formData);
                }
                else if (thisForm.name == 'betaserver') {
                    requestbetaserver(thisForm, action, formData);
                }
                else if (thisForm.name == 'getlicensekey') {
                    getlicensekey(thisForm, action, formData);
                }

            }
        });
    });

    function php_email_form_submit(thisForm, action, formData) {
        console.log('formData');
        console.log(formData.get('key'));

        //append the needed key and email
        action = action + '?key=' + formData.get('key') + '&email=' + formData.get('email');
        //action = action;
        console.log(action);

        fetch(action, {
            method: 'GET',
            //body: formData,
            headers: { 'X-Api-Key': '011772CE1FD64EA7A2F6CAB827B64F4C' }

        })
            .then(response => {
                console.log(response);
                if (response.ok) {
                    console.log('success from server');
                    return response.text()
                } else {
                    throw new Error(`${response.status} ${response.statusText} ${response.url}`);
                }
            })
            .then(data => {
                thisForm.querySelector('.loading').classList.remove('d-block');
                if (data.trim() == 'OK') {
                    thisForm.querySelector('.sent-message').classList.add('d-block');
                    //thisForm.reset();
                } else {
                    throw new Error(data ? data : 'Form submission failed and no error message returned from: ' + action);
                }
            })
            .catch((error) => {
                displayError(thisForm, error);
            });
    }

    function requestbetaserver(thisForm, action, formData) {
        console.log('formData');

        //append the needed key and email
        action = action + '?email=' + formData.get('email');
        //action = action;
        console.log(action);

        fetch(action, {
            method: 'GET',
            //body: formData,
            headers: { 'X-Api-Key': '011772CE1FD64EA7A2F6CAB827B64F4C' }

        })
            .then(response => {
                console.log(response);
                if (response.ok) {
                    console.log('success from server');
                    return response.text()
                } else {
                    throw new Error(`${response.status} ${response.statusText} ${response.url}`);
                }
            })
            .then(data => {
                thisForm.querySelector('.loading').classList.remove('d-block');
                if (data.trim() == 'OK') {
                    thisForm.querySelector('.sent-message').classList.add('d-block');
                    //thisForm.reset();
                } else {
                    throw new Error(data ? data : 'Form submission failed and no error message returned from: ' + action);
                }
            })
            .catch((error) => {
                displayError(thisForm, error);
            });
    }

    function getlicensekey(thisForm, action, formData) {
        console.log('getlicensekey func');

        //append the needed key and email
        action = action + '?email=' + formData.get('email');
        //action = action;
        console.log(action);

        fetch(action, {
            method: 'GET',
            //body: formData,
            headers: { 'X-Api-Key': '011772CE1FD64EA7A2F6CAB827B64F4C' }

        })
            .then(response => {
                console.log('response');
                thisForm.querySelector('.loading').classList.remove('d-block');
                if (response.ok) {
                    console.log('success from server');
                    thisForm.querySelector('.sent-message').classList.add('d-block');
                    return 
                } else {
                    throw new Error(`${response.status} ${response.statusText} ${response.url}`);
                }
            })
            //.then(data => {
            //    console.log(data);
            //    
            //    if (data.trim() == 'OK') {
            //        thisForm.querySelector('.sent-message').classList.add('d-block');
            //        //thisForm.reset();
            //    } else {
            //        throw new Error(data ? 'Error' : 'Form submission failed and no error message returned from: ' + action);
            //    }
            //})
            .catch((error) => {
                displayError(thisForm, error + ' Please contact support@gsprogolf.com');
            });
    }

    function convertSubmit(thisForm, action, formData) {
        //append the needed key and email
        action = action + '?lk=' + formData.get('key') + '&pgt=' + formData.get('pgt');
        //action = action;
        console.log(action);

        fetch(action, {
            method: 'GET',
            //body: formData,
            //headers: {'X-Api-Key': '011772CE1FD64EA7A2F6CAB827B64F4C' }

        })
            .then(response => {
                console.log(response);
                if (response.ok) {
                    console.log('success from server');
                    return response.text()
                } else {
                    throw new Error(`${response.status} ${response.statusText} ${response.url}`);
                }
            })
            .then(data => {
                thisForm.querySelector('.loading').classList.remove('d-block');
                if (data.trim() == 'OK') {
                    thisForm.querySelector('.sent-message').classList.add('d-block');
                    //thisForm.reset();
                } else {
                    throw new Error(data ? data : 'Form submission failed and no error message returned from: ' + action);
                }
            })
            .catch((error) => {
                displayError(thisForm, error + ' Please contact support@gsprogolf.com');
            });
    }

    function displayError(thisForm, error) {
        thisForm.querySelector('.loading').classList.remove('d-block');
        thisForm.querySelector('.error-message').innerHTML = error;
        thisForm.querySelector('.error-message').classList.add('d-block');
    }

})();
