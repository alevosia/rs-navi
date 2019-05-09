const placesRouter = require('express').Router();
const fs = require('fs');
const path = require('path');
const sanitize = require('../../bin/sanitizer');
const validators = require('../../bin/validators');

// models
const Place = require('../models/place');
const Review = require('../models/review');
const Report = require('../models/report');

// directories
const uploadsDirectory = path.join(__dirname, '../../uploads/');

// =======================================================================================
// MIDDLEWARES ===========================================================================
const upload = require('../../config/upload');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.flash('message', 'You have to be logged in.');
        req.session.save(err => err ? next(err) : res.redirect('/auth'));
    }
}

function isStudent(req, res, next) {
    if (req.isAuthenticated() && req.user.account.role === 0) {
        next();
    } else {
        req.flash('message', 'You have to be logged in as student.');
        req.session.save(err => err ? next(err) : res.redirect('/auth'));
    }
}

function isPlaceowner(req, res, next) {
    if (req.isAuthenticated() && req.user.account.role === 1) {
        next();
    } else {
        req.flash('message', 'You have to be logged in as placeowner.');
        req.session.save(err => err ? next(err) : res.redirect('/auth?placeowner=1'));
    }
}



// =======================================================================================
// GET ROUTES ============================================================================

// GET rsnavigation.com/places
placesRouter.get('/', (req, res, next) => {

    return next(); // removed

    Place.find({ 'status': 1 })
    .populate('owner images reviews')
    .exec((err, places) => {
        if (err) { return next(err); }
        res.render('places', { 'user': req.user, 'places': places, 'message': req.flash('message') }, 
        (err, html) => err ? next(err) : res.send(html));
    });
});

// GET rsnavigation.com/places/add
placesRouter.get('/add', isPlaceowner, (req, res, next) => {
    res.render('add-place', { user: req.user, message: req.flash('message') }, 
    (err, html) => err ? next(err) : res.send(html));
});

// GET rsnavigation.com/places/:id
placesRouter.get('/:id', (req, res, next) => {

    const id = sanitize(req.params.id);

    Place.findOne({ '_id': id, 'status': 1 }).populate('images')
    .populate({
        path: 'reviews',
        populate: { 
            path: 'author',
            select: 'firstName lastName',
            populate: {
                path: 'image'
            }
        }
    })
    .populate({
        path: 'owner',
        populate: { path: 'image' }
    })
    .exec((err, place) => {
        if (err || !place) { return next(err); }

        const data = { 
            place: place, 
            user: req.user,
            message: req.flash('message')
        }
        
        res.render('place-details', data,
        (err, html) => err ? next(err) : res.send(html));
    });
});

// GET rsnavigation.com/places/:id/images/:filename
placesRouter.get('/:id/images/:filename', (req, res, next) => {

    // TODO: Sanitize params
    Place.findById(req.params.id, 'images')
    .populate({
        path: 'images',
        select: '_id filename',
        match: { 'filename': req.params.filename, 'status': 1 }
    })
    .exec((err, place) => {
        if (err || !place || place.images.length == 0) { return next(err); }

        const image = place.images[0];

        // if the file exists in the server's file system
        if (fs.existsSync(uploadsDirectory + image.filename)) {
            return res.sendFile(image.filename, { root: uploadsDirectory });

        // if the file is not found in the server's file system
        } else {
            image.delete(); 
            place.removeImage(image._id, (err) => err ? next(err) : next());
        }
    });
});



// =======================================================================================
// POST ROUTES ===========================================================================

