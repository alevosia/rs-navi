$(document).ready(function() {
    $('form').attr('autocomplete', 'off');  // disable default autocomplete
    $("main").animate({ opacity: 1 }, 1000) // fade-in

    $(document).scroll(() => {
        const $nav = $("#mainNavbar");
        $nav.toggleClass("scrolled", $(this).scrollTop() > $nav.height());
    })
})

// ==============================================================================
// Realtime Form Validations ====================================================
$("form").on('submit', function(event) {

    // prevent form submit if a field contains an invalid value
    if ($(this).find(".is-invalid").length > 0) {
        event.preventDefault();
        event.stopPropagation();
        
        let fields = [];
        $(this).find(".is-invalid").each(function(i, elem) {
            fields.push(elem.getAttribute('placeholder') || elem.getAttribute('name'));
        });
        alert($(this).find(".is-invalid").length + ' Invalid Field(s):\n' + fields.join(', '));
    } else {
        $("#signup-button").html('Sending email <i class="fas fa-spinner fa-spin"></i>');
    }
});

$("#signupPassword, #confirmSignupPassword").keyup(function() {

    const password = $("#signupPassword");
    const confirm = $("#confirmSignupPassword");

    if (password.val().length <= 7) {
        password.removeClass('is-valid').addClass('is-invalid');
        password.next().addClass('invalid-feedback').text('Must be at least 8 characters');

        confirm.removeClass('is-valid is-invalid')
        confirm.next().removeClass('invalid-feedback').text('');

    } else {
        password.removeClass('is-invalid');
        password.next().removeClass('invalid-feedback').text('');

        if (confirm.val() !== password.val()) {
            password.removeClass('is-valid').addClass('is-invalid');
            confirm.removeClass('is-valid').addClass('is-invalid')
            confirm.next().addClass('invalid-feedback').text('Passwords do not match');
        } else {
            password.removeClass('is-invalid').addClass('is-valid')
            confirm.removeClass('is-invalid').addClass('is-valid')
            confirm.next().removeClass('invalid-feedback').text('');
        }
    }
})

$("input[type='text']:not(#signupRoleInput)").keyup(function() {
            
    const input = $(this);
    const name = input.val();
    const res = input.next();
    
    if (name.startsWith(' ')) {
        res.text('Must not start with space')
    } else if (name.match(/[^a-zA-Zñ\s]|\s{2,}/)) {
        res.text('Contains invalid character')
    } else if (name.length == 0) {
        res.text('Cannot be empty');
    } else if (name.length > 50) {
        res.text('Too long');
    }  else {
        $(this).removeClass('is-invalid').addClass('is-valid');
        $(this).next().removeClass('invalid-feedback').text('');
        return; // return as a valid name
    }
    
    // will only execute if at least one of the invalid conditions above are met
    $(this).removeClass('is-valid').addClass('is-invalid');
    $(this).next().addClass('invalid-feedback')
})

$("#contactNumber").keyup(function() {
            
    const number = $(this).val();
    const res = $(this).next();

    if (number.match(/[^\d+\(\)-\s]|\s{2,}/)) {
        res.text('Mobile number must only contain digits, hyphen and parentheses');
    } else if (number.length < 7) {
        res.text('Too short');
    } else {
        $(this).removeClass('is-invalid').addClass('is-valid');
        res.removeClass('invalid-feedback').text('');
        return; // return as a valid name
    }
    
    // will only execute if at least one of the invalid conditions above are met
    $(this).removeClass('is-valid').addClass('is-invalid');
    res.addClass('invalid-feedback')
})


const validateEmailFunction = function(email, role, input, res) {
    
    $.ajax({
        url: '/validate/email',
        data: { 
            email: email,
            role: role
        },
        success: function(result) {

            if (result === '1') {
                input.removeClass('is-invalid').addClass('is-valid');
                res.removeClass('invalid-feedback').text('');
            } else if (result === '0') {
                input.removeClass('is-valid').addClass('is-invalid');
                res.addClass('invalid-feedback').text('Email address is already taken');
            } else if (result === '2') {
                input.removeClass('is-valid').addClass('is-invalid');
                res.addClass('invalid-feedback').text('Invalid email address');
                $("#signupRoleTitle").text('What are you doing?');
            }
        }
    });
}

// client-side rate-limiting
const throttledValidateEmailFunction = _.throttle(validateEmailFunction, 1000);

$("#signupEmail").change(function() {

    const input = $(this);
    const email = input.val();
    const res = input.next();
    const role = $("#signupRoleInput").val();
    
    let valid = false;

    if (email.startsWith(' ')) {
        res.text('Must not start with space')
    } else if (email.match(/[^a-zA-Z0-9.@_]/)) {
        res.text('Contains invalid character')
    } else if (email.length === 0) {
        res.text('Cannot be empty');
    } else if (email.length > 50) {
        res.text('Too long');       // regex: if starts/ends with @ or period, 2 or more @, an @ is preceded by a period
    } else if (!email.includes('@') || email.match(/[@.]$|^[@.]|@[^@]*@|\.@/)) {
        res.text('Invalid email address')
    } else {
        valid = true;
        throttledValidateEmailFunction(email, role, input, res);
    }
    
    if (!valid) {
        // will only execute if at least one of the invalid conditions above are met
        $(this).removeClass('is-valid').addClass('is-invalid');
        $(this).next().addClass('invalid-feedback')
    }
})