// POST rsnavigation.com/places/add
placesRouter.post('/add', isPlaceowner, upload.array('images', 10),
(err, req, res, next) => {
    if (err) {
        req.flash('message', err.message);
        return req.session.save(err => err ? next(err) : res.redirect('/places/add'));
    }

    next();
},
(req, res, next) => {

    // TODO: Min and max characters, check for invalid characters
    const ownerId     = sanitize(req.user._id);
    const name        = sanitize(req.body.name);
    const placeType   = sanitize(req.body.placeType);

    let coordinates   = sanitize(req.body.coordinates);

    // address
    const number      = sanitize(req.body.number);
    const street      = sanitize(req.body.street);
    const subdivision = sanitize(req.body.subdivision);
    const barangay    = sanitize(req.body.barangay);
    const city        = sanitize(req.body.city);
    const zipCode     = sanitize(req.body.zipCode);
    const province    = sanitize(req.body.province);

    let price         = sanitize(req.body.price);
    const listType    = sanitize(req.body.listType);
    let floors        = sanitize(req.body.floors);
    let bedrooms      = sanitize(req.body.bedrooms);
    let bathrooms     = sanitize(req.body.bathrooms);
    let description   = sanitize(req.body.description);

    if (!ownerId || !name || !placeType || !number || !street || !city 
        || !province || !price || !listType || !description || !coordinates)
    {
        req.flash('message', 'Missing required input field(s).');
        return req.session.save(err => err ? next(err) : res.redirect('/places/add'));
    }

    // TODO: Make specific errors for each field & client-side validation
    if (zipCode.match(/[^\d]/) || price.match(/[^\d]/) || floors.match(/[^\d]/) 
        || bedrooms.match(/[^\d]/) || bathrooms.match(/[^\d]/))
    {
        req.flash('message', 'Number field(s) contain invalid characters.');
        return req.session.save(err => err ? next(err) : res.redirect('/places/add'));
    }

    coordinates = coordinates.split(',');
    price = price.replace(/[^\d\.]/g, ''); // delete all non-digit characters
    description = description.replace(/\n/g, '<br>') // replace all new lines with <br>

    if (floors) floors = floors.replace(/[^\d]/g, '');
    if (bedrooms) bedrooms = bedrooms.replace(/[^\d]/g, '');
    if (bathrooms) bathrooms = bathrooms.replace(/[^\d]/g, '');
    
    const newPlace = new Place({
        owner: ownerId,

        name: name,
        placeType: placeType,

        address: {
            number: number,
            street: street,
            subdivision: subdivision,
            barangay: barangay,
            city: city,
            zipCode: zipCode,
            province: province
        },

        price: price,
        listType: listType,
        
        floors: floors,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        
        description: description,
        coordinates: {
            lat: coordinates[0],
            lng: coordinates[1]
        },
        images: []
    });

    newPlace.addImages(req.files, err => {
        if (err) { return next(err); }
        req.flash('message', `<a href="/places/${newPlace._id}" target="_blank">${newPlace.name}</a> has been added.`);
        req.session.save(err => err? next(err) : res.redirect('/places/add'));
    });
});

// POST rsnavigation.com/places/:id/review
placesRouter.post('/:id/review', isStudent, (req, res, next) => {

    const id = req.params.id;
    const comment = req.body.comment.replace(/\n/g, '<br>'); // replace all new lines with <br>
    const rating = req.body.rating;

    if (!comment) {
        req.flash('message', 'Please provide a comment.');
        return req.session.save(err => err ? next(err) : res.redirect(`/places//${id}`));
    }

    if (!rating) {
        req.flash('message', 'Please provide a rating.');
        return req.session.save(err => err ? next(err) : res.redirect(`/places/${id}`));
    }

    // TODO: Clientside validation of comment length
    if (comment.length > 1000) {
        req.flash('message', 'Comment must not be more than 1000 characters.');
        return req.session.save(err => err ? next(err) : res.redirect(`/places/${id}`));
    }

    if (rating !== '1' && rating !== '2' && rating !== '3' && rating !== '4' && rating !== '5') {
        req.flash('message', 'Invalid stars.');
        return req.session.save(err => err ? next(err) : res.redirect(`/places/${id}`));
    }

    // check if the user has already submitted a review to the place
    Review.findOne({ 'place': id, 'author': req.user._id, 'status': 1 }, (err, review) => {
        if (err) { return next(); }

        // if a review is found
        if (review) {
            req.flash('message', 'You have already submitted a review for this place.');
            return req.session.save(err => err ? next(err) : res.redirect(`/places/${id}`));
        }

        const newReview = new Review({
            place: id,
            author: req.user._id,
            rating: rating,
            comment: comment
        });
    
        newReview.save(err => {
            if (err) { return next(err); }
            
            req.flash('message', 'Review submitted.');
            req.session.save(err => err ? next(err) : res.redirect(`/places/${id}`));
        });
    });
});

// POST rsnavigation.com/places/:id/report
placesRouter.post('/:id/report', isAuthenticated, (req, res, next) => {

    const placeId    = sanitize(req.params.id);
    const type  = sanitize(req.body.type);
    let comment = sanitize(req.body.comment);

    const formError = validators.reportPlace(type, comment);
    if (formError) {
        req.flash('message', formError);
        return req.session.save(err => err ? next(err) : res.redirect(`/places/${placeId}`));
    }

    comment = comment.trim();
    
    Report.findOne({ 'author': req.user._id, 'target': placeId }, '_id', (err, report) => {
        if (err) { return next(err); }

        if (report) {
            req.flash('message', 'You have already submitted a report.');
            return req.session.save(err => err ? next(err) : res.redirect(`/places/${placeId}`));
        }

        const newReport = new Report({
            author: req.user._id,
            target: placeId,
            type: type,
            comment: comment
        });

        newReport.save(err => {
            if (err) { return next(err); }
            console.log(newReport);
            req.flash('message', 'Report submitted.');
            req.session.save(err => err ? next(err) : res.redirect(`/places/${placeId}`));
        });
    });
});

// =======================================================================================
// DELETE ROUTES =========================================================================


function resolveReport(report) {
    return new Promise((resolve, reject) => {
        report.status = 1;
        report.save(err => err ? reject(err) : resolve(true));
    })
}
// DELETE rsnavigation.com/places/:id
placesRouter.delete('/:id', isAuthenticated, (req, res, next) => {
    const placeId = sanitize(req.params.id);

    Place.findOne({'_id': placeId, 'status': 1 })
    .populate('reports')
    .exec((err, place) => {
        if (err || !place) { return next(err); }
        console.log(place);

        if (req.user._id === place._id || req.user.account.role === 7) {
            place.status = 0;

            const promises = [];

            for (report of place.reports) {
                promises.push(resolveReport(report));
            }

            Promise.all(promises)
            .then((results) => {
                console.log(results);
                place.save(err => {
                    if (err) { return next(err); }
                    req.flash('message', `Deleted ${place.name}.`);
                    req.session.save(err => err ? next(err) : res.redirect('/'));
                });
            }).catch(next)
            
        } else {
            const err = new Error('Forbidden');
            err.status = 403;
            next(err);
        }
    });
})
// DELETE rsnavigation.com/places/:id/images/:filename
placesRouter.delete('/:id/images/:filename', isPlaceowner, (req, res, next) => {
    
    Place.findOne({ '_id': req.params.id, 'owner': req.user._id }, 'images')
    .populate({
        path: 'images',
        select: '_id filename',
        match: { filename: req.params.filename, status: 1 }
    })
    .exec((err, place) => {
        if (err || !place || place.images.length === 0) { return next(err); }

        const image = place.images[0];

        image.delete(); // set the image's status to deleted

        place.removeImage(image._id, (err) => {
            if (err) { return next(err); }
            res.redirect(`/places/${req.params.placeId}/images`);
        });
    });
});

// TODO: DELETE review route
// DELETE rsnavigation.com/places/:placeId/reviews/:reviewId
placesRouter.delete('/:placeId/reviews/:reviewId', isStudent, (req, res, next) => {
    Review.findOneAndUpdate({ '_id': req.params.reviewId, 'author': req.user._id }, 
    { 'status': 0 }, (err, review) => {
        if (err || !review) { return next(err); }
        req.flash('message', 'Review deleted.');
        req.session.save(err => err ? next(err) : res.redirect(`/places/${req.params.placeId}`));
    });
});

module.exports = placesRouter;