// ==============================================================================
// Forms Swapping ===============================================================

function swapForms() {
    $("#login").collapse("toggle");
    $("#signup").collapse("toggle");
}

$("#switchRoleButton").click(function() {

    const switchRoleButton = $(this);
    const switchRoleNav = $("#switchRoleNav");

    const login = $("#login");
    const loginRole = $("#loginRoleInput");
    const loginRoleTitle = $("#loginRoleTitle");

    const signupRole = $("#signupRoleInput");
    const signupRoleTitle = $("#signupRoleTitle");

    const schoolNameInput = $("#schoolNameInput");

    const switchToLoginButton = $("#switchToLoginButton");
    const switchToSignupButton = $("#switchToSignupButton");
    const forgotPasswordButton = $("#forgotPasswordButton");

    // remove invalid feedback on schoolname when switching roles
    schoolNameInput.removeClass('is-invalid');
    schoolNameInput.next().text('').removeClass('invalid-feedback'); 

    // temopary disable of buttons during collapse animation
    switchRoleButton.attr('disabled', 'disabled');
    switchToLoginButton.attr('disabled', 'disabled');
    switchToSignupButton.attr('disabled', 'disabled');
    forgotPasswordButton.attr('disabled', 'disabled');

    // hide titles
    loginRoleTitle.collapse("toggle");
    signupRoleTitle.collapse("toggle");
    switchRoleNav.collapse("toggle");

    // change the text of the titles then show them again after half a second
    setTimeout(() => {

        // check for value of login role input for the title of the login/signup form
        loginRoleTitle.text(`Login as ${loginRole.val() === 'student' ? 'placeowner' : 'student'}`);
        signupRoleTitle.text(`Signup as ${loginRole.val() === 'student' ? 'placeowner' : 'student'}`)
        switchRoleButton.text(`${login.hasClass('show') ? 'Login' : 'Signup'} as ${loginRole.val()}`);

        // change the value of the login and signup role to opposite
        loginRole.val(loginRole.val() === 'student' ? 'placeowner' : 'student');
        signupRole.val(loginRole.val());

        // hide and disable school name when signing up as placeowner
        if (signupRole.val() === 'student') {
            schoolNameInput.removeAttr('disabled hidden').css('display', 'inline');
        } else {
            schoolNameInput.attr('disabled', 'disabled').css('display', 'none');
        }

        loginRoleTitle.collapse("toggle");
        signupRoleTitle.collapse("toggle");
        switchRoleNav.collapse("toggle");
        
        // remove disabled to buttons after 350ms after showing the titles again
        setTimeout(() => {
            switchRoleButton.removeAttr('disabled');
            switchToLoginButton.removeAttr('disabled');
            switchToSignupButton.removeAttr('disabled');
            forgotPasswordButton.removeAttr('disabled');
        }, 350)
    }, 500)
});

$("#switchToSignupButton, #switchToLoginButton").click(function() {

    const switchRoleButton = $("#switchRoleButton");
    const switchRoleNav = $("#switchRoleNav");

    const login = $("#login");
    const loginRole = $("#loginRoleInput");

    const switchToLoginButton = $("#switchToLoginButton");
    const switchToSignupButton = $("#switchToSignupButton");
    const forgotPasswordButton = $("#forgotPasswordButton");

    switchRoleButton.attr('disabled', 'disabled');
    switchToLoginButton.attr('disabled', 'disabled');
    switchToSignupButton.attr('disabled', 'disabled');
    forgotPasswordButton.attr('disabled', 'disabled');

    swapForms();

    switchRoleNav.collapse("toggle");

    // wait for the initial collapse animation to end before bringing it back up
    setTimeout(() => {

        switchRoleButton.text(`${login.hasClass('show') ? 'Login' : 'Signup'} as ${loginRole.val() === 'student' ? 'Placeowner' : 'Student'}`);
        switchRoleNav.collapse("toggle")

        setTimeout(() => {
            switchRoleButton.removeAttr('disabled');
            switchToLoginButton.removeAttr('disabled');
            switchToSignupButton.removeAttr('disabled');
            forgotPasswordButton.removeAttr('disabled');
        }, 350);
    }, 500)
});

$("#forgotPasswordButton").click(function() {

    const loginRole = $("#loginRoleInput");

    $("#forgotPasswordRoleButton").text(loginRole.val());
    $("#forgotPasswordRoleInput").val(loginRole.val());

    if ($("#forgotPasswordForm").hasClass("show")) {
        $(this).animate({ 'font-size': '1rem' }, 300);
    } else {
        $(this).animate({ 'font-size': '2rem' }, 300);
    }
    
    $("#forgotPasswordForm").collapse("toggle");
    $("#upperLogin").collapse("toggle");
    $("#switchRoleNav").collapse("toggle");
})

$("#forgotPasswordRoleButton").click(function() {
    const button = $(this);
    const role = $("#forgotPasswordRoleInput");

    if (button.text().toLowerCase() === 'student') {
        button.text('Placeowner');
        role.val('placeowner');
    } else {
        button.text('Student');
        role.val('student');
    }
});
